-- JCar 초기 스키마 (Firebase → Supabase 이전)
-- 설계 근거: docs/supabase-migration-readiness.md + docs/PRE_DEPLOY_REVIEW_2026-07-07.md
--
-- 핵심 결정:
--  * 가격은 vehicle_pricing 별도 테이블 + admin 전용 RLS (리뷰 C1 근본 해결 —
--    Firestore에선 필드 단위 통제가 불가능해 클라 필터에 의존했음)
--  * 판매자 PII는 vehicle_private_contact 테이블 (Firestore private/contact 서브컬렉션 대응)
--  * 상담 이중예약은 부분 UNIQUE 인덱스로 원자 차단 (Firestore의 슬롯 선점 문서 대체)
--  * 네이밍: DB snake_case, 앱 경계에서 camelCase 매핑

-- ============================================================
-- 0. 공통 헬퍼
-- ============================================================

-- 관리자 여부 (RLS에서 사용; profiles를 조회해야 하므로 SECURITY DEFINER 필요)
-- auth.uid() 기반이므로 호출자는 자기 자신의 역할만 판별한다.
create schema if not exists app_private;

-- ============================================================
-- 1. profiles (Firestore users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text,
  phone_number text unique,          -- 가입 시 중복검사 → UNIQUE 제약으로 대체
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  status_updated_at timestamptz,
  account_status text check (account_status in ('pending_deletion')),
  fcm_token text,
  deleted_at timestamptz,            -- 소프트삭제(30일 유예)
  permanent_delete_date timestamptz,
  created_at timestamptz not null default now()
);

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- 정지/삭제대기 계정 차단 (Firestore isActiveUser 대응)
create or replace function app_private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select status is distinct from 'suspended'
        and account_status is distinct from 'pending_deletion'
     from public.profiles
     where id = (select auth.uid())),
    true  -- 프로필 미생성(가입 직후) 허용 — Firestore 규칙과 동일
  );
$$;

alter table public.profiles enable row level security;

-- 본인 또는 관리자만 조회
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or app_private.is_admin());

-- 신규 가입 시 auth.users → profiles 자동 생성 (role 자가승격 원천 차단)
create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, phone_number)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'phone_number'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

-- 본인 수정: 컬럼 단위 권한으로 role/status 등 권한 필드 차단
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke update on public.profiles from authenticated;
grant update (name, fcm_token) on public.profiles to authenticated;
-- 관리자 조작(role/status 변경, 삭제)은 service_role(Edge Function) 경유

-- ============================================================
-- 2. vehicles (공개 정보만 — 가격/PII 제외)
-- ============================================================
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_no text not null,          -- 차량번호 (Firestore vehicleId)
  vehicle_name text not null,
  sub_model text,
  manufacturer text not null,
  year int,
  drive_type text,
  fuel_type text,
  cc int,
  transmission text,
  fuel_eco text,
  fuel_tank text,
  seats text,
  battery text,
  front_tire text,
  rear_tire text,
  engine_oil_liter text,
  wiper_info text,
  image_urls text[] not null default '{}',
  vehicle_type text,
  business_rights_included boolean not null default false,
  license_info text,
  status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected', 'sold')),
  deal_stage text not null default 'listed'
    check (deal_stage in ('listed', 'acquiring', 'in_stock', 'sold')),
  hidden boolean not null default false,   -- 계정삭제 유예기간 숨김
  is_admin_owned boolean not null default false,
  seller_id uuid not null references public.profiles (id),
  current_owner_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicles_status_idx on public.vehicles (status) where hidden = false;
create index vehicles_seller_idx on public.vehicles (seller_id);

alter table public.vehicles enable row level security;

-- 조회: 노출 매물(approved & not hidden) 전체 공개 / 소유자 / 관리자
create policy "vehicles_select" on public.vehicles
  for select to authenticated
  using (
    (status = 'approved' and hidden = false)
    or (select auth.uid()) = coalesce(current_owner_id, seller_id)
    or app_private.is_admin()
  );

-- 등록: 본인 명의, listed 시작, 관리자 필드 자가설정 불가 (자동노출 정책)
create policy "vehicles_insert_own" on public.vehicles
  for insert to authenticated
  with check (
    (select auth.uid()) = seller_id
    and app_private.is_active_user()
    and status = 'approved'
    and deal_stage = 'listed'
    and is_admin_owned = false
    and (current_owner_id is null or current_owner_id = (select auth.uid()))
  );

