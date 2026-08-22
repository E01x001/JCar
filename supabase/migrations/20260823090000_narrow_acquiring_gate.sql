-- mark_vehicle_acquiring 인가 범위 축소 (커밋 보안 리뷰 지적: 게이트가 넓다)
--
-- 20260822170000에서 권한 판단을 함수 안으로 가져온 것 자체는 맞았지만,
-- 두 군데가 필요보다 넓었다.
--
-- (1) 우회 플래그가 가드 **전체**를 껐다.
--     'on'이면 status·hidden·seller_id·is_admin_owned까지 전부 무검사로 통과한다.
--     지금 이 함수는 deal_stage만 건드리므로 실제 노출은 없지만, 필요한 것보다
--     넓은 권한을 여는 습관은 다음 사람이 이 플래그를 재사용할 때 사고가 된다.
--     → 플래그 값을 'deal_stage'로 두고 **그 컬럼 하나만** 면제한다.
--       나머지 보호 컬럼은 우회 중에도 그대로 막힌다.
--
-- (2) 상담 존재 검사가 종료된 상담까지 인정했다.
--     not in ('cancelled','rejected')는 completed·archived를 포함한다.
--     거래가 끝난 뒤 차량이 다시 listed로 돌아오면, 예전 상담 하나를 근거로
--     아무 때나 다시 acquiring으로 뒤집을 수 있다. 근거로 삼아야 하는 것은
--     "지금 진행 중인 구매 상담"이다.
--     → 활성 상태(pending·approved·confirmed·on-hold)로 좁힌다.

-- ============================================================
-- 1) 가드: deal_stage 하나만 면제
-- ============================================================
create or replace function app_private.guard_vehicle_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- 자격 검사를 마친 RPC가 세우는 트랜잭션 한정 플래그.
  -- 값이 컬럼명이며, 그 컬럼에 한해서만 검사를 건너뛴다.
  v_exempt text := coalesce(current_setting('app.bypass_vehicle_guard', true), '');
begin
  if app_private.is_admin() or (select auth.uid()) is null then
    return new;
  end if;

  if new.vehicle_no    is distinct from old.vehicle_no
  or new.manufacturer  is distinct from old.manufacturer
  or new.year          is distinct from old.year
  or new.drive_type    is distinct from old.drive_type
  or new.fuel_type     is distinct from old.fuel_type
  or new.cc            is distinct from old.cc
  or new.transmission  is distinct from old.transmission
  or new.fuel_eco      is distinct from old.fuel_eco
  or new.fuel_tank     is distinct from old.fuel_tank
  or new.seats         is distinct from old.seats
  or new.battery       is distinct from old.battery
  or new.front_tire    is distinct from old.front_tire
  or new.rear_tire     is distinct from old.rear_tire
  or new.engine_oil_liter is distinct from old.engine_oil_liter
  or new.wiper_info    is distinct from old.wiper_info
  or new.created_at    is distinct from old.created_at
  or new.status        is distinct from old.status
  or (v_exempt is distinct from 'deal_stage'
      and new.deal_stage is distinct from old.deal_stage)
  or new.hidden        is distinct from old.hidden
  or new.is_admin_owned is distinct from old.is_admin_owned
  or new.seller_id     is distinct from old.seller_id
  or new.current_owner_id is distinct from old.current_owner_id then
    raise exception '권한이 없는 차량 필드 변경입니다';
  end if;
  return new;
end;
$$;

-- ============================================================
-- 2) 함수: 활성 상담만 근거로 인정 + 좁은 플래그 사용
-- ============================================================
create or replace function public.mark_vehicle_acquiring(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다';
  end if;

  if not app_private.is_active_user() then
    raise exception '이용할 수 없는 계정입니다';
  end if;

  -- 관리자가 아니라면 **진행 중인** 본인 구매 상담이 있는 차량만 전환할 수 있다.
  -- 완료·보관된 상담은 근거가 되지 않는다 — 이미 끝난 거래다.
  if not app_private.is_admin() then
    if not exists (
      select 1 from public.consultation_requests
       where vehicle_id = p_vehicle_id
         and user_id = v_uid
         and type = 'buy'
         and consultation_status in ('pending', 'approved', 'confirmed', 'on-hold')
    ) then
      raise exception '해당 차량에 진행 중인 상담이 없습니다';
    end if;
  end if;

  perform set_config('app.bypass_vehicle_guard', 'deal_stage', true);

  update public.vehicles
     set deal_stage = 'acquiring', updated_at = now()
   where id = p_vehicle_id
     and deal_stage = 'listed'
     and status = 'approved';

  perform set_config('app.bypass_vehicle_guard', '', true);
end;
$$;

revoke all on function public.mark_vehicle_acquiring(uuid) from public, anon;
grant execute on function public.mark_vehicle_acquiring(uuid) to authenticated;
