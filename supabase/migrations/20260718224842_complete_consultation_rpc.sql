-- 판매 상담 거래완료(매입) 원자 처리 RPC
-- Firestore 시절 클라이언트 트랜잭션을 서버 함수로 이전.
--  * 관리자 검증 후 상담 completed + 매입기록 + 차량 in_stock 전환 + 매입가 기록을 한 트랜잭션으로
--  * admin_owned_vehicles.consultation_id UNIQUE → 더블탭/재시도 멱등 (배포점검 '완료 중복처리' 해결)
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
    raise exception '이미 완료된 상담입니다';
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

revoke execute on function public.complete_sell_consultation from public, anon;
grant execute on function public.complete_sell_consultation to authenticated;
