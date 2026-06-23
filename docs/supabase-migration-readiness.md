# Supabase 이전 대비 — 데이터 구조 & 결합 지점 정리

> 목적: 추후 **Firebase → Supabase** 이전을 쉽게 하기 위해 현재 데이터 모델/변수/코드 결합 지점을 정리하고
> Supabase(Postgres + Auth + Storage + Edge Functions + Realtime) 매핑을 미리 잡아둔다.
> 작성 시점 기준 실제 코드에서 수집한 내용. (이전 작업 시 이 문서를 1차 참조로 사용)

---

## 1. 현재 Firebase 사용 표면 (Surface)

| Firebase 서비스 | 용도 | Supabase 대응 |
|---|---|---|
| **Auth** (email/password) | 로그인·회원가입(서버 생성), 정지 체크 | **Supabase Auth** (email/password) |
| **Firestore** | 모든 도큐먼트 DB (7 컬렉션) | **Postgres** (테이블 + RLS) |
| **Storage** | 차량 이미지 (`vehicles/*`) | **Supabase Storage** (bucket) |
| **Cloud Functions** | 트리거 6 + Callable 5 + 스케줄 1 | **Edge Functions** + **DB Triggers/pg_cron** |
| **Realtime (onSnapshot)** | 차량/상담 실시간 구독 | **Supabase Realtime** |
| **FCM (messaging)** | 푸시 알림 | 별도 푸시 공급자(Expo Push/OneSignal/FCM 직접) — Supabase는 푸시 미제공 |

### 코드 결합 지점 (src 기준, 45개 파일)
- `@react-native-firebase/firestore` — **35개 파일** (가장 큼)
- `@react-native-firebase/auth` — 11개
- `@react-native-firebase/functions` — 6개
- `@react-native-firebase/storage` — 3개
- `@react-native-firebase/messaging` — 3개

> **권고(이전 난이도 직결)**: 화면이 Firebase SDK를 직접 부르는 곳이 많을수록 이전이 어렵다.
> 이전 전에 **데이터 접근 추상화 레이어**(`src/data/*` 또는 기존 `services/` 일원화)를 만들어
> 화면→service→(firebase|supabase) 구조로 바꾸면, 이전 시 service 내부만 교체하면 된다.
> 현재 `services/`가 일부 그 역할을 하나, 화면/스토어가 firestore를 직접 import하는 곳이 많음(35파일).

---

## 2. 데이터 모델 (컬렉션 → 제안 Postgres 테이블)

> 규칙 제안: JS는 camelCase, Postgres는 **snake_case** 관례. 이전 시 매핑 레이어에서 변환하거나,
> 이전을 기회로 **DB는 snake_case, 앱 경계에서 매핑**으로 통일 권장. 아래는 현재 필드(camelCase) 기준.

### 2.1 `users`
| 필드 | 타입 | 비고 |
|---|---|---|
| uid (PK) | string | Auth uid = 행 PK (Supabase: `auth.users.id` FK) |
| name | string | |
| email | string | |
| phoneNumber | string | **전화번호 중복 검사**에 사용(가입 시) → Postgres `UNIQUE` 제약으로 대체 가능 |
| role | 'user' \| 'admin' | |
| status | 'active' \| 'suspended' | 정지 시 강제 로그아웃(AuthContext) |
| statusUpdatedAt | timestamp | |
| fcmToken | string | 푸시 토큰 |
| createdAt | timestamp | |
| (소프트삭제) deleted, deletedAt, permanentDeleteDate | bool/timestamp | cascadeDeleteUser(태스크 126) — 30일 후 영구삭제 |

### 2.2 `vehicles` (+ 서브컬렉션 `vehicles/{id}/private/contact`)
**공개 도큐먼트** (구매자 노출):
vehicleId(PK), vehicleName, subModel, manufacturer, year, driveType, fuelType, price, cc,
transmission, fuelEco, fuelTank, seats, battery, frontTire, rearTire, engineOilLiter, wiperInfo,
imageUrls(string[]), imageUrl(string, 레거시 단일), vehicleType, businessRightsIncluded(bool),
licenseInfo(string), status('pending'|'approved'|'rejected'|'sold'), dealStage, hidden(bool),
isAdminOwned(bool), sellerId(레거시), currentOwnerId, createdAt
- **mileage(주행거리)**: 타입 정의엔 있으나 **실제 저장 안 됨**(CarZen 미제공). [[backlog-mileage-input]]

**비공개 서브도큐먼트** `private/contact` (소유자/관리자만):
sellerId, sellerName, sellerPhone, sellerEmail, ownerName, regiNumber, vin
- **Postgres 매핑**: 서브컬렉션 → 별도 테이블 `vehicle_private_contact(vehicle_id FK, ...)` + RLS로 owner/admin만.
- PII 분리 정책(태스크 125) 유지: 공개 테이블엔 PII 제외, 비공개 테이블 분리.

**가격 가시성 규칙**(중요): 가격은 **관리자만** 조회(일반 사용자는 "상담 후 안내"). `utils/vehiclePrice.canViewVehiclePrice` = admin only.

