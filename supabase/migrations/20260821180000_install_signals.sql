-- 앱 설치 출처 기록 (기록 전용 — 차단하지 않는다)
--
-- 목적: 2026-08-20의 자동 가입 9건이 어떤 경로로 들어왔는지 아직 특정하지 못했다.
-- 옵트인 링크는 이미 테스터 목록으로 제한되므로 유출로는 설치가 불가능하고,
-- 남은 유력 경로는 **설치된 APK를 추출해 다른 기기에 sideload** 하는 것이다.
--
-- 판별 신호로 Google Play install referrer를 쓴다:
--   Play로 설치 → referrer 문자열 존재
--   sideload    → 비어 있음
--
-- 한계를 분명히 해둔다: 이건 **위변조 방지 수단이 아니다.** 앱을 수정하면 얼마든지
-- 거짓 값을 보낼 수 있다. 지금 목적은 "차단"이 아니라 "가설 확인"이므로 충분하다.
-- 실제 차단이 필요해지면 Play Integrity API로 올려야 한다(현재 Expo/New Architecture
-- 호환 라이브러리가 없어 자체 config plugin 작성이 필요하다).

create table if not exists public.app_install_signals (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,

  -- 핵심 신호
  install_referrer   text,          -- 비어 있으면 sideload 의심
  from_play          boolean,       -- referrer 판정 결과(앱이 계산해 보냄)

  -- 맥락
  installed_at       timestamptz,
  app_version        text,
  device_brand       text,
  device_model       text,
  is_physical_device boolean,       -- false면 에뮬레이터

  created_at         timestamptz not null default now()
);

-- 사용자·버전당 1행이면 충분하다. 매 실행마다 쌓으면 노이즈만 는다.
create unique index if not exists app_install_signals_user_version_uniq
  on public.app_install_signals (user_id, coalesce(app_version, ''));

create index if not exists app_install_signals_created_idx
  on public.app_install_signals (created_at desc);

alter table public.app_install_signals enable row level security;

-- 기록: 본인 것만. 남의 기기 정보를 심을 수 없다.
create policy "install_signals_insert_own" on public.app_install_signals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- 조회: 관리자만. 사용자에게 보여줄 화면이 없다.
create policy "install_signals_select_admin" on public.app_install_signals
  for select to authenticated
  using (app_private.is_admin());

-- 수정/삭제 정책 없음 = 기록은 불변이다.

grant insert on public.app_install_signals to authenticated;
grant select on public.app_install_signals to authenticated;

comment on table public.app_install_signals is
  '앱 설치 출처 기록(기록 전용). install_referrer가 비어 있으면 sideload 의심. 위변조 방지 아님 — 차단이 필요하면 Play Integrity로 승격.';
