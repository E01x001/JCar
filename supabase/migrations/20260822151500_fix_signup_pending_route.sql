-- 승인 대기 알림의 이동 경로 수정
--
-- 20260822140000에서 data.screen을 'AdminUserManagement'로 넣었는데,
-- 네비게이터에 등록된 이름은 'UserManagement'다(화면 파일명과 라우트명이 다르다).
-- 그대로 두면 알림을 눌러도 이동에 실패한다.

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed boolean;
begin
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

  if not coalesce(v_allowed, false) then
    insert into public.notifications (user_id, type, title, body, data)
    select p.id,
           'signup_pending',
           '가입 승인 대기',
           format('%s 님이 가입을 요청했습니다. 사용자 관리에서 승인해주세요.',
                  coalesce(new.email, '알 수 없는 계정')),
           jsonb_build_object('type', 'signup_pending', 'screen', 'UserManagement')
      from public.profiles p
     where p.role = 'admin' and p.status = 'active';
  end if;

  return new;
end;
$$;
