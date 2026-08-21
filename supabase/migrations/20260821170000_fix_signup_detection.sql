-- 가입 이상 감지 수정 — 차단 기록은 롤백돼서 남지 않는다
--
-- 발견: 검증 중 감지가 한 번도 발동하지 않아 원인을 찾았다.
-- enforce_signup_rate_limit은 한도 초과 시 signup_audit에 blocked=true를 넣은 **직후**
-- raise exception을 던진다. 그런데 그 예외가 문(statement) 전체를 롤백시키므로
-- 방금 넣은 감사 행도 함께 사라진다. 즉 blocked=true는 절대 커밋되지 않는다.
--
-- 트랜잭션 밖에 쓰려면 autonomous transaction(dblink/pg_background)이 필요한데,
-- 차단 하나 기록하려고 그 복잡도를 들일 이유가 없다.
--
-- 대신 두 가지로 바꾼다:
--   1) 차단은 raise warning으로 Postgres 로그에 남긴다. 로그는 롤백되지 않는다.
--   2) 감지는 "차단이 있었나"가 아니라 **"한도까지 찼나"** 로 판단한다.
--      한도에 도달했다는 것은 누군가 밀어넣고 있다는 뜻이고, 이 신호는
--      성공한 가입 행만으로 계산되므로 롤백의 영향을 받지 않는다.

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

  if v_hour >= 5 or v_day >= 30 then
    -- 로그에만 남긴다. 여기서 테이블에 INSERT해도 아래 예외로 함께 롤백된다.
    raise warning 'signup blocked: email=% provider=% hour=% day=%',
      new.email, v_provider, v_hour, v_day;

    raise exception 'signup_rate_limit'
      using hint = '가입 요청이 일시적으로 많습니다. 잠시 후 다시 시도해주세요.';
  end if;

  insert into app_private.signup_audit (user_id, email, provider, blocked)
  values (new.id, new.email, v_provider, false);

  return new;
end;
$$;

create or replace function app_private.detect_signup_anomaly()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hour   int;
  v_day    int;
  v_title  text;
  v_body   text;
  v_kind   text;
begin
  select count(*) into v_hour
    from app_private.signup_audit
   where blocked = false and created_at > now() - interval '1 hour';

  select count(*) into v_day
    from app_private.signup_audit
   where blocked = false and created_at > now() - interval '24 hours';

  -- 한도(5/시간)까지 찼다 = 누군가 계속 밀어넣고 있다는 뜻
  if v_hour >= 5 then
    v_kind  := 'signup_blocked';
    v_title := '가입 한도 도달';
    v_body  := format('최근 1시간 가입이 %s건으로 한도에 도달했습니다. 자동 가입 시도일 수 있습니다.', v_hour);
  elsif v_day >= 10 then
    v_kind  := 'signup_spike';
    v_title := '가입 급증';
    v_body  := format('최근 24시간 가입이 %s건입니다. 평소보다 많습니다.', v_day);
  else
    return;
  end if;

  if exists (
    select 1 from public.notifications
     where type = v_kind and created_at > date_trunc('day', now())
  ) then
    return;  -- 같은 날 같은 종류는 한 번만
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  select p.id, v_kind, v_title, v_body, jsonb_build_object('type', v_kind)
    from public.profiles p
   where p.role = 'admin' and p.status = 'active';
end;
$$;

revoke all on function app_private.detect_signup_anomaly() from public, anon, authenticated;
