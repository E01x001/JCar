-- 상담 종료와 거래 체결, 그리고 명의이전을 분리한다
--
-- 지금 구조의 문제: "거래완료" 버튼 하나가 상담 종료·체결·매입·소유권을 동시에
-- 처리한다. 그래서 **상담은 끝났는데 체결이 안 된 경우**를 표현할 수 없다.
-- 판매 상담도 구매 상담도 실제로는 무산될 수 있는데, 모델에 그 자리가 없어서
-- CompleteDealModal의 addToOwnedVehicles 체크박스가 그 자리를 어정쩡하게 메우고
-- 있었다(체크를 끄면 매입가·매입기록·소유권이 통째로 건너뛰어진다).
--
-- 나누는 축:
--   상담 결과 — completed(체결) / archived(미체결). 둘 다 이미 제약조건에 있는
--               값이라 스키마 변경이 필요 없다. archived는 지금 쓰이지 않고 있었다.
--   명의이전 — 별도 트랙. 실제 이전은 관리자가 오프라인으로 처리하므로
--               앱은 진행 상태를 기록·표시만 한다.
--
-- **소유권은 마지막에만 움직인다.** 체결 시점이 아니라 관리자가 "이전 완료"로
-- 표시할 때 vehicles.current_owner_id가 바뀐다. 앱의 소유자 정보가 등록원부를
-- 따라가야지 앞서가면 안 된다.

-- ============================================================
-- 1) 명의이전에 진행 상태를 준다
-- ============================================================
-- 지금은 transferred_at만 있어 "끝난 사실"만 기록할 수 있다. 진행 중을
-- 표시하려면 상태가 필요하다.
alter table public.ownership_transfers
  add column if not exists status text not null default 'pending';

alter table public.ownership_transfers
  drop constraint if exists ownership_transfers_status_check;

alter table public.ownership_transfers
  add constraint ownership_transfers_status_check
  check (status in ('pending', 'in_progress', 'completed'));

-- 이전이 끝나야 채워진다. 기존 행은 완료된 것으로 본다(현재 0건이라 무해하다).
alter table public.ownership_transfers
  alter column transferred_at drop not null;

alter table public.ownership_transfers
  alter column transferred_at drop default;

update public.ownership_transfers
   set status = 'completed'
 where transferred_at is not null and status = 'pending';

comment on column public.ownership_transfers.status is
  'pending=체결됨·이전 전, in_progress=서류 진행중, completed=이전 완료(이때 실제 소유권이 움직인다)';

create index if not exists ownership_transfers_open_idx
  on public.ownership_transfers (status, vehicle_id)
  where status <> 'completed';

