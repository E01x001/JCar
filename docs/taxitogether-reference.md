# Taxitogether 참조 분석 — 푸시 재구축 설계 & 도입 후보 (2026-08-15)

> 형제 프로젝트 `C:\Texitogether`(Expo + Supabase, 마이그레이션 66개)를 분석해
> **JCar 푸시 알림 재구축의 설계 근거**와 **함께 도입할 가치가 있는 구조**를 정리한다.
>
> 배경: [supabase-migration-status.md](supabase-migration-status.md) — 이전 후 푸시 트리거 6종이 죽어 있음(🔴)
>
> **전제 차이**: Taxitogether는 **Expo**(Expo Push API), JCar은 **RN CLI + FCM 직접**.
> 아래 추천 항목은 전부 **Supabase 서버 쪽**이라 이 차이의 영향을 받지 않는다.
> 단 푸시 발송 API만은 반드시 FCM으로 치환해야 한다(§1.3).

---

## 1. 푸시 알림 아키텍처 (채택 대상)

### 1.1 전체 흐름

```
비즈니스 이벤트 (RPC / 상태변경 트리거)
    │
    └─→ INSERT public.notifications 한 줄
            │
            └─→ AFTER INSERT 트리거 (on_notification_created) ── 단 하나
                    │
                    └─→ pg_net.http_post
                            │
                            └─→ Edge Function (send-push-notification)
                                    │
                                    └─→ 푸시 API (JCar: FCM HTTP v1)
```

**핵심: `notifications` 테이블이 허브.** 비즈니스 로직은 푸시를 전혀 모른다.
알림 한 줄을 INSERT하면 발송은 자동으로 일어난다.

### 1.2 기존 Firebase 방식 대비 이점

| | 기존(Firestore 트리거 6종) | 신규(notifications 허브) |
|---|---|---|
| 발송 경로 | 트리거마다 각자 FCM 호출 | **단일 경로** — 재시도·로깅·문구정책 일원화 |
| 인앱 알림센터 | 별도 구현 필요 | **자동으로 딸려옴** (`read` 컬럼 → 안읽음 배지) |
| 알림 이력 | 없음(휘발) | 테이블에 영속 |
| 신규 알림 추가 | 트리거 함수 신설 | INSERT 한 줄 |

> 로드맵 Phase 8.5의 **"인앱 알림 센터(FCM 히스토리)"** 항목이 이 구조 채택만으로 해결된다.

### 1.3 참조 원본 & JCar 치환 지점

| 요소 | Taxitogether 원본 | JCar 적용 |
|---|---|---|
| 트리거 | `supabase/migrations/20260512000000_push_notification_trigger.sql` | 거의 그대로 |
| Edge Function | `supabase/functions/send-push-notification/index.ts` | **발송부만 교체** |
| 발송 API | Expo Push (`https://exp.host/--/api/v2/push/send`) | **FCM HTTP v1** |
| 토큰 컬럼 | `profiles.push_token` | `profiles.fcm_token` (이미 존재) |
| 이벤트 연결 예시 | `20260514000000_add_event_notifications.sql` | 상담/차량 상태 변경 |

**⚠️ 유일한 난이도 상승 지점 — FCM 인증**
Expo Push는 토큰만 있으면 되지만, **FCM HTTP v1은 OAuth2 액세스 토큰이 필요**하다.
Edge Function 안에서 서비스 계정으로 JWT를 서명 → 토큰 교환 → 캐싱해야 한다.
서비스 계정 JSON은 Supabase Secrets에 보관. (Taxitogether도 동일 경로로 키를 확보:
루트의 `texitogether-*-firebase-adminsdk-*.json`)

### 1.4 반드시 따라야 할 설계 판단 4가지

**① 푸시 실패가 비즈니스 트랜잭션을 막지 않는다**
```sql
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'push_notification: error sending push — %', SQLERRM;
  RETURN NEW;   -- 알림 INSERT 자체는 성공시킨다
```
상담 승인이 푸시 오류로 롤백되면 안 된다.

**② 시크릿은 Vault에 (`vault.decrypted_secrets`)**
마이그레이션 파일에 크레덴셜을 넣지 않는다. 원본 주석의 이유가 정확하다 —
"레포가 크레덴셜을 갖지 않게, 그리고 **복원/브랜치된 DB가 작동하는 키를 상속하지 않게**".

**③ Vault가 없으면 graceful skip**
로컬/브랜치 DB에서 마이그레이션이 깨지지 않는다. `RAISE WARNING` 후 `RETURN NEW`.

**④ 저가치 이벤트는 인앱 행 없이 푸시만 (또는 아예 제외)**
`20260611000001_chat_push_only_no_inapp_rows.sql` — 리뷰 #48에서 발견한 실제 사고 기록:
> "메시지마다 notifications 행 삽입 → Alerts 탭 오염, 메시지마다 안읽음 배지 증가,
> 클라이언트 realtime 구독이 메시지마다 안읽음 수를 재조회"