-- 수정: 소유자는 비권한 컬럼만(컬럼 그랜트), 관리자 조작은 service_role 경유
create policy "vehicles_update_own" on public.vehicles
  for update to authenticated
  using ((select auth.uid()) = coalesce(current_owner_id, seller_id) and app_private.is_active_user())
  with check ((select auth.uid()) = coalesce(current_owner_id, seller_id));

revoke update on public.vehicles from authenticated;
grant update (vehicle_name, sub_model, image_urls, vehicle_type,
              business_rights_included, license_info, updated_at)
  on public.vehicles to authenticated;

-- 삭제: 소유자
create policy "vehicles_delete_own" on public.vehicles
  for delete to authenticated
  using ((select auth.uid()) = coalesce(current_owner_id, seller_id) and app_private.is_active_user());

-- ============================================================
-- 3. vehicle_pricing — 가격 (관리자 전용; 리뷰 C1 해결)
-- ============================================================
create table public.vehicle_pricing (
  vehicle_id uuid primary key references public.vehicles (id) on delete cascade,
  price numeric check (price >= 0),
  purchase_price numeric check (purchase_price >= 0),  -- 매입가 (기존 vehicles.purchasePrice)
  updated_at timestamptz not null default now()
);

alter table public.vehicle_pricing enable row level security;

-- 관리자만 읽기/쓰기. 일반 사용자는 어떤 경로로도 가격에 접근 불가.
create policy "pricing_admin_all" on public.vehicle_pricing
  for all to authenticated
  using (app_private.is_admin())
  with check (app_private.is_admin());

-- ============================================================
-- 4. vehicle_private_contact — 판매자 PII (private/contact 대응)
-- ============================================================
create table public.vehicle_private_contact (
  vehicle_id uuid primary key references public.vehicles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id),
  seller_name text,
  seller_phone text,
  seller_email text,
  owner_name text,
  regi_number text,
  vin text,
  created_at timestamptz not null default now()
);

alter table public.vehicle_private_contact enable row level security;

create policy "contact_select_owner_or_admin" on public.vehicle_private_contact
  for select to authenticated
  using ((select auth.uid()) = seller_id or app_private.is_admin());

create policy "contact_insert_own" on public.vehicle_private_contact
  for insert to authenticated
  with check ((select auth.uid()) = seller_id and app_private.is_active_user());

-- 수정/삭제는 관리자(service_role) 경유

-- ============================================================
-- 5. consultation_requests — 상담 (이중예약은 부분 UNIQUE로 차단)
-- ============================================================
create table public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  vehicle_id uuid not null references public.vehicles (id),
  type text not null check (type in ('buy', 'sell')),
  consultation_status text not null default 'pending'
    check (consultation_status in
      ('pending', 'approved', 'confirmed', 'on-hold', 'rejected',
       'completed', 'cancelled', 'archived')),
  preferred_date date not null,
  preferred_time time not null,
  user_name text,
  user_phone text,
  vehicle_name text,
  admin_memo text,
  admin_notes text,
  rejection_reason text,
  alternative_slots jsonb,
  is_ownership_transferred boolean not null default false,
  transfer_id uuid,
  deal_amount numeric,
  completed_by uuid,
  completed_at timestamptz,
  cancelled_at timestamptz,
  rejected_at timestamptz,
  resubmitted_at timestamptz,
  memo_updated_at timestamptz,
  created_at timestamptz not null default now()
);

-- 이중예약 원자 차단: 활성 상담은 (차량, 날짜, 시간)당 1건
-- (Firestore에선 consultation_slots 선점 문서 + create-only 규칙 트릭이 필요했음)
create unique index consultation_active_slot_uniq
  on public.consultation_requests (vehicle_id, preferred_date, preferred_time)
  where consultation_status in ('pending', 'approved', 'confirmed', 'on-hold');

-- 같은 사용자가 같은 차량에 활성 상담 중복 신청 불가
create unique index consultation_active_user_vehicle_uniq
  on public.consultation_requests (user_id, vehicle_id)
  where consultation_status in ('pending', 'approved', 'confirmed', 'on-hold');

create index consultation_user_idx on public.consultation_requests (user_id);
create index consultation_vehicle_idx on public.consultation_requests (vehicle_id);

alter table public.consultation_requests enable row level security;

-- 조회: 신청자 본인 / 해당 차량 판매자(sell 상담) / 관리자
create policy "consultation_select" on public.consultation_requests
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or (type = 'sell' and (select auth.uid()) in (
      select coalesce(v.current_owner_id, v.seller_id)
      from public.vehicles v where v.id = vehicle_id
    ))
    or app_private.is_admin()
  );

-- 생성: 본인 명의, pending 시작
create policy "consultation_insert_own" on public.consultation_requests
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and app_private.is_active_user()
    and consultation_status = 'pending'
  );

