# JCar 기능별 점검 결과 & 진행 상태 (2026-06-20)

> 2026-06-20 전문가 점검에서 나온 항목과 이후 처리 현황.
> 범례: ✅ 완료(커밋/배포) · ⚠️ 부분 완료 · ⬜ 미완 · 🔴 높음 / 🟡 중간 / 🟢 낮음
>
> 관련 문서: [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)

## 진행 요약

| 구분 | 완료 | 부분 | 미완 |
|---|---|---|---|
| 🔴 높음 | registerUser 복구·배포, 상담 enum 통일, rate-limit 순서 | — | — |
| 🟡 중간 | 버튼 중복제출, console __DEV__ 게이팅, 동적 import 정리, copy/날짜 버그 | PII 비정규화(접근통제만), 데드코드 정리, 이미지 placeholder | Alert/Toast 통일(#123), 에러매핑 중복, 상세 실시간화 |
| 🟢 낮음 | — | — | 하드코딩→theme, undefined 표시, 마이페이지 정보 |
| 기능 제안 | 다중 이미지+캐러셀(#127) | — | 찜, 알림센터, 채팅, 비교, i18n, 리마인더 |

---

## 1. 인증 (로그인 / 회원가입)

- [x] 🔴 **`registerUser` 클라우드 함수 레포 부재** → ✅ git 이력에서 복구 + 배포(`70168bb`). 추가로 Firestore 실패 시 Auth 롤백(`e01cf06`, #124).
- [x] 🟡 **로그인/회원가입 버튼 로딩·disabled 없음(중복 탭)** → ✅ 중복제출 가드(`595411f`) + Login `finally` 복원 버그까지(`a7fc3e7`).
- [x] 🟡 **데드코드 `authService.js`(registerUser/loginUser)** → ✅ 파일 삭제 + 배럴 재export 제거 + 구식 테스트 제거(`57e536e`).
- [x] 🟡 **로그인 에러 매핑 중복** → ✅ LoginScreen이 `handleFirebaseError` 사용하도록 일원화(switch 제거, Crashlytics도 중앙화)(`57e536e`).

## 2. 차량 등록 (VehicleRegistrationScreen.js)

- [x] 🟡 **"차량 정보 저장" 버튼 업로드 중 비활성화 안 됨** → ✅ `saving` 가드 + `disabled={saving||isUploading}`(`595411f`).
- [~] 🟡 **sellerName/Phone/Email 비정규화 저장** → ⚠️ **부분**: PII를 `vehicles/{id}/private/contact`로 분리해 **접근 통제**는 완료(#125, `8787ec1`). 단 *프로필 변경 시 stale* 문제 자체는 남음(여전히 복사 저장). 출시 전 프로필 수정 기능 생기면 join-on-read 검토.
- [ ] 🟢 **하드코딩 색상(`#2B4593`)·인라인 스타일** → theme 토큰 미적용. **미완**.

## 3. 차량 목록 / 상세

- [x] 🟡 **상세 화면 `getDoc` 1회성(비실시간)** → ✅ VehicleDetailScreen을 `onSnapshot` 실시간 구독으로 전환(보는 중 sold 반영, 상담 버튼 비활성)(`5eb731d`). *(AdminVehicleDetail은 관리자가 상태 변경 주체라 보류)*
- [x] 🟡 **이미지 로딩/실패 대체 UI 없음** → ✅ `ImageCarousel` 빈 이미지 placeholder(#127) + **개별 이미지 로드 실패 폴백**(broken-image)(`7e33dde`).
- [x] 🟢 **`${vehicle.cc} cc` 등 undefined 표시** → ✅ 단위 필드 가드 + InfoRow `-` 폴백(VehicleDetail·AdminVehicleDetail)(`7e33dde`).

## 4. 상담 신청 (ConsultationRequestScreen.js)

- [x] 🔴 **낙관적 UI 의미 붕괴(rate-limit 사후 검사)** → ✅ 거부성 검증(중복+rate-limit)을 낙관적 성공 *이전*으로 이동 + 실패 시 롤백 안 되던 truthy 버그까지 수정(`ad62aac`).
- [x] 🟡 **제목이 isSell여도 항상 "구매 상담"** → ✅ buy/sell 분기(`f9b44e8`).
- [x] 🟡 **Calendar minDate 없음(과거 예약)** → ✅ `minDate=오늘` + 과거일 터치 차단(`f9b44e8`). *(같은 날 과거 시각 제약은 미세 항목으로 남김)*
- [x] 🟡 **checkDuplicateConsultation console.log 노이즈** → ✅ 문서별 스팸 제거 + logger.debug 요약(`19987ec`).

## 5. 마이페이지 (MyPageScreen.js)

- [ ] 🟢 **useEffect 의존성에 구독 함수 누락** → 명시 권장. **미완**.
- [x] 🟢 **사용자 정보 카드에 이메일만** → ✅ 이름·전화(formatPhone) 추가(`7e33dde`).

## 6. 상담/거래 서비스 (consultationService.js)

- [x] 🔴 **상태 enum 불일치** → ✅ 통일(#121, `8bda952`). *정정*: 점검 당시 "존재하지 않는 값"으로 본 `confirmed`/`on-hold`는 실제 사용 중인 상태였음(ConsultationCard/쿼리). 따라서 enum을 **실제 8-state(+confirmed/on-hold/archived)** 로 확장하고 매직스트링을 상수화. *narrow 했다면 회귀였음.*
- [x] 🟡 **cancelConsultation 동적 `await import` → 정적** → ✅ `getDoc` 정적 import(`ad62aac`).
- [x] 🟡 **`completeConsultation` vs `completeConsultationDeal` 중복** → ✅ `completeConsultationDeal`은 호출처 없는 데드 중복이라 제거(배럴 포함)(`c493085`). `completeConsultation`만 유지.

## 7. 사용자 피드백 패턴 — Alert vs Toast (#123)

- [~] 🟡 **Alert.alert(48곳/14파일)와 `useToast` 혼용** → ⚠️ **부분(#123)**: 가장 노이즈 큰 `ConsultationRequestScreen` 9개 alert를 toast로 전환(성공+이동은 toast+goBack), 확인 대화상자는 의도적 유지(`57e536e`). **잔여**: 관리자 화면의 정보성 alert + 서비스 레이어가 직접 Alert를 띄우는 안티패턴(별도 리팩토링).

**핵심(트랩 주의)**: 단순 치환 불가. 용도별로 나눠야 함.
- **정보성 단일 알림**("저장 실패", "조회 성공" 등) → **Toast로 전환** 대상.
- **확인/선택 대화상자**(버튼 있음)는 **Alert/모달 유지** 필수 — Toast는 버튼·블로킹 확인 불가:
  - `MyPageScreen` 회원탈퇴 확인(취소/탈퇴)
  - `VehicleRegistrationScreen` 갤러리/카메라 선택
  - `ConsultationRequestScreen` "확인" 후 goBack
- 무차별 치환 시 확인 플로우가 깨짐 → 케이스별 분류 후 적용. 한 줄 규칙 권장: **toast = 알림, Alert/모달 = 결정**.

**연관**: 로그인 에러 매핑 중복(섹션 1)과 함께 "**피드백·에러 일관성**" 묶음으로 처리하면 효율적.

---

## 횡단(cross-cutting) 우선순위

| 우선 | 항목 | 상태 |
|---|---|---|
| 🔴 | registerUser 레포 편입 | ✅ `70168bb` |
| 🔴 | 상담 상태 enum 통일 | ✅ `8bda952` (#121) |
| 🔴 | rate-limit 검증 순서 | ✅ `ad62aac` |
| 🟡 | 비동기 버튼 로딩·disabled 표준화 | ✅ `595411f` (Login/Register/차량저장/상담) |
| 🟡 | console.log `__DEV__` 게이팅 | ✅ #122 (`4a27a6c`/`19987ec`/`1efed6d`/`941bd8a`) — 240곳 logger 이관 |
| 🟡 | Alert vs Toast 피드백 통일 | ⚠️ 부분(#123): 사용자 화면 전환 완료, 관리자/서비스 잔여(`57e536e`) |
| 🟡 | 중복·데드코드 정리 | ✅ authService(`57e536e`) + completeConsultationDeal(`c493085`) + 동적 import(`ad62aac`) 제거 |
| 🟢 | 하드코딩 스타일 → theme 토큰 | ⬜ |
| 🟢 | 이미지 placeholder + 로드 실패 폴백 | ✅ (`7e33dde`) |
| 🟢 | undefined 표시 옵셔널 / 마이페이지 정보 | ✅ (`7e33dde`) |
| 🟢 | 상세화면 실시간화 | ✅ VehicleDetail onSnapshot 전환(`5eb731d`) |

## 추가 제안 기능

- [x] **다중 이미지 + 캐러셀** → ✅ #127 (`a3882a5`) — 업로드 다중선택 + PagerView 캐러셀.
- [ ] 찜/관심 차량
- [ ] 인앱 알림 센터(FCM 히스토리)
- [ ] 상담 채팅
- [ ] 차량 비교(2~3대 스펙)
- [ ] i18n 구조 + 접근성 라벨
- [ ] 상담 일정 푸시 리마인더(예약 1일 전)

---

## 이번 세션 추가 작업 (점검 목록 밖, 보안/인프라)

점검 목록에는 없지만 함께 처리/발견한 항목:

- ✅ **보안 규칙 감사·수정·배포**(`442d866`): users 권한상승(role 자가승격), vehicle 자가승인(status), Storage 변조(덮어쓰기/삭제) 차단.
- ✅ **판매자 PII 공개문서 분리**(#125, `8787ec1`) — rules 배포 완료 / ⏳ 앱 빌드 + 마이그레이션 실행 대기.
- ✅ **계정 삭제 시 Storage 이미지 + PII 서브문서 정리**(#75, `f06e64a`) 배포.
- ✅ Task Master AI provider gemini→claude-code 전환.
- ✅ 릴리스 체크리스트 문서화([RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)).
- 🔴 **신규 발견 #126**: 소프트삭제(30일 복구 안내)인데 차량/상담/이미지를 *즉시 영구삭제* → 복구 불가. 예약 영구삭제 함수 신설 필요. **출시 전 필수**(현재 pre-launch라 긴급도는 낮음).

> 미완 항목 추적은 Task Master(#123 Alert/Toast, #126 소프트삭제) 및 위 ⬜ 목록 참고.
