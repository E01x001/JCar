-- 상담 요청 레이트리밋(S3) + 스토리지 하드닝(S2)
--
-- 두 건 모두 "클라이언트가 방어한다고 믿고 있었지만 실제로는 아무것도 막지 않던" 항목이다.

-- ============================================================
-- 1) 상담 요청 레이트리밋
-- ============================================================
-- 기존 checkConsultationRateLimit()은 항상 { allowed: true }를 반환하는 스텁이었고,
-- 화면은 그 값을 믿고 "요청 제한" 분기까지 갖추고 있었다. 즉 방어가 있는 것처럼 보였다.
--
-- DB UNIQUE 제약은 "같은 차량·같은 시간"만 막는다. 서로 다른 차량/시간으로 쏟아붓는
-- 대량 요청은 그대로 통과해 관리자 일정을 채울 수 있다.
--
-- 최종 방어는 트리거에 둔다 — 클라이언트가 우회할 수 있는 위치에 두면 의미가 없다.
-- 화면 사전 안내용 RPC(consultation_quota)는 UX를 위한 것이지 방어가 아니다.

create or replace function app_private.consultation_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hour  int;
  v_day   int;
begin
  -- 관리자와 서버(service_role, auth.uid() null)는 제한하지 않는다
  if app_private.is_admin() or (select auth.uid()) is null then
    return new;
  end if;

  select count(*) into v_hour
    from public.consultation_requests
   where user_id = new.user_id
     and created_at > now() - interval '1 hour';

  if v_hour >= 5 then
    raise exception 'rate_limit_hour'
      using hint = '1시간에 최대 5건까지 상담을 신청할 수 있습니다.';
  end if;

  select count(*) into v_day
    from public.consultation_requests
   where user_id = new.user_id
     and created_at > now() - interval '24 hours';

  if v_day >= 20 then
    raise exception 'rate_limit_day'
      using hint = '하루에 최대 20건까지 상담을 신청할 수 있습니다.';
  end if;

  return new;
end;
$$;

drop trigger if exists consultation_rate_limit on public.consultation_requests;
create trigger consultation_rate_limit
  before insert on public.consultation_requests
  for each row execute function app_private.consultation_rate_limit();

-- 화면 사전 안내용(방어 아님) — 남은 신청 가능 건수
create or replace function public.consultation_quota()
returns table (remaining_hour int, remaining_day int)
language sql
stable
security definer
set search_path = ''
as $$
  select
    greatest(0, 5 - (select count(*)::int from public.consultation_requests
                      where user_id = (select auth.uid())
                        and created_at > now() - interval '1 hour')),
    greatest(0, 20 - (select count(*)::int from public.consultation_requests
                       where user_id = (select auth.uid())
                         and created_at > now() - interval '24 hours'));
$$;

grant execute on function public.consultation_quota() to authenticated;

-- ============================================================
-- 2) 스토리지 하드닝
-- ============================================================
-- 기존 insert 정책은 bucket_id만 확인했다. 경로를 사용자별로 묶지 않아
-- 소유자 추적이 불가능했고, 크기·형식 제한도 없어 로그인만 하면 임의 파일을
-- 무제한 올릴 수 있었다(스토리지 비용 남용 경로).
--
-- 또한 delete 정책이 없어 클라이언트의 정리 호출이 항상 실패했다.
-- 업로드가 부분 실패했을 때의 롤백이 조용히 죽어 고아 파일이 쌓인다.
-- 주의: 이것은 "차량 기록 보존" 정책과 무관하다 — 레코드가 되지도 못한 조각들이다.

update storage.buckets
   set file_size_limit   = 10485760,  -- 10MB
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'vehicles';

-- 업로드: 본인 폴더({uid}/...)에만 허용
drop policy if exists "vehicle_images_insert" on storage.objects;
create policy "vehicle_images_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vehicles'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 삭제: 본인이 올린 파일만. 업로드 실패 롤백과 사용자 주도 정리를 위해 필요하다.
-- 이미 차량 레코드에 연결된 이미지는 앱이 지우지 않으므로 기록 보존과 충돌하지 않는다.
drop policy if exists "vehicle_images_delete" on storage.objects;
create policy "vehicle_images_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vehicles'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or app_private.is_admin()
    )
  );

-- update 정책은 두지 않는다 — 덮어쓰기로 이미지를 바꿔치기할 수 없게 한다.
