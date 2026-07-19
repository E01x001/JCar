-- 최종 리뷰 반영 (feat/supabase-phase2 머지 전 하드닝)

-- 1) 관리자 재고 화면 실시간 구독 대상 추가
alter publication supabase_realtime add table public.admin_owned_vehicles;

-- 2) profiles 가드 강화: 비관리자는 email/phone_number/created_at 직접 변경 불가
--    (이메일 변경은 supabase.auth.updateUser 경유 — 인증 우회 차단)
create or replace function app_private.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if app_private.is_admin() or (select auth.uid()) is null then
    return new;
  end if;
  if new.role           is distinct from old.role
  or new.status         is distinct from old.status
  or new.status_updated_at is distinct from old.status_updated_at
  or new.account_status is distinct from old.account_status
  or new.deleted_at     is distinct from old.deleted_at
  or new.permanent_delete_date is distinct from old.permanent_delete_date
  or new.email          is distinct from old.email
  or new.phone_number   is distinct from old.phone_number
  or new.created_at     is distinct from old.created_at then
    raise exception '권한이 없는 프로필 필드 변경입니다';
  end if;
  return new;
end;
$$;

-- 3) vehicles 가드 강화: 소유자 수정 가능 컬럼 화이트리스트 복원
--    (등록원부 유래 제원·차량번호 변조 차단; 허용: 이름/서브모델/이미지/차종/영업권리)
create or replace function app_private.guard_vehicle_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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

-- 4) 거래완료 RPC 멱등화: 이미 완료된 상담이면 에러 대신 no-op
--    (더블탭 재시도 시 성공했는데 에러 토스트가 뜨는 문제 방지)
create or replace function public.complete_sell_consultation(
  p_consultation_id uuid,
  p_deal_amount numeric,
  p_admin_notes text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_consultation public.consultation_requests%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_admin uuid := (select auth.uid());
begin
  if not app_private.is_admin() then
    raise exception '관리자만 실행할 수 있습니다';
  end if;

  select * into v_consultation
    from public.consultation_requests where id = p_consultation_id for update;
  if not found then
    raise exception '상담 정보를 찾을 수 없습니다';
  end if;
  if v_consultation.consultation_status in ('completed', 'archived') then
    return; -- 멱등: 이미 완료됨
  end if;

  select * into v_vehicle
    from public.vehicles where id = v_consultation.vehicle_id for update;
  if not found then
    raise exception '차량 정보를 찾을 수 없습니다';
  end if;

  update public.consultation_requests
    set consultation_status = 'completed',
        completed_at = now(),
        deal_amount = p_deal_amount,
        completed_by = v_admin,
        admin_notes = coalesce(p_admin_notes, admin_notes)
    where id = p_consultation_id;

  insert into public.admin_owned_vehicles
    (vehicle_id, consultation_id, vehicle_name, purchase_price,
     previous_owner_id, previous_owner_name, status)
  values
    (v_vehicle.id, p_consultation_id,
     coalesce(v_consultation.vehicle_name, v_vehicle.vehicle_name),
     p_deal_amount, v_consultation.user_id, v_consultation.user_name, 'owned')
  on conflict (consultation_id) do nothing;

  update public.vehicles
    set deal_stage = 'in_stock',
        is_admin_owned = true,
        current_owner_id = v_admin,
        updated_at = now()
    where id = v_vehicle.id;

  insert into public.vehicle_pricing (vehicle_id, purchase_price, updated_at)
  values (v_vehicle.id, p_deal_amount, now())
  on conflict (vehicle_id) do update
    set purchase_price = excluded.purchase_price, updated_at = now();
end;
$$;
