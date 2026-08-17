-- 탈퇴 계정 익명화 (30일 유예 만료 처리)
--
-- 정책: **기록은 남기고, 사람은 지운다.**
-- 차량·거래·소유권 이전 이력은 회사가 보존해야 하는 자산이므로 삭제하지 않는다.
-- 대신 개인 식별정보만 파기·가명처리해서, 남는 기록이 개인정보가 아니게 만든다.
--
-- 왜 profiles 행을 지우지 않는가:
--   vehicles.seller_id / consultation_requests.user_id / vehicle_private_contact.seller_id가
--   profiles(id)를 ON DELETE 절 없이 참조한다(=RESTRICT). 기록을 남기는 한 프로필 행은
--   지울 수 없다. 그래서 프로필을 '묘비(tombstone)'로 남기고 내용만 비운다.
--   부수 효과로 서로 다른 탈퇴자를 uuid로 계속 구분할 수 있어 거래 이력이 온전해진다.
--   (모두를 하나의 '탈퇴회원' 계정으로 합치면 이력에서 당사자 구분이 사라진다.)
--
-- auth.users의 이메일 등은 SQL이 건드리지 않는다 — Edge Function이 admin API로 처리한다.
-- 여기서는 public 스키마만 책임진다.

-- 1) 익명화 완료 상태 추가
alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('pending_deletion', 'deleted'));

-- 2) 익명화된 계정도 로그인·활동을 차단한다
--    (기존 함수는 'pending_deletion'만 봤다)
create or replace function app_private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select status is distinct from 'suspended'
        and coalesce(account_status, '') not in ('pending_deletion', 'deleted')
     from public.profiles
     where id = (select auth.uid())),
    true  -- 프로필 미생성(가입 직후) 허용
  );
$$;

-- 3) 개인정보 파기 — public 스키마
--
-- 파기 대상(개인 식별정보):
--   vehicle_private_contact  판매자 이름/전화/이메일·소유자명·주민등록 관련 번호 → 행 자체 삭제
--   consultation_requests    user_name / user_phone → NULL
--   admin_owned_vehicles     previous_owner_name → NULL (previous_owner_id는 불투명 uuid라 유지)
--   notifications            개인 알림 이력 → 삭제
--   profiles                 name/email/phone_number/fcm_token → 비움
--
-- 보존 대상(개인정보 아님 / 회사 기록):
--   vehicles, ownership_transfers, ownership_transfer_audit_logs,
--   admin_owned_vehicles 본문, consultation_requests 본문
create or replace function app_private.anonymize_account(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 개인정보가 집중된 테이블은 행째 파기한다. 차량 자체는 남는다.
  delete from public.vehicle_private_contact where seller_id = p_uid;

  delete from public.notifications where user_id = p_uid;

  update public.consultation_requests
     set user_name  = null,
         user_phone = null
   where user_id = p_uid;

  update public.admin_owned_vehicles
     set previous_owner_name = null
   where previous_owner_id = p_uid;

  update public.profiles
     set name           = '탈퇴회원',
         email          = null,
         phone_number   = null,   -- UNIQUE지만 NULL은 중복 허용되므로 안전
         fcm_token      = null,
         account_status = 'deleted'
   where id = p_uid;
end;
$$;

revoke all on function app_private.anonymize_account(uuid) from public, anon, authenticated;

-- 4) 유예 만료 계정 조회 — Edge Function이 처리 대상을 가져갈 때 쓴다
create or replace function app_private.due_for_anonymization()
returns table (id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select id
    from public.profiles
   where account_status = 'pending_deletion'
     and permanent_delete_date is not null
     and permanent_delete_date <= now();
$$;

revoke all on function app_private.due_for_anonymization() from public, anon, authenticated;

-- 4-1) PostgREST 노출용 public 래퍼
--
-- PostgREST는 app_private 스키마를 노출하지 않으므로 Edge Function이 직접 호출할 수 없다.
-- 로직은 app_private에 두고, 얇은 래퍼만 public에 둔 뒤 service_role에게만 실행 권한을 준다.
-- (public에 두더라도 anon/authenticated에서 실행 권한을 회수했으므로 앱에서는 호출 불가)
create or replace function public.anonymize_account(p_uid uuid)
returns void
language sql
security definer
set search_path = ''
as $$ select app_private.anonymize_account(p_uid); $$;

revoke all on function public.anonymize_account(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_account(uuid) to service_role;

create or replace function public.due_for_anonymization()
returns table (id uuid)
language sql
stable
security definer
set search_path = ''
as $$ select id from app_private.due_for_anonymization(); $$;

revoke all on function public.due_for_anonymization() from public, anon, authenticated;
grant execute on function public.due_for_anonymization() to service_role;

-- 5) 매일 1회 Edge Function 호출 — pg_net 디스패치(푸시 발송과 동일한 패턴)
--
-- 시크릿은 마이그레이션에 넣지 않는다. 대시보드에서 한 번만 등록한다:
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1', 'supabase_function_url');
--   select vault.create_secret('<service role key>', 'service_role_key');
create extension if not exists pg_cron;

create or replace function app_private.dispatch_account_purge()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_function_url      text;
  v_service_role_key  text;
  v_due               int;
begin
  select count(*) into v_due from app_private.due_for_anonymization();
  if v_due = 0 then
    return;  -- 처리할 게 없으면 호출 자체를 하지 않는다
  end if;

  begin
    select decrypted_secret into v_function_url
      from vault.decrypted_secrets where name = 'supabase_function_url' limit 1;
    select decrypted_secret into v_service_role_key
      from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  exception when others then
    -- vault 미설치/권한 없음 — 조용히 건너뛴다(다음 실행에서 재시도)
    return;
  end;

  if v_function_url is null or v_service_role_key is null then
    return;
  end if;

  perform net.http_post(
    url     := v_function_url || '/purge-deleted-accounts',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body    := jsonb_build_object('due', v_due)
  );
end;
$$;

revoke all on function app_private.dispatch_account_purge() from public, anon, authenticated;

-- 매일 03:20 UTC(= KST 12:20) 실행. 트래픽이 적은 시간대일 필요는 없다 — 처리량이 작다.
select cron.unschedule('purge-deleted-accounts')
  where exists (select 1 from cron.job where jobname = 'purge-deleted-accounts');

select cron.schedule(
  'purge-deleted-accounts',
  '20 3 * * *',
  $cron$ select app_private.dispatch_account_purge(); $cron$
);
