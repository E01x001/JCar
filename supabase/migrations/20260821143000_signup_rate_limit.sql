-- 가입 레이트리밋 (자동 가입 차단)
--
-- 배경: 2026-08-20에 서로 다른 기기 11대에서 구글 계정 9개가 가입한 뒤 아무 활동도
-- 하지 않는 패턴이 관측됐다(차량 0, 상담 0, 토큰 전원 상이). Play 사전 출시 크롤러가
-- 아니고(보고서 0건), 공개 APK 경유도 아니다(다운로드 2회).
--
-- 그때까지 가입에는 아무 제한이 없었다 — 상담 요청에만 레이트리밋이 있었다.
--
-- 설계 판단:
--   * 이메일 패턴 차단은 하지 않는다. 봇은 패턴을 바꾸면 그만이고, 정상 사용자를
--     이름 형태로 거부하는 부작용이 크다.
--   * 대신 **속도**를 제한한다. 사람의 가입은 몰려도 시간당 수십 건을 넘지 않는다.
--   * 한도를 넘으면 거부하되, 무엇이 막혔는지 로그로 남겨 조용한 실패를 만들지 않는다.
--
-- 한도는 넉넉하게 잡았다. 실제 서비스 성장기에 부딪히면 값을 올리면 된다 —
-- 여기서 막는 것은 "정상 성장"이 아니라 "분당 수십 건"이다.

create table if not exists app_private.signup_audit (
  id          bigserial primary key,
  user_id     uuid,
  email       text,
  provider    text,
  blocked     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists signup_audit_created_idx
  on app_private.signup_audit (created_at desc);

-- 앱/사용자에게 노출할 필요가 없다
revoke all on app_private.signup_audit from public, anon, authenticated;

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

  if v_hour >= 20 or v_day >= 100 then
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

-- handle_new_user보다 **먼저** 돌아야 한다(이름순으로 결정되므로 접두사를 앞세운다).
-- 한도를 넘으면 여기서 예외가 나고 auth.users insert 자체가 롤백된다.
drop trigger if exists a_enforce_signup_rate_limit on auth.users;
create trigger a_enforce_signup_rate_limit
  before insert on auth.users
  for each row execute function app_private.enforce_signup_rate_limit();

-- 기존 가입 이력을 감사 테이블에 채워 넣는다(한도 계산 기준을 현재 상태와 맞춘다).
insert into app_private.signup_audit (user_id, email, provider, blocked, created_at)
select u.id, u.email, u.raw_app_meta_data ->> 'provider', false, u.created_at
  from auth.users u
 where not exists (select 1 from app_private.signup_audit s where s.user_id = u.id);
