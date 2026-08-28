# JCar 배포 전 총점검 (2026-07-07)

> 4개 영역(인증/네비, 서비스/DB, 클라우드 함수/보안규칙, UI/가격게이팅)을 코드 수준으로 병렬 감사한 결과.
> 각 항목은 직접 코드 확인으로 검증됨. 범례: 🔴 출시 차단 · 🟡 출시 전 권장 · 🟢 후속.
> 관련 문서: [REVIEW_FINDINGS_2026-06-20.md](REVIEW_FINDINGS_2026-06-20.md) · [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)

---

## 요약 (must-fix 우선)

| # | 항목 | 심각도 | 위치 | 상태 |
|---|---|---|---|---|
| C1 | 가격/판매자 UID가 **모든 인증 사용자에게 DB 레벨로 노출** | 🔴 | firestore.rules:50-66 | ⬜ 미착수(구조 변경) |
| C2 | 상담신청 화면이 **일반 사용자에게 가격을 직접 렌더** | 🔴 | ConsultationRequestScreen.js:168 | ✅ 수정(0ae7d44) |
| C3 | 필터 모달 **가격대/가격정렬**로 가격 이진탐색 가능 | 🔴 | VehicleFilterModal.js | ✅ 수정(0ae7d44) |
| C4 | **시간슬롯 충돌검사가 활성경로에 없음** + 검증함수 필드버그 | 🔴 | consultationValidation.js | ✅ 수정(febb9f8) |
| C5 | 상담 예약 쓰기가 **비원자적** | 🔴 | consultationService.js | ✅ 슬롯 선점 배치(febb9f8) — **rules 배포 필요** |
| C6 | 스토어 리스너 **싱글턴** — 구독 공존 불가·누수 | 🔴 | vehicleStore/consultationStore | ✅ 수정(e103826) |
| C7 | 사용자 문서 없을 때 **인증됐는데 로그인 화면으로 튕김** | 🔴 | AuthContext.js | ✅ 수정(f50ad4e) — ForgotPassword 30초 잠금도 함께 |

---

## 🔴 출시 차단 (Critical)

### C1. 가격·판매자 UID가 모든 인증 사용자에게 DB 레벨로 노출
`firestore.rules:50-66` — `price`, `sellerId`, `currentOwnerId` 가 public `vehicles/{id}` 문서에 있고, read 규칙이 approved/listed 차량을 **모든 인증 사용자에게 전체 문서 읽기 허용**. 규칙 주석(55-57)도 "필드 단위 필터 불가 → 클라에서 걸러라"고 인정. 클라이언트 필터는 보안통제가 아님 — 누구든 Firestore SDK/REST로 직접 `price`를 읽을 수 있음. 자가가입(`registerUser`)이 열려 있어 "인증 사용자 ≈ 누구나".

**"가격은 관리자 상담으로만" 이라는 핵심 규칙이 데이터 레이어에서 미충족.** UI 게이팅(C2/C3 제외 대부분 정상)은 표면일 뿐.

