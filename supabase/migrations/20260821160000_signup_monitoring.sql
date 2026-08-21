-- 가입 한도 조정 + 이상 감지 자동화
--
-- 배경: 2026-08-20에 구글 로그인 경로가 열린 직후(00:54) 24분 만에 자동 가입이
-- 시작돼 9건이 들어왔다. 유입 경로는 특정하지 못했고, 발견도 우연한 조회로 이뤄졌다.
-- 속도 제한만으로는 부족하다 — 알아채는 수단이 필요하다.
--
-- 1) 한도를 현재 규모에 맞게 조인다.
--    실사용자가 4명인 단계에서 시간당 20은 헐겁다(하루 최대 456건까지 통과).
--    정식 출시 때 올린다 — 늦출 때의 비용(가입 실패)보다 방치할 때의 비용이 크다.
-- 2) 임계치를 넘으면 관리자에게 알림을 보낸다.
--    이미 있는 notifications 허브를 그대로 쓴다(행을 넣으면 푸시까지 자동).

create or replace function app_private.enforce_signup_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hour  int;
  v_day   int;
  v_provider text := new.raw_app_meta_data ->> 'provider';
begin
  select count(*) into v_hour
    from app_private.signup_audit
   where blocked = false and created_at > now() - interval '1 hour';

  select count(*) into v_day
    from app_private.signup_audit
   where blocked = false and created_at > now() - interval '24 hours';

  -- 조정: 20/시간·100/일 → 5/시간·30/일
  if v_hour >= 5 or v_day >= 30 then
    insert into app_private.signup_audit (user_id, email, provider, blocked)
    values (new.id, new.email, v_provider, true);

    raise exception 'signup_rate_limit'
      using hint = '가입 요청이 일시적으로 많습니다. 잠시 후 다시 시도해주세요.';
  end if;

  insert into app_private.signup_audit (user_id, email, provider, blocked)
  values (new.id, new.email, v_provider, false);

  return new;
end;
$$;

-- ============================================================
-- 이상 감지 — 관리자에게 알림
-- ============================================================
-- 판단 기준을 둘로 나눈다:
--   * 차단 발생: 한도에 실제로 부딪혔다 = 누군가 밀어넣고 있다 (강한 신호)
--   * 급증: 차단까지는 아니어도 평소보다 많다 (약한 신호)
-- 중복 알림을 막기 위해 같은 날 같은 종류는 한 번만 보낸다.

create or replace function app_private.detect_signup_anomaly()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_blocked int;
  v_recent  int;
  v_title   text;
  v_body    text;
  v_kind    text;
begin
  select count(*) into v_blocked
    from app_private.signup_audit
   where blocked = true and created_at > now() - interval '24 hours';

  select count(*) into v_recent
    from app_private.signup_audit
   where blocked = false and created_at > now() - interval '24 hours';

  if v_blocked > 0 then
    v_kind  := 'signup_blocked';
    v_title := '가입 차단 발생';
    v_body  := format('최근 24시간 동안 가입 %s건이 한도로 차단됐습니다. 자동 가입 시도일 수 있습니다.', v_blocked);
  elsif v_recent >= 10 then
    v_kind  := 'signup_spike';
    v_title := '가입 급증';
    v_body  := format('최근 24시간 가입이 %s건입니다. 평소보다 많습니다.', v_recent);
  else
    return;  -- 정상 — 조용히 지나간다
  end if;

  -- 같은 날 같은 종류는 한 번만
  if exists (
    select 1 from public.notifications
     where type = v_kind and created_at > date_trunc('day', now())
  ) then
    return;
  end if;

  -- 관리자 전원에게. 알림 허브에 넣으면 푸시는 트리거가 알아서 보낸다.
  insert into public.notifications (user_id, type, title, body, data)
  select p.id, v_kind, v_title, v_body,
         jsonb_build_object('type', v_kind)
    from public.profiles p
   where p.role = 'admin' and p.status = 'active';
end;
$$;

revoke all on function app_private.detect_signup_anomaly() from public, anon, authenticated;

-- 매시 정각 점검. 하루 한 번이면 밤사이 유입을 아침에야 알게 된다.
select cron.unschedule('detect-signup-anomaly')
  where exists (select 1 from cron.job where jobname = 'detect-signup-anomaly');

select cron.schedule(
  'detect-signup-anomaly',
  '0 * * * *',
  $cron$ select app_private.detect_signup_anomaly(); $cron$
);
