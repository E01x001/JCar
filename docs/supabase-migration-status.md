# Supabase 이전 현황 & 잔여 과제 (2026-08-15)

> Firebase → Supabase 이전이 어디까지 됐고, **무엇이 아직 안 됐는지**를 코드 기준으로 확인한 결과.
> 결론: **데이터 레이어는 완전 전환됐으나 "완전 이전"은 아니다** — 푸시 알림이 조용히 죽어 있음.
>
> 관련: [supabase-migration-readiness.md](supabase-migration-readiness.md) · [PRE_DEPLOY_REVIEW_2026-07-07.md](PRE_DEPLOY_REVIEW_2026-07-07.md) · [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)

---

## 한눈에 보기

| 영역 | 상태 | 비고 |
|---|---|---|
| DB (7개 컬렉션 → 테이블) | ✅ 완료 | RLS + 트리거 가드 |
| Auth (이메일/비번) | ✅ 완료 | 이메일 인증이 UI-only → 실동작 |
| Storage (차량 이미지) | ✅ 완료 | `vehicles` 버킷 |
| 차량/상담/관리자/계정 화면 | ✅ 완료 | src에 firestore/auth/functions/storage import **0건** |
| CarZen 프록시 | ✅ Edge Function | `get-vehicle-info` |
| 계정 삭제 | ✅ Edge Function | `cascade-delete-user`(30일 유예 소프트삭제), `purge-deleted-accounts`(만료 시 익명화) |
| **푸시 알림 (FCM 트리거 6종)** | ❌ **죽어 있음** | 아래 상세 |
| **상담 레이트리밋** | ⚠️ **스텁** | 항상 통과 |
| **계정 복구 (30일 내)** | ❌ 미구현 | 안내 문구와 불일치 |
| **영구삭제 스케줄러** | ❌ 미구현 | pg_cron 필요 |
| FCM 발급 / Crashlytics / Analytics | ✅ 의도된 Firebase 잔류 | 하이브리드 설계 |

---

## 🔴 최우선: 푸시 알림 전부 발화하지 않음

`functions/triggers/` 의 알림 트리거가 **전부 Firestore 문서 변경 트리거**(`onDocumentUpdated`, `firebase-functions/v2/firestore`)로 작성돼 있다.

| 함수 | 파일 |
|---|---|
| `onConsultationApproved` | consultationNotifications.js:22 |
| `onConsultationRejected` | consultationNotifications.js:87 |
| `onAlternativeSlotsSuggested` | consultationNotifications.js:150 |
| `onConsultationCompleted` | consultationNotifications.js:212 |
| `onAdminMemoUpdated` | consultationNotifications.js:277 |
| `onVehicleStatusChanged` | vehicleNotifications.js:23 |

앱은 더 이상 Firestore에 쓰지 않으므로 **이 6개는 영원히 발화하지 않는다.**

**위험한 점**: FCM 토큰 발급·저장(`profiles.fcm_token`)·수신 핸들러(App.js)는 전부 정상 동작하므로 **에러가 전혀 나지 않는다.** 로그·크래시리포트에 아무 흔적이 없고, 단지 알림이 오지 않을 뿐이라 실기기 테스트에서도 놓치기 쉽다.

**영향**: 상담 승인/거절/완료가 사용자에게 전달되는 **유일한 경로**가 끊긴 상태. 사용자는 앱을 직접 열어 확인해야만 알 수 있다.

**해결 방향**: `consultation_requests` / `vehicles` 의 상태 변경에 붙는 **Postgres 트리거 → Edge Function → FCM HTTP v1 API** 호출 체인으로 재구축. 기존 메시지 본문·데이터 페이로드(딥링크용 `screen`/`consultationId`/`vehicleId`)는 `functions/utils/fcm.js`와 트리거 파일에서 그대로 가져올 수 있다. FCM 발급 자체는 Firebase에 남으므로 서버 인증은 서비스 계정 키(Supabase Secrets)로 처리.

---

## ⚠️ 기능 공백 (출시 전 처리 권장)

### 1. 상담 레이트리밋이 스텁
`src/services/consultation/consultationService.js` — `checkConsultationRateLimit()`이 `return { allowed: true }`로 무조건 통과.
- 기존 Firebase `checkConsultationRateLimit`(5회/시간)은 더 이상 호출되지 않음
- 현재 남용 방지는 DB 부분 UNIQUE 인덱스뿐 — **서로 다른 차량·시간이면 무제한 신청 가능**
- 해결: 상담 생성을 Edge Function으로 묶어 서버에서 강제(배포점검에서 지적된 "클라 우회 가능" 문제도 함께 해결됨)

