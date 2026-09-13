-- record_auth_event가 받는 값을 좁힌다.
--
-- 이 함수는 anon에게 열려 있다(20260902090000). reset-password가 service_role을
-- 쥐지 않는 설계라서다. 그래서 공개 anon 키만 있으면 누구나 PostgREST로 직접
-- 불러 **아무 이벤트 이름·아무 크기의 detail**을 넣을 수 있었다. 보안 점검
-- (2026-09-13)에서 짚였다 — 계정 탈취 조사에 쓰려고 만든 로그에 그럴듯한
-- 가짜 reset_succeeded를 섞을 수 있다.
--
-- 권한을 service_role로 좁히는 대신 값을 좁히는 이유: 그러려면 공개 엔드포인트가
-- 관리자 키를 들게 되고, 그건 원래 설계가 피하려던 것이다. 이 변경으로 가짜 행
-- 자체가 불가능해지지는 않는다 — 실제로 쓰는 이벤트 이름을 흉내 낼 수는 있다.
-- 막는 것은 **엉뚱한 이벤트 종류를 지어내는 것**과 **detail로 표를 부풀리는 것**이다.
--
-- 행동 원칙:
--   모르는 이벤트  → 거부한다. 정당한 호출자는 reset-password 하나뿐이라, 거부가
--                   나면 오타이고 함수 로그에 드러나야 한다.
--   큰 detail      → 거부하지 않고 표시로 바꾼다. 진짜 사건이 detail 때문에
--                   통째로 사라지는 편이 더 나쁘다.
--   객체가 아닌 값 → 같은 이유로 빈 객체로 바꾼다.

create or replace function public.record_auth_event(
  p_event text,
  p_email text default null,
  p_ip text default null,
  p_user_agent text default null,
  p_detail jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- reset-password가 실제로 남기는 이벤트. 새 이벤트를 기록하려면 여기에 더한다.
  c_allowed constant text[] := array['reset_rate_limited', 'reset_failed', 'reset_succeeded'];
  -- 지금 쓰는 detail은 {stage, status} 수준(수십 바이트)이다. 넉넉히 잡는다.
  c_max_detail_bytes constant int := 2048;
  v_detail jsonb := coalesce(p_detail, '{}'::jsonb);
begin
  if p_event is null or not (p_event = any (c_allowed)) then
    raise exception 'unknown auth event: %', left(coalesce(p_event, '<null>'), 64)
      using errcode = '22023';  -- invalid_parameter_value
  end if;

  if jsonb_typeof(v_detail) <> 'object' then
    v_detail := '{}'::jsonb;
  elsif octet_length(v_detail::text) > c_max_detail_bytes then
    v_detail := jsonb_build_object('truncated', true, 'bytes', octet_length(v_detail::text));
  end if;

  insert into public.auth_events (event, email, ip, user_agent, detail)
  values (
    p_event,
    left(lower(nullif(trim(p_email), '')), 320),
    left(p_ip, 64),
    left(p_user_agent, 256),
    v_detail
  );
end;
$$;

-- create or replace는 권한을 유지하지만, 이 파일만 읽어도 권한이 보이게 다시 적는다.
revoke all on function public.record_auth_event(text, text, text, text, jsonb) from public;
grant execute on function public.record_auth_event(text, text, text, text, jsonb) to anon, authenticated, service_role;