**수정 방향**: `price`(및 잔여 판매자 식별자)를 `private/contact`처럼 **admin/owner 전용 서브컬렉션**으로 분리하거나, public(정제)·admin(상세) 2문서 구조. 가격은 admin 역할을 검사하는 서버 callable로만 해석. 이전 PII 분리(#125)가 phone은 옮겼지만 `sellerId`/`price`는 남겨 미완.

> Supabase 이전 시 RLS로 컬럼 단위 통제가 가능하므로 근본 해결과 연계 가능. 단, 그 전에 Firebase에서도 최소한 price를 서브컬렉션으로 빼는 것을 권장.

### C2. 상담신청 화면이 일반 사용자에게 가격을 직접 렌더 (UI 에이전트 누락, 직접 발견)
`ConsultationRequestScreen.js:168-169`
```js
<Text style={[styles.vehiclePrice, ...]}>
  {vehicle?.price ? `${vehicle.price.toLocaleString()}원` : '-'}
```
이 화면은 **일반 사용자가 구매/판매 상담을 신청할 때 진입**. `role` 게이팅 없이 원화 가격을 그대로 노출. C1과 함께 규칙 정면 위반.
**수정**: 미니카드에서 가격 행 제거 또는 `PRICE_HIDDEN_LABEL`('상담 후 안내')로 치환. `canViewVehiclePrice` 경유.

### C3. 필터 모달의 가격대/가격정렬로 가격 이진탐색 가능
`VehicleFilterModal.js` — "가격 범위(만원)" min/max 입력(100-124) + "가격 낮은순/높은순" 정렬(43-44)이 **역할 무관**하게 사용자 화면(`VehicleBrowseScreen.js:142`, `VehiclesListScreen.js:226`)에서 열림. 숫자 자체는 안 보여도, 사용자가 3000–3100만원식으로 좁혀 **실가격을 이진탐색**할 수 있음.
**수정**: `role !== 'admin'`일 때 가격대 섹션·가격정렬 옵션 숨기고, 비관리자 필터 객체에서 `minPrice/maxPrice/price_*` 제거 후 `subscribeToFilteredVehicles`에 전달. 두 화면 기본값 `sortBy:'price_asc'`도 비관리자는 다른 기본값으로.

### C4. 시간슬롯 충돌검사가 활성 경로에 없음 + 검증함수 필드버그
- `consultationValidation.js:18,38` — `checkDuplicateConsultation`/`checkTimeSlotConflict`가 존재하지 않는 `status` 필드를 쿼리(문서는 `consultationStatus` 저장). 항상 빈 결과 → 언제나 통과. `canModifyConsultation`/`canCancelConsultation`도 `consultation.status` 참조로 동일 결함.
- 그러나 실제 제출 경로(`ConsultationRequestScreen.js:50-63`)는 **자체 로컬 중복검사**(`consultationStatus||status`로 올바름)를 사용 → *같은 사용자의 같은 차량 중복*은 막힘.
- **핵심 공백**: `checkTimeSlotConflict`는 **어디서도 호출되지 않음**(grep 확인). 서로 다른 사용자의 **동일 슬롯 이중예약이 무방비**. 깨진 service 검증함수는 사실상 데드코드이며, 나중에 잘못 배선하면 회귀.
**수정**: service 검증함수를 `consultationStatus`로 고치고, 슬롯 충돌검사를 실제 쓰기 경로(가능하면 서버)에 연결. 미사용 데드 검증함수는 정리하거나 활성화.

### C5. 상담 예약 쓰기가 비원자적
`consultationService.js:68-120` `saveConsultationRequest` — 검증(읽기)과 `addDoc`(쓰기)가 분리·비트랜잭션. C4를 고쳐도 두 사용자가 동시에 같은 슬롯을 통과·기록 가능.
**수정**: 결정적 슬롯 문서ID(`vehicleId_date_time`) + `transaction.set`(존재 시 실패), 또는 트랜잭션 내 충돌 재조회.

### C6. 스토어 리스너 싱글턴 — 구독 공존 불가·누수
`vehicleStore.js:139,204,266` / `consultationStore.js:139,201` — 모든 subscribe가 **단일 `unsubscribe` 슬롯**과 `if(unsubscribe) return` 가드를 공유.
- 사용자 화면이 approved 구독 중이면 관리자의 `subscribeToAllVehicles`가 early-return → **관리자 뷰에 데이터 안 옴**(반대도).
- `subscribeToUserVehicles(A)` 후 `(B)` 호출 시 여전히 A 구독.
- 슬롯 덮어쓰기 경로에서 이전 리스너 **누수**.
**수정**: cacheKey/쿼리별 unsubscribe **맵**으로 관리.

### C7. 사용자 문서 없을 때 인증됐는데 로그인 화면으로 튕김
`AuthContext.js:59-77` — `userDoc.exists()`가 false면 `setUser/setRole` 미호출인데 `setLoading(false)`는 실행. 갓 가입해 `users/{uid}` 전파 전이거나 생성 실패한 인증 사용자가 `user===null`로 로그인 스택에 배치. else/에러 서피스 없음.
**수정**: 문서 없음 케이스 명시 처리(안내 후 로그아웃 또는 최소 user 세팅), 재시도/로깅.

---

## 🟡 출시 전 권장 (Moderate)

- **ForgotPassword 30초 제출 잠금 + 타이머 미정리** — `ForgotPasswordScreen.js:44-46` `finally`가 모든 결과에 대해 `isSubmitting`을 30초 후 해제. 에러 경로에서 사용자가 이유 없이 30초간 재시도 불가, 언마운트 후 setState. **수정**: `finally`에서 즉시 해제(성공 경로만 디바운스), 언마운트 시 타이머 clear.
- **딥링크 500ms 타이머 + 라우트/역할 미검증 + 콜드스타트 레이스** — `App.js:26-59` 고정 500ms 후 `navigate(data.screen)`. 비로그인/역할 불일치 라우트는 throw→로그만, 콜드스타트 시 네비 미마운트로 링크 유실. **수정**: `navigationRef.isReady()` 폴링 + `data.screen` 역할 화이트리스트.
- **`registerUser` App Check/레이트리밋 없음 + 이메일/전화 열거** — `registerUser.js:38-63` 미인증 호출 가능, 중복 전화/이메일 메시지가 달라 존재 여부 탐지 가능. **수정**: App Check + 레이트리밋, 중복은 단일 일반 메시지("가입할 수 없습니다").
- **상담 레이트리밋 우회 가능** — `rateLimit.js`는 클라가 선택 호출하는 별도 callable. 실제 쓰기는 rules(158-161)만 통제, 레이트체크 없음 → 클라가 직접 쓰면 5/시간 무력화. **수정**: 상담 생성을 레이트리밋 강제하는 서버 callable로 이동.
- **cascade/purge가 `currentOwnerId` 누락** — `cascadeDelete.js:117,327` / `permanentDelete.js:50,87`가 `sellerId`로만 필터. 소유권 이전된 차량이 숨김/복구/영구삭제에서 누락 → 고아 데이터. **수정**: `sellerId`·`currentOwnerId` 합집합 쿼리.
- **완료/이전 중복처리 가드 부재** — `consultationService.js:278-354` sell 트랜잭션에 이미 completed 체크 없음(ownershipTransferService는 가드 있음). 더블탭/재시도 시 `admin_owned_vehicles` 중복 생성·`purchasePrice` 재설정. `createAdminOwnedVehicle`(:476)와 트랜잭션 경로 중복(멱등키 없음). **수정**: 트랜잭션 읽기 단계에 상태 선조건, `consultationId`를 문서ID로.
- **무제한 쿼리/리스너** — 전체 컬렉션 구독(`subscribeToAllVehicles`, `subscribeToAllConsultations`)과 다수 쿼리에 `limit` 없음. 규모에 따라 읽기비용·메모리 선형 증가. **수정**: 관리자/전체 구독 최소한 페이지네이션·캡.
- **이미지 업로드 고아/충돌/무압축** — `imageService.js` `uploadMultipleImages`(36-46) `Promise.all`로 부분 실패 시 업로드된 파일 고아. `uploadImage`(15)는 원본 파일명 경로 → 동일명 충돌 덮어쓰기. `compressAndUploadImage`(97)는 압축 TODO no-op. **수정**: `allSettled`+정리, UUID 파일명, 실제 압축.
- **`canViewVehiclePrice` 미사용(SSOT 우회)** — `vehiclePrice.js` 정의됐으나 호출처 0. 모든 화면이 `role !== 'admin'` 인라인 재구현. **수정**: 모든 가격 게이팅을 `canViewVehiclePrice(vehicle, viewer)` 경유(C2/C3 수정과 함께).
- **`deleteUserAccount` 비원자적** — `accountService.js:33-54` Firestore 문서를 Auth보다 먼저 삭제, `requires-recent-login` 미처리 → 프로필 없는 고아 Auth 계정. **수정**: Auth 삭제 우선 또는 재인증 경로 처리.
- **접근성 라벨 전무** — `src/components` 전체에서 `accessibilityLabel/Role` 0건. 아이콘 전용 터치(필터 버튼, 뒤로 FAB, 모달 닫기)에 스크린리더 라벨 없음. **수정**: 주요 내비/모달 닫기부터 `accessibilityRole="button"`+라벨.
- **VehicleFilterModal 하드코딩 색상/오프브랜드** — 20곳 raw hex, iOS 블루(`#007AFF`) 사용(브랜드 `#2B4593` 아님). **수정**: `useTheme()` 토큰화.

---

## 🟢 후속 (Minor)

- `AuthContext.js:6`·`App.js:5` 미사용 `Alert` import.
- `RegisterScreen.js:59-62` "재전송" 버튼이 토스트만 띄우는 no-op — Step2 "인증 메일 보냈어요" 카피와 함께 UI 플로우 전용임을 재확인(실제 발송 없음).
- `OnboardingScreen.js:34-43` `onNext`/`onScroll`가 빠른 탭 시 dot-page 인덱스 순간 불일치(시각만).
- 네임스페이스(`.exists`) vs 모듈러(`.exists()`) API 혼재 — 오늘은 각 파일 내 정확하나 v22 추가 이전 시 오작성 위험(`accountService`/`vehicleQueryService` vs `AuthContext`/`consultationService`).
- 서비스가 catch 후 `Alert`+`undefined` 반환(`vehicleService.js:26` `deleteVehicleAdmin`, `consultationService.js:132`) → 호출부가 성공/실패 구분 불가, 낙관적 UI 롤백 불가. re-throw 패턴으로 통일.
- `deleteMultipleImages`(imageService.js:66) `Promise.all` all-or-nothing → `allSettled`+not-found 무시.
- `subscribeToCompletedConsultations`(consultationQueryService.js:164) 정렬이 Timestamp 가정 → `Date`/number 값이면 comparator throw로 콜백 붕괴.
- VehicleCard 하드코딩 `#EEF1F5`/`#fff`, `dealStage` propTypes 누락.
- CarZen 프록시: 업스트림 `jsonResponse.data` 원본 그대로 반환(101) → 반환 필드 allow-list 검토. 유료 외부 API에 레이트리밋 없음.
- 테마 토큰 정합성: **이상 없음**(borderRadius/typography/colors/shadows 별칭 모두 해소됨, dangling 참조 없음).

---

## 확인된 양호 항목 (regression 방지 기록)

- Storage 규칙(create-only, 5MB/이미지 타입 제한, 덮어쓰기·삭제 차단) — 견고.
- FCM util, CarZen 키 관리(Secret Manager, 클라 미반환), SSRF 없음(하드코딩 URL).
- 미인증 특권 callable 없음, cascade 역할검사 서버측 Firestore 기준(클레임 아님).
- 소프트/하드 삭제 설계, 감사로그 불변(update/delete=false) 규칙.
- 가격 렌더 사이트 대부분 정상 게이팅(VehicleCard/Detail/MyVehiclesTab/OwnedVehiclesList) — C2/C3만 예외.

---

## 권장 처리 순서

1. **C1~C3 (가격 노출 3종)** — 규칙 핵심 위반, 함께 처리. C2/C3는 당일 수정 가능, C1은 데이터 구조 변경.
2. **C4/C5 (이중예약)** — C4 필드 수정은 트리비얼, C5 원자성은 슬롯ID 도입.
3. **C6/C7 (리스너 싱글턴·인증 튕김)** — 실사용 재현되는 안정성 결함.
4. 🟡 묶음: 피드백/에러 일관성(ForgotPassword·registerUser·서비스 반환), 데이터 정합(cascade currentOwnerId·완료 멱등), 성능(쿼리 캡).
5. 🟢는 Supabase 이전·i18n 작업과 함께 정리.
</content>
</invoke>
