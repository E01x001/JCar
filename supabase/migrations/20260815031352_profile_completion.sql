-- 프로필 완성 게이팅 (소셜 로그인 대비)
--
-- 배경: 구글 로그인은 이름은 주지만 전화번호는 절대 주지 않는다. 이메일 가입도
-- 대시보드 생성 계정 등 metadata가 비어 들어오는 경로가 있다. 이름·전화 없이
-- 차량 등록이나 상담 신청이 되면 판매자 정보가 'Unknown'으로 남고 관리자가
-- 연락할 방법이 없어진다. 그래서 완성 여부를 DB에서 강제한다.
-- (형제 프로젝트 Taxitogether의 profile_completed 게이팅 패턴과 동일한 접근)

-- ============================================================
-- 1. profile_completed 플래그
-- ============================================================
alter table public.profiles
  add column profile_completed boolean not null default false;

-- 기존 계정 백필: 이름·전화가 이미 있으면 완성으로 본다
update public.profiles
   set profile_completed = true
 where coalesce(btrim(name), '') <> ''
   and coalesce(btrim(phone_number), '') <> '';

-- ============================================================
-- 2. 가드 재정의
-- ============================================================
-- 변경점:
--  * phone_number를 보호 대상에서 제외 — 번호 변경은 정상적인 사용자 행위이고,
--    오타로 잘못 넣은 번호를 영영 못 고치는 함정이 생긴다. 애초에 전화 인증이
--    없어 "인증 우회 방지"라는 원래 명분도 성립하지 않았다.
--  * profile_completed를 보호 대상에 추가 — 검증을 거치지 않고 완성 처리하는 것을 막는다.
--  * complete_profile RPC가 세팅하는 세션 플래그를 통과 조건으로 인정.
--    set_config는 pg_catalog 함수라 PostgREST로 직접 호출할 수 없어 위조 불가.
create or replace function app_private.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 검증을 마친 RPC 경유
  if coalesce(current_setting('app.bypass_profile_guard', true), '') = 'on' then
    return new;
  end if;

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
  or new.created_at     is distinct from old.created_at
  or new.profile_completed is distinct from old.profile_completed then
    raise exception '권한이 없는 프로필 필드 변경입니다';
  end if;
  return new;
end;
$$;

-- ============================================================
-- 3. complete_profile RPC
-- ============================================================
create or replace function public.complete_profile(p_name text, p_phone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_name  text := btrim(coalesce(p_name, ''));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다';
  end if;

  if v_name = '' then
    raise exception '이름을 입력해주세요';
  end if;

  -- 국내 휴대폰 형식만 허용(하이픈은 위에서 제거됨)
  if v_phone !~ '^01[0-9]{7,8}$' then
    raise exception '올바른 휴대폰 번호를 입력해주세요';
  end if;

  perform set_config('app.bypass_profile_guard', 'on', true); -- 트랜잭션 한정

  update public.profiles
     set name = v_name,
         phone_number = v_phone,
         profile_completed = true
   where id = v_uid;

exception
  when unique_violation then
    raise exception '이미 등록된 휴대폰 번호입니다';
end;
$$;

revoke execute on function public.complete_profile(text, text) from public, anon;
grant execute on function public.complete_profile(text, text) to authenticated;

-- ============================================================
-- 4. 게이팅 — 프로필 미완성이면 차량 등록·상담 신청 차단
-- ============================================================
create or replace function app_private.is_profile_completed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select profile_completed from public.profiles where id = (select auth.uid())),
    false
  );
$$;

drop policy if exists "vehicles_insert_own" on public.vehicles;
create policy "vehicles_insert_own" on public.vehicles
  for insert to authenticated
  with check (
    (select auth.uid()) = seller_id
    and app_private.is_active_user()
    and app_private.is_profile_completed()
    and status = 'approved'
    and deal_stage = 'listed'
    and is_admin_owned = false
    and (current_owner_id is null or current_owner_id = (select auth.uid()))
  );

drop policy if exists "consultation_insert_own" on public.consultation_requests;
create policy "consultation_insert_own" on public.consultation_requests
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and app_private.is_active_user()
    and app_private.is_profile_completed()
    and consultation_status = 'pending'
  );
