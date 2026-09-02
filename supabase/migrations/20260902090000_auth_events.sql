-- 인증 보안 이벤트 기록 + 시도 제한.
--
-- 왜 필요한가: 지금은 비밀번호 재설정이 언제 요청되고 성공했는지 어디에도 남지
-- 않는다. 계정 탈취 신고가 들어와도 "언제, 몇 번 시도됐나"를 답할 수 없다.
-- Edge Function 로그는 무료 플랜에서 하루면 사라지므로 근거가 되지 못한다.
--
-- 이 테이블은 **덧붙이기 전용**이다. 수정·삭제 권한을 아무에게도 주지 않는다 —
-- 사건이 난 뒤 고쳐 쓸 수 있는 로그는 로그가 아니다.

create table if not exists public.auth_events (
  id bigserial primary key,
  event text not null,
  email text,
  user_id uuid,
  ip text,
  user_agent text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.auth_events is
  '인증 보안 이벤트(재설정 요청·성공·실패 등). 덧붙이기 전용 — 수정·삭제 권한 없음.';

create index if not exists auth_events_email_idx on public.auth_events (email, created_at desc);
create index if not exists auth_events_created_idx on public.auth_events (created_at desc);

alter table public.auth_events enable row level security;

revoke all on table public.auth_events from public;
revoke all on table public.auth_events from anon;
revoke all on table public.auth_events from authenticated;

-- 관리자만 읽는다. 쓰기는 아래 함수를 통해서만 들어온다.
drop policy if exists "관리자만 인증 이벤트 조회" on public.auth_events;
create policy "관리자만 인증 이벤트 조회"
  on public.auth_events for select
  using (app_private.is_admin());

grant select on table public.auth_events to authenticated;
grant usage, select on sequence public.auth_events_id_seq to service_role;

-- ── 시도 제한 ───────────────────────────────────────────────────────────
-- 재설정 함수는 로그인하지 못하는 사람이 부르므로 verify_jwt를 끈다. 그러면
-- Supabase의 인증 기반 제한이 걸리지 않으므로 우리가 직접 센다.
create table if not exists public.auth_rate_limit (
  key text primary key,
  window_start timestamptz not null default now(),
  attempts int not null default 0
);

comment on table public.auth_rate_limit is
  '인증 관련 공개 엔드포인트의 시도 횟수. key는 "용도:식별자" 형식.';

alter table public.auth_rate_limit enable row level security;
revoke all on table public.auth_rate_limit from public;
revoke all on table public.auth_rate_limit from anon;
revoke all on table public.auth_rate_limit from authenticated;

/**
 * 시도 한 번을 소비한다. 한도를 넘으면 false.
 *
 * 판단과 증가를 한 문장에 담아 동시 요청이 한도를 넘겨 통과하지 못하게 한다.
 * 창(window)이 지나면 카운터를 되돌린다.
 */
create or replace function public.claim_auth_attempt(
  p_key text,
  p_limit int default 10,
  p_window interval default '1 hour'
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempts int;
begin
  insert into public.auth_rate_limit (key, window_start, attempts)
  values (p_key, now(), 1)
  on conflict (key) do update
    set attempts = case
          when public.auth_rate_limit.window_start < now() - p_window then 1
          else public.auth_rate_limit.attempts + 1
        end,
        window_start = case
          when public.auth_rate_limit.window_start < now() - p_window then now()
          else public.auth_rate_limit.window_start
        end
  returning attempts into v_attempts;

  return v_attempts <= p_limit;
end;
$$;

/**
 * 보안 이벤트 한 줄.
 *
 * anon에게도 실행을 허용한다 — 재설정 함수가 service_role을 쥐지 않기 때문이다
 * (그게 이 설계의 요점이다: 공개 엔드포인트가 관리자 권한을 들고 있지 않다).
 * 대신 **덧붙이기만** 가능하고, 남용은 claim_auth_attempt가 앞에서 막는다.
 */
create or replace function public.record_auth_event(
  p_event text,
  p_email text default null,
  p_ip text default null,
  p_user_agent text default null,
  p_detail jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.auth_events (event, email, ip, user_agent, detail)
  values (
    left(p_event, 64),
    lower(nullif(trim(p_email), '')),
    left(p_ip, 64),
    left(p_user_agent, 256),
    coalesce(p_detail, '{}'::jsonb)
  );
$$;

revoke all on function public.claim_auth_attempt(text, int, interval) from public;
revoke all on function public.record_auth_event(text, text, text, text, jsonb) from public;

grant execute on function public.claim_auth_attempt(text, int, interval) to anon, authenticated, service_role;
grant execute on function public.record_auth_event(text, text, text, text, jsonb) to anon, authenticated, service_role;
