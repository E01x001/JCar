-- mark_vehicle_acquiring 권한 모델 교정 (보안 점검 지적사항)
--
-- 문제 1 (설계): SECURITY DEFINER인데 검사가 "로그인했는가" 하나뿐이었다.
--   소유자 확인도 관리자 확인도 없어, 문자 그대로는 **아무나 남의 매물을
--   매입진행중으로 바꿀 수 있는** 함수였다.
--
-- 문제 2 (기능): 실제로는 vehicle_update_guard 트리거가 deal_stage 변경을
--   막아 아무 일도 일어나지 않았다. 즉 구매 상담이 들어와도 차량은 계속
--   listed였고, 호출부는 실패를 로그로만 삼키고 있었다(조용한 실패).
--
-- 두 문제의 뿌리는 같다 — 권한 판단을 함수가 하지 않고 트리거에 떠넘겼다.
-- 우연히 막혀 있었을 뿐이라, 트리거를 언젠가 완화하면 그대로 구멍이 된다.
--
-- 교정: 함수가 스스로 자격을 검사하고, 통과한 경우에만 트랜잭션 한정
-- 우회 플래그를 세워 트리거를 통과한다. profiles의 complete_profile이
-- 이미 쓰고 있는 방식과 동일하다(set_config는 pg_catalog 함수라
-- PostgREST로 직접 호출할 수 없어 클라이언트가 위조할 수 없다).

-- ============================================================
-- 1) 차량 가드에 우회 플래그 인식 추가
-- ============================================================
create or replace function app_private.guard_vehicle_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 자격 검사를 마친 RPC 경유 (트랜잭션 한정 플래그)
  if coalesce(current_setting('app.bypass_vehicle_guard', true), '') = 'on' then
    return new;
  end if;

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
  or new.deal_stage    is distinct from old.deal_stage
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
-- 2) 함수가 스스로 자격을 검사한다
-- ============================================================
-- 통과 조건: 활성 사용자이고, **그 차량에 본인 명의의 구매 상담이 실제로 있다**.
-- 상담 없이 임의의 차량 id만 넘겨서 호출하는 경로를 이걸로 닫는다.
-- 상담 생성 자체에 레이트리밋(5/시간·20/일)이 걸려 있으므로 남용 폭도 제한된다.
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

  -- 관리자가 아니라면 본인 구매 상담이 있는 차량만 전환할 수 있다
  if not app_private.is_admin() then
    if not exists (
      select 1 from public.consultation_requests
       where vehicle_id = p_vehicle_id
         and user_id = v_uid
         and type = 'buy'
         and consultation_status not in ('cancelled', 'rejected')
    ) then
      raise exception '해당 차량에 대한 상담 내역이 없습니다';
    end if;
  end if;

  -- 여기까지 왔으면 자격이 확인됐다. 가드는 이 트랜잭션에서만 통과시킨다.
  perform set_config('app.bypass_vehicle_guard', 'on', true);

  update public.vehicles
     set deal_stage = 'acquiring', updated_at = now()
   where id = p_vehicle_id
     and deal_stage = 'listed'
     and status = 'approved';

  perform set_config('app.bypass_vehicle_guard', 'off', true);
end;
$$;

revoke all on function public.mark_vehicle_acquiring(uuid) from public, anon;
grant execute on function public.mark_vehicle_acquiring(uuid) to authenticated;

-- ============================================================
-- 3) 불필요한 노출 정리
-- ============================================================
-- consultation_quota()는 auth.uid() 기준으로만 세므로 익명에게는 의미가 없다.
-- 의미 없는 실행 권한은 지운다.
revoke execute on function public.consultation_quota() from anon;
