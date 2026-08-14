-- 푸시 발송 배선 (푸시 재구축 ③)
--
-- notifications에 행이 들어오면 pg_net으로 send-push-notification Edge Function을 호출한다.
-- 이것이 "빠른 경로"이고, 실패는 ⑥의 pg_cron 재시도 잡이 회수한다.
--
-- ── 선행 조건 (환경마다 1회, 이 파일 밖에서 실행) ────────────────────────────
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1', 'supabase_function_url');
--   select vault.create_secret('<service role key>', 'service_role_key');
--
-- 시크릿을 마이그레이션에 넣지 않는 이유: 레포가 크레덴셜을 갖지 않게 하고,
-- 복원·브랜치된 DB가 작동하는 키를 상속하지 않게 하기 위해서다.
-- 시크릿이 없으면 발송만 조용히 건너뛰므로 이 마이그레이션을 미리 적용해도 무해하다.

create extension if not exists pg_net;

create or replace function app_private.dispatch_push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_function_url     text;
  v_service_role_key text;
begin
  begin
    select decrypted_secret into v_function_url
      from vault.decrypted_secrets where name = 'supabase_function_url' limit 1;

    select decrypted_secret into v_service_role_key
      from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  exception when others then
    -- vault 미설치/권한 없음 — 발송만 건너뛴다
    return new;
  end;

  if v_function_url is null or v_function_url = '' then
    raise warning 'push: supabase_function_url이 Vault에 없어 발송을 건너뜁니다';
    return new;
  end if;

  -- notificationId는 ⑤에서 Edge Function이 발송 결과를 이 행에 기록할 때 쓴다
  perform net.http_post(
    url     := v_function_url || '/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || coalesce(v_service_role_key, '')
    ),
    body    := jsonb_build_object(
      'notificationId', new.id,
      'userId',         new.user_id,
      'title',          new.title,
      'body',           new.body,
      'data',           coalesce(new.data, '{}'::jsonb)
    )
  );

  return new;
exception when others then
  -- 푸시 실패가 알림 INSERT(및 그것을 감싼 상태변경 트랜잭션)를 되돌리면 안 된다
  raise warning 'push: 발송 요청 실패 — %', sqlerrm;
  return new;
end;
$$;

create trigger on_notification_created
  after insert on public.notifications
  for each row execute function app_private.dispatch_push_notification();

grant usage on schema net to postgres, service_role;
