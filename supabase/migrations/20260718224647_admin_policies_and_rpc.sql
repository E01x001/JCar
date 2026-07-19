-- Phase 2c 보완: 관리자 update 정책 + 컬럼 보호를 트리거 가드로 통일 + RPC
--
-- 초기 스키마는 "소유자 컬럼 그랜트" 방식이었으나 관리자 앱이 클라이언트에서
-- 직접 상태를 바꾸는 화면(승인/숨김/상담처리)이 많아, 다음으로 전환한다:
--   * update 권한은 넓게 grant
--   * RLS 정책으로 "누가 어떤 행을" 통제 (본인 or 관리자)
--   * BEFORE UPDATE 트리거로 "비관리자가 권한 컬럼을 못 바꾸게" 통제

-- ============================================================
-- 1. vehicles — 관리자 update 정책 + 가드 트리거
-- ============================================================
create policy "vehicles_update_admin" on public.vehicles
  for update to authenticated
  using (app_private.is_admin())
  with check (app_private.is_admin());

grant update on public.vehicles to authenticated;

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
  -- 비관리자(소유자)는 권한 필드 변경 불가
  if new.status       is distinct from old.status
  or new.deal_stage   is distinct from old.deal_stage
  or new.hidden       is distinct from old.hidden
  or new.is_admin_owned  is distinct from old.is_admin_owned
  or new.seller_id    is distinct from old.seller_id
  or new.current_owner_id is distinct from old.current_owner_id then
    raise exception '권한이 없는 차량 필드 변경입니다';
  end if;
  return new;
end;
$$;

create trigger vehicle_update_guard
  before update on public.vehicles
  for each row execute function app_private.guard_vehicle_update();

-- ============================================================
-- 2. consultation_requests — 관리자 정책 + 가드 확장
-- ============================================================
create policy "consultation_update_admin" on public.consultation_requests
  for update to authenticated
  using (app_private.is_admin())
  with check (app_private.is_admin());

create policy "consultation_delete_admin" on public.consultation_requests
  for delete to authenticated
  using (app_private.is_admin());

grant update on public.consultation_requests to authenticated;

-- 기존 상태전이 가드에 관리자 전용 컬럼 보호 추가
create or replace function app_private.guard_consultation_user_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if app_private.is_admin() or (select auth.uid()) is null then
    return new;
  end if;

  -- 비관리자는 관리자 전용 컬럼 변경 불가
  if new.admin_memo    is distinct from old.admin_memo
  or new.admin_notes   is distinct from old.admin_notes
  or new.deal_amount   is distinct from old.deal_amount
  or new.completed_by  is distinct from old.completed_by
  or new.completed_at  is distinct from old.completed_at
  or new.is_ownership_transferred is distinct from old.is_ownership_transferred
  or new.transfer_id   is distinct from old.transfer_id
  or new.user_id       is distinct from old.user_id
  or new.vehicle_id    is distinct from old.vehicle_id
  or new.type          is distinct from old.type then
    raise exception '권한이 없는 상담 필드 변경입니다';
  end if;

  -- 허용 1: 취소
  if new.consultation_status = 'cancelled'
     and old.consultation_status in ('pending', 'confirmed', 'on-hold') then
    return new;
  end if;

  -- 허용 2: 거절된 상담 재신청 (새 일정으로)
  if old.consultation_status = 'rejected'
     and new.consultation_status = 'pending' then
    return new;
  end if;

  -- 상태 미변경(일정만 수정 등)은 pending에서만 허용
  if new.consultation_status = old.consultation_status
     and old.consultation_status = 'pending' then
    return new;
  end if;

  raise exception '허용되지 않은 상담 상태 변경입니다 (% → %)',
    old.consultation_status, new.consultation_status;
end;
$$;

-- ============================================================
-- 3. profiles — 관리자 update 정책 + 가드 (사용자 관리 화면)
-- ============================================================
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (app_private.is_admin())
  with check (app_private.is_admin());

grant update on public.profiles to authenticated;

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
  -- 비관리자는 role/status/삭제필드 변경 불가 (본인 name/fcm_token 등만)
  if new.role           is distinct from old.role
  or new.status         is distinct from old.status
  or new.status_updated_at is distinct from old.status_updated_at
  or new.account_status is distinct from old.account_status
  or new.deleted_at     is distinct from old.deleted_at
  or new.permanent_delete_date is distinct from old.permanent_delete_date then
    raise exception '권한이 없는 프로필 필드 변경입니다';
  end if;
  return new;
end;
$$;

create trigger profile_update_guard
  before update on public.profiles
  for each row execute function app_private.guard_profile_update();

-- ============================================================
-- 4. RPC — 슬롯 사전확인 & 구매상담 시 차량 단계 전환
-- ============================================================

-- 슬롯 점유 여부 (RLS상 타인 상담을 못 읽으므로 RPC로 존재 여부만 노출)
create or replace function public.is_slot_taken(
  p_vehicle_id uuid, p_date date, p_time time
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.consultation_requests
    where vehicle_id = p_vehicle_id
      and preferred_date = p_date
      and preferred_time = p_time
      and consultation_status in ('pending', 'approved', 'confirmed', 'on-hold')
  );
$$;

revoke execute on function public.is_slot_taken from public, anon;
grant execute on function public.is_slot_taken to authenticated;

-- 구매 상담 접수 시 listed → acquiring 전환 (구매자는 차량 update 권한이 없어 RPC 경유)
create or replace function public.mark_vehicle_acquiring(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception '로그인이 필요합니다';
  end if;
  update public.vehicles
    set deal_stage = 'acquiring', updated_at = now()
    where id = p_vehicle_id and deal_stage = 'listed';
end;
$$;

revoke execute on function public.mark_vehicle_acquiring from public, anon;
grant execute on function public.mark_vehicle_acquiring to authenticated;