-- ============================================================
-- 2) 체결 — 상담을 끝내고 이전 트랙을 연다
-- ============================================================
-- 소유권·재고·매입가는 **건드리지 않는다.** 그건 이전 완료의 몫이다.
create or replace function public.settle_consultation(
  p_consultation_id uuid,
  p_deal_amount numeric,
  p_admin_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_c public.consultation_requests%rowtype;
  v_v public.vehicles%rowtype;
  v_from uuid;
  v_to uuid;
  v_type text;
  v_transfer_id uuid;
begin
  if not app_private.is_admin() then
    raise exception '관리자만 실행할 수 있습니다';
  end if;
  if p_deal_amount is null or p_deal_amount < 0 then
    raise exception '거래 금액이 올바르지 않습니다';
  end if;

  select * into v_c from public.consultation_requests
   where id = p_consultation_id for update;
  if not found then raise exception '상담 정보를 찾을 수 없습니다'; end if;

  -- 멱등: 이미 끝난 상담은 조용히 기존 이전 id를 돌려준다
  if v_c.consultation_status in ('completed', 'archived') then
    return v_c.transfer_id;
  end if;

  select * into v_v from public.vehicles where id = v_c.vehicle_id for update;
  if not found then raise exception '차량 정보를 찾을 수 없습니다'; end if;

  -- 방향: 판매 상담이면 소유자 → 관리자, 구매 상담이면 관리자(현 소유자) → 신청자
  if v_c.type = 'sell' then
    v_type := 'sell_to_admin';
    v_from := coalesce(v_v.current_owner_id, v_v.seller_id);
    v_to   := v_admin;
  else
    v_type := 'admin_to_buyer';
    v_from := coalesce(v_v.current_owner_id, v_v.seller_id);
    v_to   := v_c.user_id;
  end if;

  insert into public.ownership_transfers
    (vehicle_id, consultation_id, from_user_id, to_user_id, transfer_type, price, notes, status)
  values
    (v_v.id, v_c.id, v_from, v_to, v_type, p_deal_amount, p_admin_notes, 'pending')
  returning id into v_transfer_id;

  update public.consultation_requests
     set consultation_status = 'completed',
         completed_at = now(),
         completed_by = v_admin,
         deal_amount = p_deal_amount,
         admin_notes = coalesce(p_admin_notes, admin_notes),
         transfer_id = v_transfer_id,
         is_ownership_transferred = false
   where id = v_c.id;

  return v_transfer_id;
end;
$$;

-- ============================================================
-- 3) 미체결 — 상담만 닫는다
-- ============================================================
-- 사유는 받지 않는다. 상담 전 거절(rejected)과 달리 상담까지 하고 안 된 것이라
-- 성격이 다르고, 클릭 한 번으로 끝나는 편이 실제로 쓰인다.
create or replace function public.close_consultation_unsettled(p_consultation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.consultation_requests%rowtype;
begin
  if not app_private.is_admin() then
    raise exception '관리자만 실행할 수 있습니다';
  end if;

  select * into v_c from public.consultation_requests
   where id = p_consultation_id for update;
  if not found then raise exception '상담 정보를 찾을 수 없습니다'; end if;
  if v_c.consultation_status in ('completed', 'archived') then
    return; -- 멱등
  end if;

  update public.consultation_requests
     set consultation_status = 'archived',
         completed_at = now(),
         completed_by = (select auth.uid())
   where id = v_c.id;
end;
$$;

-- ============================================================
-- 4) 명의이전 상태 진행 — 완료 시점에만 실제 소유권이 움직인다
-- ============================================================
create or replace function public.advance_ownership_transfer(
  p_transfer_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_t public.ownership_transfers%rowtype;
  v_c public.consultation_requests%rowtype;
begin
  if not app_private.is_admin() then
    raise exception '관리자만 실행할 수 있습니다';
  end if;
  if p_status not in ('pending', 'in_progress', 'completed') then
    raise exception '알 수 없는 이전 상태입니다: %', p_status;
  end if;

  select * into v_t from public.ownership_transfers where id = p_transfer_id for update;
  if not found then raise exception '이전 정보를 찾을 수 없습니다'; end if;

  if v_t.status = 'completed' then
    return; -- 멱등. 완료는 되돌리지 않는다 — 되돌릴 일이 있으면 사람이 판단한다.
  end if;

  if p_status <> 'completed' then
    update public.ownership_transfers set status = p_status where id = v_t.id;
    return;
  end if;

  -- 여기부터가 실제 소유권 이동. 이전 완료로 표시할 때만 일어난다.
  update public.ownership_transfers
     set status = 'completed', transferred_at = now()
   where id = v_t.id;

  if v_t.transfer_type = 'sell_to_admin' then
    -- 매입: 회사 재고가 된다
    update public.vehicles
       set current_owner_id = v_t.to_user_id,
           is_admin_owned = true,
           deal_stage = 'in_stock',
           updated_at = now()
     where id = v_t.vehicle_id;

    select * into v_c from public.consultation_requests where id = v_t.consultation_id;

    insert into public.admin_owned_vehicles
      (vehicle_id, consultation_id, vehicle_name, purchase_price,
       previous_owner_id, previous_owner_name, status)
    select v_t.vehicle_id, v_t.consultation_id,
           coalesce(v_c.vehicle_name, (select vehicle_name from public.vehicles where id = v_t.vehicle_id)),
           v_t.price, v_t.from_user_id, v_c.user_name, 'owned'
    on conflict (consultation_id) do nothing;

    insert into public.vehicle_pricing (vehicle_id, purchase_price, updated_at)
    values (v_t.vehicle_id, v_t.price, now())
    on conflict (vehicle_id) do update
      set purchase_price = excluded.purchase_price, updated_at = now();

  else
    -- 판매: 구매자에게 넘어가고 매물에서 빠진다
    update public.vehicles
       set current_owner_id = v_t.to_user_id,
           is_admin_owned = false,
           deal_stage = 'sold',
           updated_at = now()
     where id = v_t.vehicle_id;

    update public.admin_owned_vehicles
       set status = 'sold', sold_price = v_t.price, sold_at = now()
     where vehicle_id = v_t.vehicle_id and status = 'owned';
  end if;

  update public.consultation_requests
     set is_ownership_transferred = true
   where id = v_t.consultation_id;
end;
$$;

revoke all on function public.settle_consultation(uuid, numeric, text) from public, anon;
revoke all on function public.close_consultation_unsettled(uuid) from public, anon;
revoke all on function public.advance_ownership_transfer(uuid, text) from public, anon;
grant execute on function public.settle_consultation(uuid, numeric, text) to authenticated;
grant execute on function public.close_consultation_unsettled(uuid) to authenticated;
grant execute on function public.advance_ownership_transfer(uuid, text) to authenticated;

-- 판매자·구매자가 자기 거래의 이전 진행 상태를 볼 수 있어야 한다.
-- 지금은 관리자만 볼 수 있어서, 신청자는 명의이전이 어디까지 갔는지 알 수 없다.
drop policy if exists "transfers_party_select" on public.ownership_transfers;
create policy "transfers_party_select" on public.ownership_transfers
  for select to authenticated
  using (
    (select auth.uid()) in (from_user_id, to_user_id)
    or app_private.is_admin()
  );