### 2.3 `consultation_requests`
id(PK), userId(FK→users), vehicleId(FK→vehicles), type('buy'|'sell'),
consultationStatus('pending'|'approved'|'rejected'|'completed'|'cancelled'|'archived'|'meeting'),
preferredDate(string), preferredTime(string), userName, vehicleName, adminMemo,
rejectionReason, alternativeSlots(jsonb: [{date,time}]), isOwnershipTransferred(bool),
transferId(FK→ownership_transfers, nullable), createdAt
- **중복/충돌 검사**: userId+vehicleId 중복, vehicleId+preferredDate+preferredTime 충돌 → Postgres 인덱스/제약으로 강화 가능.

### 2.4 `ownership_transfers` (C2B2C 소유권 이전)
transferId(PK), vehicleId(FK), consultationId(FK, nullable), fromUserId(nullable),
toUserId(nullable), transferType('sell_to_admin'|'admin_to_buyer'), price, transferredAt, notes
- 차량의 `ownershipHistory[]`(차량 도큐먼트 내 배열) ↔ 이 테이블. Postgres에선 **이 테이블이 정본**, 배열은 비정규화 제거 가능.

### 2.5 `ownership_transfer_audit_logs`
소유권 이전 감사 로그(불변). Postgres: append-only 테이블 + RLS(admin read).

### 2.6 `admin_owned_vehicles`
vehicleId(FK), vehicleName, purchasePrice, acquiredAt, soldTo(nullable), soldPrice(nullable), soldAt(nullable)
- J-Car(관리자)가 매입 보유 중인 차량 풀.

### 2.7 `admin_activity_log`
adminUid, action(예: suspend_user/activate_user), targetUserId, targetUserName, previousStatus, newStatus, timestamp
- 관리자 활동 감사. Postgres: append-only.

---

## 3. Cloud Functions → Supabase Edge Functions / DB

| 현재 함수 | 종류 | Supabase 대응 |
|---|---|---|
| `registerUser` | Callable | Edge Function (전화번호 중복은 `UNIQUE` 제약 + Auth signUp) |
| `getVehicleInfo` (CarZen 프록시) | Callable | Edge Function (API 키는 Supabase Secrets) |
| `checkConsultationRateLimit` | Callable | Edge Function 또는 Postgres 함수 |
| `cascadeDeleteUser` / `recoverDeletedUser` | Callable | Edge Function (소프트삭제) |
| `scheduledPermanentDelete` | Scheduled | **pg_cron** + 함수 |
| `onConsultationApproved/Rejected/Completed/AlternativeSlotsSuggested/AdminMemoUpdated` | Firestore 트리거 | **Postgres 트리거** 또는 Realtime+Edge, 알림은 푸시 공급자 호출 |
| `onVehicleStatusChanged` | Firestore 트리거 | Postgres 트리거 |

- **알림(FCM)**: 트리거가 FCM 발송(`functions/utils/fcm.js`). Supabase엔 푸시 없음 → 푸시 공급자 유지/교체 필요(가장 손이 많이 가는 부분).

---

## 4. 이전 시 주의점 (Gotchas)

1. **Realtime 모델 차이**: Firestore `onSnapshot`(차량 상세/목록/마이페이지) → Supabase Realtime은 Postgres 변경 구독. 쿼리/필터 방식이 달라 구독 코드 재작성 필요.
2. **타임스탬프**: `serverTimestamp()`/Firestore Timestamp → Postgres `timestamptz` + `now()`. 클라 표시 로직(`formatDate`)도 점검.
3. **보안 규칙 → RLS**: Firestore rules를 **Postgres RLS 정책**으로 재작성. 특히 vehicles 공개/비공개 분리, 가격 가시성(admin), 정지 계정.
4. **낙관적 업데이트**: `utils/optimisticHelpers`, store(zustand) — DB 교체와 무관하게 유지되나 write 경로만 교체.
5. **서브컬렉션 없음**: `vehicles/{id}/private/contact` → FK 테이블로 평탄화.
6. **배열 필드**: `imageUrls`, `alternativeSlots`, `ownershipHistory` → Postgres `text[]`/`jsonb` 또는 정규화 테이블.
7. **Auth uid**: 현재 `users.uid` = Firebase Auth uid. Supabase Auth는 UUID. 사용자 마이그레이션 시 **uid 매핑 테이블** 필요(기존 계정 보존).
8. **이메일 인증**: 현재 미강제(회원가입 2단계는 UI만). Supabase 이전 시 Supabase Auth의 이메일 인증을 정식 도입할 좋은 기회.

---

## 5. 지금 해두면 좋은 준비 작업 (저위험)

- [ ] **데이터 접근 추상화**: 화면/스토어의 직접 `firestore` import(35파일)를 `services/`로 흡수 → 이전 시 service만 교체.
- [ ] **필드 단일 출처**: `src/types/firestore.js`를 실제 저장 필드와 일치하도록 갱신(현재 mileage 등 불일치 존재). 이 문서와 동기화.
- [ ] **상수화**: 컬렉션명/상태값/enum을 `constants/`에 모아 문자열 산재 제거(이전 시 일괄 교체 용이).
- [ ] **naming 정책 결정**: DB snake_case + 경계 매핑 vs 현행 camelCase 유지 — 이전 전에 확정.
- [ ] **PII 분리 정책 문서화**: 공개/비공개 필드 경계(태스크 125)를 RLS 설계 입력으로.

---

## 6. 컬렉션 요약 (빠른 참조)
`users` · `vehicles`(+`private/contact`) · `consultation_requests` · `ownership_transfers` ·
`ownership_transfer_audit_logs` · `admin_owned_vehicles` · `admin_activity_log`

관련 메모: [[firebase-functions]] · [[codebase-architecture]]
