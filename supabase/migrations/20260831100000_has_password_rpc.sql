-- 내 계정에 비밀번호가 설정돼 있는가.
--
-- 클라이언트는 이걸 알 방법이 없다. 구글로 가입한 사람이 비밀번호 재설정으로
-- 비밀번호를 만들어도 `identities`는 ["google"] 그대로고 `app_metadata.providers`도
-- 바뀌지 않는다(2026-08-31 실계정으로 확인). 그래서 identities를 보고 판단하던
-- 마이페이지는 비밀번호가 있는 사용자에게 '비밀번호 변경'을 숨기고 있었다 —
-- 만들어놓고 바꿀 수 없는 상태.
--
-- auth.users는 일반 사용자가 읽을 수 없으므로 SECURITY DEFINER로 한 칸만 연다.
-- **불리언만 반환한다.** 해시도, 다른 사용자의 정보도 나가지 않는다.
create or replace function public.has_password()
returns boolean
language sql
security definer
stable
set search_path = auth, pg_temp
as $$
  select coalesce(encrypted_password, '') <> ''
  from auth.users
  where id = auth.uid();
$$;

comment on function public.has_password() is
  '호출한 사용자 본인에게 비밀번호가 설정돼 있는지. 구글 전용 계정과 비밀번호를 추가한 계정을 구분한다.';

-- 기본 권한이 public/anon까지 열리므로 명시적으로 닫는다.
revoke all on function public.has_password() from public;
revoke all on function public.has_password() from anon;
grant execute on function public.has_password() to authenticated;