**JCar 적용**: 관리자 메모 수정처럼 사용자 가치가 낮은 이벤트는 인앱 행을 만들지 않거나
알림 자체를 제외한다. 기존 Firebase 트리거 6종을 무비판적으로 1:1 이식하지 말 것.

### 1.5 JCar 알림 대상 (기존 트리거에서 이관)

| 기존 함수 | 이벤트 | 인앱 행 | 비고 |
|---|---|---|---|
| `onConsultationApproved` | 상담 승인 | ✅ | 사용자 가치 최상 |
| `onConsultationRejected` | 상담 거절 | ✅ | 재신청 유도 |
| `onConsultationCompleted` | 거래 완료 | ✅ | |
| `onAlternativeSlotsSuggested` | 대체시간 제안 | ✅ | 액션 필요 |
| `onAdminMemoUpdated` | 관리자 메모 수정 | ❓ | **저가치 — §1.4④ 검토 대상** |
| `onVehicleStatusChanged` | 차량 상태 변경 | ✅ | 판매자 대상 |

메시지 본문·딥링크 페이로드(`screen`/`consultationId`/`vehicleId`)는
기존 `functions/triggers/*.js`와 `functions/utils/fcm.js`에서 그대로 가져올 수 있다.

### 1.6 notifications 테이블 스키마 (원본)

```sql
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
JCar은 여기에 RLS(본인 행만 select/update read 플래그) 추가 필요.

---

## 2. 함께 도입할 가치가 큰 것

### 🥇 purge-deleted-accounts + pg_cron — JCar 미구현 과제 직결
원본: `supabase/migrations/20260801000003_schedule_purge.sql` + `supabase/functions/purge-deleted-accounts/`

[supabase-migration-status.md](supabase-migration-status.md)의 **"영구삭제 스케줄러 없음"**을 정확히 푸는 레퍼런스.

설계 요점:
- **SQL로 못 하는 일(auth 사용자 삭제)은 Edge Function이, pg_cron은 HTTP 호출만** 한다
- Vault(`project_url`, `purge_secret`) + `PURGE_SECRET` 이중 인증
- **시크릿이 없으면 스케줄을 아예 안 건다** → 마이그레이션 선적용이 무해

### 🥈 purge_old_notifications — 알림 30일 자동 만료
원본: `supabase/migrations/20260731000001_notification_cleanup.sql`

알림 테이블 무한 증식 방지. 판단 근거가 좋다:
> "사용자 노출 삭제는 **읽은 알림으로 한정**. 안 읽은 것을 지우면 놓친 정산 요청이나
> 강퇴 통지가 묻힐 수 있고 **손실이 비대칭**이다 — 안 읽은 꼬리는 30일 잡이 처리."

### 🥉 pgTAP DB 테스트 (`supabase/tests/`)
JCar은 DB 테스트 **0건**. 이번 이전으로 비즈니스 로직의 핵심이 RLS·트리거·RPC로 내려갔는데
jest 57개는 이를 **하나도 검증하지 못한다.**

우선 테스트할 것:
1. **가격 비공개 RLS** — 일반 사용자로 `vehicle_pricing` 조회 시 0행
2. **이중예약 부분 UNIQUE** — 동일 슬롯 2번째 INSERT가 23505로 거부
3. **상태전이 가드 트리거** — 비관리자의 금지된 전이가 예외 발생

### 문서 체계 (`docs/architecture/`)
원본에 분리돼 있는 것: `rpc-contracts.md` · `state-machine.md` · `state-catalog.md` ·
`database-design.md` · `domain-field-catalog.md`

JCar은 **상담 8-state**와 **차량 dealStage 4단계**가 있는데 상태 기계 문서가 없어,
이전 작업 중 매번 코드를 뒤져 확인해야 했다.
`ENGINEERING.md`의 **"빠른 참조: 이럴 때는 이렇게"** 섹션도 일관성 유지에 좋은 패턴.

### 출시 준비물 (템플릿으로 활용)
`PLAY_DATA_SAFETY.md` · `privacy-policy.md`(한/영) · `terms-of-service.md`(한/영) ·
`DEPLOYMENT_CHECKLIST.md` · `TESTING_CHECKLIST.md` · `SECURITY_BEST_PRACTICES.md`

JCar도 스토어 출시에 전부 필요하며, 원본을 템플릿으로 쓰면 작업이 크게 단축된다.

---

## 3. 권장 진행 순서

1. **`notifications` 테이블 + RLS + 단일 트리거 + FCM v1 Edge Function** ← 여기부터
2. **JCar 이벤트 6종을 알림 INSERT로 연결** (저가치 알림은 §1.4④ 기준으로 선별)
3. 알림 30일 만료 잡
4. purge 패턴으로 영구삭제 스케줄러
5. pgTAP 테스트 (특히 가격 RLS)

①~②만으로 죽어 있는 알림이 살아나고 **인앱 알림센터 기반까지 확보**된다.
