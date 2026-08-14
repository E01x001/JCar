-- 알림 허브 테이블 (푸시 재구축 ②)
--
-- 설계: docs/taxitogether-reference.md
-- 비즈니스 로직은 푸시를 모른다. 여기에 행을 INSERT하면 발송은 자동으로 일어난다
-- (③ push_dispatch의 AFTER INSERT 트리거). 동시에 이 테이블이 인앱 알림센터의
-- 데이터 소스가 된다.
--
-- 아웃박스: push_status/attempts/pushed_at/error 컬럼으로 전달 상태를 추적한다.
-- 트리거→pg_net은 빠른 경로일 뿐이고, 실패하면 ⑥의 pg_cron 잡이 재시도한다.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,

  -- 알림 종류. 인앱 필터·향후 종류별 수신설정의 기준이 된다.
  -- 알려진 값: consultation_approved / consultation_rejected / consultation_completed /
  --            consultation_slots_suggested / vehicle_approved / vehicle_rejected
  -- CHECK 제약을 일부러 걸지 않았다: 알림 INSERT는 상태변경과 같은 트랜잭션에서 일어나므로
  -- 여기서 제약 위반이 나면 상담 승인 자체가 롤백된다. 알림 문제가 비즈니스를 막아선 안 된다.
  type text,

  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read boolean not null default false,

  -- ── 아웃박스(전달 상태) ───────────────────────────────────────────────
  push_status text not null default 'pending'
    check (push_status in ('pending', 'sent', 'failed', 'skipped')),
  push_attempts int not null default 0,
  pushed_at timestamptz,
  push_error text,

  created_at timestamptz not null default now()
);

-- 인앱 목록: 최신순 조회
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- 안읽음 배지 카운트
create index notifications_unread_idx
  on public.notifications (user_id) where read = false;

-- ⑥ 재시도 잡이 훑는 경로
create index notifications_pending_idx
  on public.notifications (created_at) where push_status = 'pending';

alter table public.notifications enable row level security;

-- 조회: 본인 알림만
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- 수정: 본인 행만. 컬럼 그랜트로 read 플래그 외 변경을 차단한다
-- (관리자가 남의 알림을 고칠 일이 없어 트리거 가드 대신 컬럼 그랜트로 충분하다).
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

-- 삭제: 본인 알림 정리
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- INSERT 정책 없음 = 클라이언트 삽입 금지.
-- 알림 생성은 ④의 상태전이 트리거(SECURITY DEFINER)와 service_role만 가능하다.
