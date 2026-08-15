-- 가입 시 프로필 완성 여부 자동 판정
--
-- 회귀 수정: profile_completed 게이팅을 도입하면서 이 트리거를 갱신하지 않아,
-- 이메일 회원가입에서 이름·전화를 이미 입력했는데도 로그인 직후 프로필 완성
-- 화면이 떠서 같은 정보를 다시 입력하게 됐다.
--
-- 판정 기준은 complete_profile RPC와 동일하게 맞춘다. 형식이 어긋난 값이
-- metadata로 들어오면(가입 화면은 형식 검증을 하지 않는다) 완성으로 보지 않고
-- 완성 화면에서 제대로 받는다.
--
-- 구글 로그인은 이름만 오고 전화번호가 없으므로 자연히 false로 남아
-- 완성 화면으로 유도된다 — 의도된 동작.

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text := btrim(coalesce(new.raw_user_meta_data ->> 'name', ''));
  v_phone text := regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'phone_number', ''), '[^0-9]', '', 'g'
  );
begin
  insert into public.profiles (id, email, name, phone_number, profile_completed)
  values (
    new.id,
    new.email,
    nullif(v_name, ''),
    nullif(v_phone, ''),
    v_name <> '' and v_phone ~ '^01[0-9]{8,9}$'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