-- 사용자 수정(취소/재신청): 상태 전이는 트리거에서 검증
create policy "consultation_update_own" on public.consultation_requests
  for update to authenticated
  using ((select auth.uid()) = user_id and app_private.is_active_user())
  with check ((select auth.uid()) = user_id);

revoke update on public.consultation_requests from authenticated;
grant update (consultation_status, preferred_date, preferred_time,
              cancelled_at, resubmitted_at, rejection_reason, alternative_slots, rejected_at)
  on public.consultation_requests to authenticated;

-- 사용자 상태 전이 검증: 취소(활성→cancelled) 또는 재신청(rejected→pending)만 허용
create or replace function app_private.guard_consultation_user_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 관리자/service_role은 제한 없음
  if app_private.is_admin() or (select auth.uid()) is null then
    return new;
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

  raise exception '허용되지 않은 상담 상태 변경입니다 (% → %)',
    old.consultation_status, new.consultation_status;
end;
$$;

create trigger consultation_user_update_guard
  before update on public.consultation_requests
  for each row execute function app_private.guard_consultation_user_update();

-- ============================================================
-- 6. ownership_transfers — 소유권 이전 (불변 감사 기록)
-- ============================================================
create table public.ownership_transfers (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id),
  consultation_id uuid references public.consultation_requests (id),
  from_user_id uuid,
  to_user_id uuid,
  transfer_type text not null check (transfer_type in ('sell_to_admin', 'admin_to_buyer')),
  price numeric not null check (price >= 0),
  notes text,
  transferred_at timestamptz not null default now()
);

alter table public.ownership_transfers enable row level security;

create policy "transfers_admin_select" on public.ownership_transfers
  for select to authenticated
  using (app_private.is_admin());

create policy "transfers_admin_insert" on public.ownership_transfers
  for insert to authenticated
  with check (app_private.is_admin());
-- update/delete 정책 없음 = 불변

-- ============================================================
-- 7. ownership_transfer_audit_logs — append-only
-- ============================================================
create table public.ownership_transfer_audit_logs (
  id uuid primary key default gen_random_uuid(),
  transfer_type text not null check (transfer_type in ('sell_to_admin', 'admin_to_buyer')),
  vehicle_id uuid not null,
  consultation_id uuid not null,
  status text not null check (status in ('completed', 'failed')),
  duration_ms int not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table public.ownership_transfer_audit_logs enable row level security;

create policy "audit_admin_select" on public.ownership_transfer_audit_logs
  for select to authenticated
  using (app_private.is_admin());

create policy "audit_admin_insert" on public.ownership_transfer_audit_logs
  for insert to authenticated
  with check (app_private.is_admin());

-- ============================================================
-- 8. admin_owned_vehicles — J-Car 매입 보유 차량
-- ============================================================
create table public.admin_owned_vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id),
  consultation_id uuid unique references public.consultation_requests (id),  -- 멱등키(중복 매입 기록 방지)
  vehicle_name text,
  purchase_price numeric check (purchase_price >= 0),
  previous_owner_id uuid,
  previous_owner_name text,
  status text not null default 'owned' check (status in ('owned', 'sold')),
  sold_price numeric,
  sold_at timestamptz,
  acquired_at timestamptz not null default now()
);

alter table public.admin_owned_vehicles enable row level security;

create policy "owned_admin_all" on public.admin_owned_vehicles
  for all to authenticated
  using (app_private.is_admin())
  with check (app_private.is_admin());

-- ============================================================
-- 9. admin_activity_log — append-only
-- ============================================================
create table public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id),
  action text not null,
  target_user_id uuid,
  target_user_name text,
  previous_status text,
  new_status text,
  created_at timestamptz not null default now()
);

alter table public.admin_activity_log enable row level security;

create policy "activity_admin_select" on public.admin_activity_log
  for select to authenticated
  using (app_private.is_admin());

create policy "activity_admin_insert" on public.admin_activity_log
  for insert to authenticated
  with check (app_private.is_admin() and (select auth.uid()) = admin_id);

-- ============================================================
-- 10. Storage — 차량 이미지 버킷
-- ============================================================
insert into storage.buckets (id, name, public)
values ('vehicles', 'vehicles', true)
on conflict (id) do nothing;

-- 업로드: 인증 사용자, 신규 생성만 (덮어쓰기/삭제 불가 — 기존 Storage 규칙과 동일)
create policy "vehicle_images_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vehicles');

-- 공개 버킷이므로 read는 public URL로 제공. update/delete 정책 없음 = 클라 변조 불가
