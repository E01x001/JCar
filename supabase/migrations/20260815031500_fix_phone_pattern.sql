-- complete_profile 휴대폰 정규식 수정
--
-- 직전 마이그레이션의 '^01[0-9]{7,8}$'는 총 9~10자리만 허용해서 국내 표준인
-- 11자리(010-1234-5678 → 01012345678)를 거부했다. 검증에서 실제로 걸린 버그.
-- 올바른 범위: 01 + 8~9자리 = 총 10~11자리 (011/016 등 구번호 10자리 포함).

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

  if v_phone !~ '^01[0-9]{8,9}$' then
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
