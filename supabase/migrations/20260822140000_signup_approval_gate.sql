-- 가입 승인제 — 관리자가 허용하지 않으면 아무것도 못 한다
--
-- 배경: 2026-08-20부터 유입 경로를 특정하지 못한 자동 가입이 계속됐다.
-- 속도 제한(5/시간·30/일)과 이상 감지를 붙였지만 둘 다 "많이 들어오면 막는다"이지
-- "허락한 사람만 들어온다"가 아니다. 실사용자가 한 자릿수인 지금은 후자가 맞다.
--
-- 왜 가입 자체를 거부하지 않는가:
--   auth.users BEFORE INSERT에서 raise exception을 하면 같은 트랜잭션에서 남긴
--   감사 로그까지 함께 롤백된다(20260821170000에서 이미 겪었다). 누가 시도했는지
--   기록이 남지 않아 관리자가 나중에 승인할 방법이 사라진다.
--   그래서 **계정은 만들되 status='pending'으로 잠근다**. 기록이 남고,
--   관리자는 목록에서 보고 승인하면 된다.
--
-- 잠금은 두 겹이다:
--   1) DB — is_active_user()를 화이트리스트로 뒤집는다. pending은 아무것도 못 쓴다.
--   2) 앱 — AuthContext가 pending을 감지하면 즉시 로그아웃시킨다.
--   1번이 실제 경계다. 2번은 안내를 위한 것이다.

-- ============================================================
-- 1) status에 'pending' 추가
-- ============================================================
alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'pending', 'suspended'));

comment on column public.profiles.status is
  'active=이용 가능, pending=관리자 승인 대기(가입은 됐으나 아무 권한 없음), suspended=정지';

-- ============================================================
-- 2) 사전 허용 목록
-- ============================================================
-- 테스터를 미리 등록해두면 가입 즉시 active로 들어온다.
-- 미리 등록하지 않았다면 pending으로 대기하고, 관리자가 승인하면 된다.
create table if not exists app_private.signup_allowlist (
  email       text primary key,
  note        text,
  added_by    uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  used_at     timestamptz
);

revoke all on app_private.signup_allowlist from public, anon, authenticated;

-- 기존 사용자는 이미 들어와 있다. 재가입 시 막히지 않도록 넣어둔다.
insert into app_private.signup_allowlist (email, note)
select email, '기존 사용자 (승인제 도입 시점)'
  from public.profiles
 where email is not null and status = 'active'
on conflict (email) do nothing;

-- ============================================================
-- 3) 신규 가입은 기본 pending
-- ============================================================
create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed boolean;
begin
  -- 이메일 비교는 소문자 기준. 구글은 대소문자를 섞어 보낼 수 있다.
  select true into v_allowed
    from app_private.signup_allowlist
   where lower(email) = lower(new.email);

  if v_allowed then
    update app_private.signup_allowlist
       set used_at = coalesce(used_at, now())
     where lower(email) = lower(new.email);
  end if;

  insert into public.profiles (id, email, name, phone_number, status)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'phone_number',
    case when v_allowed then 'active' else 'pending' end
  )
  on conflict (id) do nothing;

  -- 승인 대기가 생기면 관리자에게 알린다. 알림 허브에 넣으면 푸시는 트리거가 보낸다.
  -- 승인이 늦어지면 정상 사용자가 그대로 방치되므로 조용히 쌓이게 두지 않는다.
  if not coalesce(v_allowed, false) then
    insert into public.notifications (user_id, type, title, body, data)
    select p.id,
           'signup_pending',
           '가입 승인 대기',
           format('%s 님이 가입을 요청했습니다. 사용자 관리에서 승인해주세요.',
                  coalesce(new.email, '알 수 없는 계정')),
           jsonb_build_object('type', 'signup_pending', 'screen', 'AdminUserManagement')
      from public.profiles p
     where p.role = 'admin' and p.status = 'active';
  end if;

  return new;
end;
$$;

-- ============================================================
-- 4) is_active_user()를 화이트리스트로 뒤집는다
-- ============================================================
-- 기존: status가 'suspended'만 아니면 통과 → 새로 생긴 'pending'이 그냥 통과해버린다.
-- 변경: 'active'일 때만 통과. 프로필이 없으면 거부(fail-closed).
--       profiles 행은 on_auth_user_created가 같은 트랜잭션에서 만들므로
--       "가입 직후 프로필 없음"을 위해 true를 반환하던 예외는 더 이상 필요 없다.
create or replace function app_private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select status = 'active'
        and account_status is distinct from 'pending_deletion'
     from public.profiles
     where id = (select auth.uid())),
    false
  );
$$;

-- ============================================================
-- 5) 관리자용 사전 허용 등록
-- ============================================================
-- 승인 자체는 사용자 관리 화면에서 profiles.status를 바꾸면 되므로 RPC가 필요 없다.
-- 여기 있는 것은 "가입하기 전에 미리 허용해두기" 용도다(테스터 초대 등).
create or replace function public.allow_signup_email(p_email text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.is_admin() then
    raise exception 'forbidden' using hint = '관리자만 사용할 수 있습니다.';
  end if;

  insert into app_private.signup_allowlist (email, note, added_by)
  values (lower(trim(p_email)), p_note, (select auth.uid()))
  on conflict (email) do update set note = excluded.note;

  -- 이미 가입해서 대기 중이라면 바로 열어준다 — 두 번 손대게 하지 않는다.
  update public.profiles
     set status = 'active', status_updated_at = now()
   where lower(email) = lower(trim(p_email)) and status = 'pending';
end;
$$;

revoke all on function public.allow_signup_email(text, text) from public, anon;
grant execute on function public.allow_signup_email(text, text) to authenticated;