### 2. 계정 복구 경로 없음
- `cascade-delete-user`는 30일 유예 소프트삭제를 정상 수행하고, 앱은 **"30일 이내 복구 시 데이터 그대로 복원"** 이라고 안내함
- 그러나 `recover-deleted-user`에 해당하는 Edge Function도, 관리자 복구 UI도 **존재하지 않음** (grep 결과 참조 0건)
- 즉 **안내 문구와 실제 동작이 불일치**. 복구를 구현하거나 문구를 수정해야 함

### 3. 영구삭제 스케줄러 없음
- `profiles.permanent_delete_date`는 기록되지만 그 날짜에 실제로 지우는 주체가 없음
- 기존 Firebase `scheduledPermanentDelete` 대체 필요 → **pg_cron** + 정리 함수
- 미구현 시 탈퇴 데이터가 무기한 잔존 (개인정보 보관 이슈)

---

## 🧹 잔재 (기능엔 무해하나 정리 필요)

### 미사용 npm 패키지 5종
`package.json`에 남아 있으나 src에서 더 이상 import되지 않음:
`@react-native-firebase/auth`, `firestore`, `functions`, `storage`, `perf`
→ 앱 번들/네이티브 빌드 용량만 차지. 제거 시 네이티브 재빌드 필요.

### 실제 사용 중인 Firebase (유지 대상)
| 패키지 | 사용처 |
|---|---|
| `messaging` | App.js, AuthContext.js, fcmService.js |
| `crashlytics` | ErrorBoundary.js, notificationService.js, AdminPageScreen.js |
| `analytics` | CompleteDealModal.js |
| `app` | 위 3종의 기반 |

### 남아 있는 Firebase 자산
- `functions/` 9개 파일 — **아직 Firebase에 배포된 상태일 가능성**. 특히 `carzenProxy`는 Supabase Edge Function과 중복이라 **양쪽 과금 위험**. 언디플로이 검토 필요
- `firestore.rules`, `storage.rules` — 더 이상 의미 없음(참조하는 DB가 비어 있음)
- `firebase.json`, `.firebaserc` — FCM/Crashlytics 유지용으로 일부 필요
- `android/app/google-services.json` — **FCM에 필수, 반드시 유지**

---

## ✅ 완료된 작업 (참고)

| 커밋 | 내용 |
|---|---|
| `1c2e844` | Phase 1 — 프로젝트 생성(`thorgkxpbhsttgskhepu`, 서울) + 스키마/RLS + RN 클라이언트 |
| `cfc17e0` | Phase 2a — Auth 전환 |
| `19a8e13` | Phase 2b — 차량 데이터/이미지/CarZen |
| `1ae650a` | Phase 2c — 상담/관리자/계정 + Firestore 결합 제거 |
| `de8df7d` | 리뷰 반영 — 크래시/계정삭제/RLS 하드닝 |

**마이그레이션 5개**: 초기 스키마 · realtime publication · 관리자 정책/RPC · 거래완료 RPC · 리뷰 하드닝
**RPC 3종**: `is_slot_taken`, `mark_vehicle_acquiring`, `complete_sell_consultation`(멱등)
**Edge Function**: `get-vehicle-info`, `cascade-delete-user`, `purge-deleted-accounts`, `send-push-notification`

배포점검(2026-07-07)의 🔴 7건 중 **C1(가격 DB 노출)이 이전으로 근본 해결**됨 — 가격은 `vehicle_pricing` 테이블의 admin 전용 RLS로 보호.

---

## 권장 처리 순서

1. **🔴 알림 트리거 재구축** — 유일한 기능 회귀. 출시 전 필수
2. **⚠️ 레이트리밋 Edge Function** — 상담 생성 서버 경유로 묶으면 함께 해결
3. **⚠️ 계정 복구 + pg_cron 영구삭제** — 안내 문구와 동작 일치
4. **실기기 스모크 테스트** — 특히 **이미지 업로드 0바이트 여부**(RN Blob 이슈, 방어 코드는 적용됨), 가입 확인 메일 수신
5. **Supabase Auth 이메일 템플릿/Site URL** 설정 — 확인·재설정 링크 랜딩
6. **🧹 잔재 정리** — Firebase 함수 언디플로이 → 미사용 패키지 제거 → rules 파일 삭제 (마지막)

---

## 운영 메모

- 프로젝트는 **무활동 7일 후 자동 일시정지**됨. 재개: Management API `POST /v1/projects/{ref}/restore` (CLI 토큰은 Windows 자격증명 관리자 `Supabase CLI:supabase`)
- 마이그레이션 파일을 bash heredoc으로 쓰면 **0바이트가 되는 사례가 2회** 발생 → Write 도구로 작성할 것. 빈 파일이 적용됐다면 `supabase migration repair <version> --status reverted` 후 재push
- DB 비밀번호: 레포 루트 `.supabase-db-password.txt` (gitignore됨)
