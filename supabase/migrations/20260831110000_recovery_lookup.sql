-- 비밀번호 찾기 분기에 필요한 최소 정보 조회 + 안내 메일 발송 기록.
--
-- 배경: 구글로만 가입한 사람이 "비밀번호 찾기"를 누르면, 지금은 재설정 링크가
-- 가고 비밀번호를 만들 수 있다. 구글 계정에 더 약한 자격증명이 하나 붙는다는
-- 뜻이라, 대신 "구글로 로그인하세요" 안내 메일을 보내려 한다.
--
-- 이 분기를 **클라이언트에게 보이면 안 된다.** 로그인하지 않은 사람이 임의의
-- 이메일로 계정 존재 여부와 로그인 수단을 알아낼 수 있게 되기 때문이다
-- (계정 열거). 그래서 판단은 Edge Function 안에서만 하고, 요청자에게는
-- 언제나 같은 응답을 준다.

-- ── 조회 ────────────────────────────────────────────────────────────────
-- service_role만 실행한다. auth.users를 여는 창이므로 반환값을 최소로 묶는다:
-- 이메일 본문을 고르는 데 필요한 것 이상은 나가지 않는다.
create or replace function public.lookup_recovery_target(p_email text)
returns table (user_id uuid, has_password boolean)
language sql
security definer
stable
set search_path = auth, pg_temp
as $$
  select u.id, coalesce(u.encrypted_password, '') <> ''
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
    and u.deleted_at is null
  limit 1;
$$;

comment on function public.lookup_recovery_target(text) is
  '비밀번호 찾기 분기용. Edge Function(service_role) 전용 — 계정 열거를 막기 위해 클라이언트에 노출하지 않는다.';

revoke all on function public.lookup_recovery_target(text) from public;
revoke all on function public.lookup_recovery_target(text) from anon;
revoke all on function public.lookup_recovery_target(text) from authenticated;
grant execute on function public.lookup_recovery_target(text) to service_role;

-- ── 발송 기록 ───────────────────────────────────────────────────────────
-- 안내 메일은 우리가 직접 보내므로 Supabase의 메일 레이트리밋 밖에 있다.
-- 기록이 없으면 남의 받은편지함에 메일을 퍼붓는 도구가 된다.
create table if not exists public.recovery_notice_log (
  email text primary key,
  last_sent_at timestamptz not null default now()
);

comment on table public.recovery_notice_log is
  '소셜 계정 안내 메일 발송 시각. 같은 주소로 반복 발송되는 것을 막는다.';

-- 누구도 직접 읽거나 쓰지 않는다. service_role은 RLS를 우회하므로 정책이 없어도
-- Edge Function은 접근할 수 있고, 그 외에는 전부 막힌다.
alter table public.recovery_notice_log enable row level security;

revoke all on table public.recovery_notice_log from public;
revoke all on table public.recovery_notice_log from anon;
revoke all on table public.recovery_notice_log from authenticated;

-- 마지막 발송이 p_min_interval보다 오래됐으면 기록을 갱신하고 true.
-- 판단과 기록을 한 문장에 담아 동시 호출에서 두 번 보내지 않게 한다.
create or replace function public.claim_recovery_notice(
  p_email text,
  p_min_interval interval default '60 seconds'
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
  v_claimed boolean;
begin
  insert into public.recovery_notice_log (email, last_sent_at)
  values (v_email, now())
  on conflict (email) do update
    set last_sent_at = now()
    where public.recovery_notice_log.last_sent_at < now() - p_min_interval
  returning true into v_claimed;

  return coalesce(v_claimed, false);
end;
$$;

revoke all on function public.claim_recovery_notice(text, interval) from public;
revoke all on function public.claim_recovery_notice(text, interval) from anon;
revoke all on function public.claim_recovery_notice(text, interval) from authenticated;
grant execute on function public.claim_recovery_notice(text, interval) to service_role;
