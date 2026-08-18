# 코드 점검 — 2026-08-17

> Play 업로드 키 재설정 승인을 기다리는 동안 수행한 코드 수준 점검.
> 심각도 순으로 정리했고, 각 항목은 "왜 문제인가 → 어떻게 고치는가" 형식이다.
> 처리한 항목은 취소선과 커밋 해시를 남긴다.

점검 범위: `src/` 122개 파일 20,138줄, `supabase/functions/` 4개, 마이그레이션 11개.

---

## 잘 되어 있는 것 (먼저)

고칠 것만 나열하면 그림이 왜곡되므로 확인된 강점을 먼저 적는다.

- **가격 비공개가 DB에서 강제된다.** `vehicles`에 가격 컬럼이 아예 없고
  `vehicle_pricing`이 관리자 전용 RLS다. UI(`canViewVehiclePrice`, `hidePrice`)는
  2차 방어일 뿐이라, 화면에서 실수해도 일반 사용자에게 실제 가격이 흘러가지 않는다.
  "화면에서 숨기기"가 아니라 "데이터를 안 주기"로 푼 것이 옳다.
- **상태 전이·중복 예약을 DB가 막는다.** 부분 UNIQUE 인덱스로 이중 예약을,
  가드 트리거(`guard_profile_update`, `guard_vehicle_update`)로 권한 밖 컬럼 변경을
  거부한다. 클라이언트 검증에 기대지 않는다.
- **로거가 프로덕션에서 조용하다.** `__DEV__` 가드로 콘솔 출력이 릴리스에 남지 않는다.
- **비밀 관리가 일관적이다.** 서비스 계정 키·키스토어·PAT가 전부 gitignore이며,
  푸시 발송 시크릿은 마이그레이션이 아니라 Vault에 있다.

---

## ~~🔴 S1. 푸시 알림 발송 함수에 호출자 인가 검사가 없다~~ ✅ 해결

**파일**: `supabase/functions/send-push-notification/index.ts`

DB 트리거는 이 함수를 **service_role** 키로 호출한다
(`20260814164534_push_dispatch.sql`의 `net.http_post`).
그런데 함수는 호출자가 누구인지 확인하지 않는다. `verify_jwt` 기본값이 켜져 있어도
그것이 증명하는 건 "로그인한 누군가"일 뿐, "DB 트리거"가 아니다.

즉 **앱에 로그인한 아무 사용자나** 다음을 할 수 있다:

```
POST /functions/v1/send-push-notification
{ "userId": "<타인의 uid>", "title": "J-Car 관리자", "body": "..." }
```

임의의 사용자에게 **관리자를 사칭한 푸시**를 보낼 수 있다. 중고차 거래 앱에서
"입금 계좌가 변경되었습니다" 같은 알림이 정품 푸시로 도착하는 것은 실질적 피싱 경로다.

진단용으로 열어둔 `token` 파라미터는 더 넓다 — 임의의 FCM 토큰으로 직접 발송할 수 있어
우리 앱 사용자가 아닌 대상에게도 보낼 수 있다.

**고치는 법**
1. 호출자의 Authorization 헤더가 service_role인지 검증한다.
   JWT를 디코드해 `role === 'service_role'`인지 보거나,
   트리거가 보내는 별도 공유 시크릿 헤더를 Vault에 두고 대조한다.
2. `token` 직접 지정 경로는 제거하거나 `Deno.env.get("ALLOW_DIRECT_TOKEN")` 가드를 건다.
   진단은 스테이징에서만 필요하다.
3. 실패 시 401로 끊고, 시도 자체를 로깅해 남긴다.

> **해결(2026-08-18)**: `_shared/serviceRole.ts`의 `isServiceRole()`로 호출자 역할을
> 검증하고, `token` 직접 지정은 `ALLOW_DIRECT_TOKEN=1`일 때만 허용하도록 막았다.
> 배포 후 확인: anon 키 사칭 호출 **403**, 무인증 **401**,
> 트리거와 동일한 service_role 경로(pg_net)는 **200**으로 정상 동작.
> 같은 헬퍼를 `purge-deleted-accounts`도 공유한다.

---

## ~~🟠 S2. 이미지 삭제 정책이 없어 롤백 경로가 죽어 있다~~ ✅ 해결

> **정정(2026-08-18)**: 최초 작성 시 "기록 보존(의도된 정책)"과 "업로드 실패 롤백(버그)"을
> 뭉뚱그렸다. 차량·거래 기록을 남기는 것은 회사 정책이며 문제가 아니다.
> 여기서 다루는 것은 **레코드가 되지도 못한 업로드 조각**으로, 보존 대상이 아니다.
> 정리는 클라이언트가 아니라 서버 측에서 "레코드에 연결되지 않은 파일만" 수행해야 한다.
> 계정 탈퇴·보존 정책은 `docs/ACCOUNT_DELETION.md` 참고.

**파일**: `supabase/migrations/20260708161043_initial_schema.sql`, `src/services/storage/`

`vehicles` 버킷에 insert 정책만 있고 update/delete 정책이 없다. 의도적으로
"클라 변조 불가"를 노린 설계지만, 그 결과 클라이언트의 삭제 호출이 **항상 실패**한다.

`uploadMultipleImages`는 일부 실패 시 이미 올라간 이미지를 `deleteMultipleImages`로
되돌리려 하는데, 이 경로가 동작하지 않는다. `catch`로 감싸 로깅만 하고 넘어가므로
**조용히 고아 이미지가 쌓인다.** 차량 삭제 시에도 이미지는 남는다.

또한 insert 정책이 `bucket_id = 'vehicles'`만 확인한다 — 경로를 사용자별로 묶지 않고,
파일 크기·MIME 제한도 없다. 로그인만 하면 임의 파일을 무제한 올릴 수 있어
스토리지 비용 남용 경로가 된다.

**고치는 법**
1. 버킷에 `file_size_limit`과 `allowed_mime_types`(image/jpeg, image/png, image/webp)를 건다.
2. 업로드 경로를 `{auth.uid()}/{uuid}.jpg`로 바꾸고, insert 정책에
   `(storage.foldername(name))[1] = auth.uid()::text`를 추가한다.
3. 본인 경로에 한해 delete 정책을 허용하거나, 정리를 Edge Function/pg_cron으로 옮긴다.
   전자가 간단하고, 후자가 안전하다 — 고아 이미지 정리 작업이 어차피 필요하다.

> **해결(2026-08-18)**: 버킷에 10MB·이미지 MIME 제한을 걸고, 업로드 경로를
> `{uid}/...`로 묶어 insert 정책이 본인 폴더만 허용하도록 했다. 본인 파일 삭제 정책을
> 추가해 롤백 경로를 살렸다(update 정책은 두지 않아 바꿔치기는 여전히 불가).
> 기존 차량 이미지는 레코드에 연결돼 있어 앱이 지우지 않으므로 보존 정책과 충돌하지 않는다.

---

## ~~🟠 S3. 상담 요청 레이트리밋이 통과 처리 스텁이다~~ ✅ 해결

**파일**: `src/services/consultation/consultationService.js:30`

```js
export const checkConsultationRateLimit = async () => {
  return { allowed: true };
};
```

화면은 이 값을 신뢰해 "요청 제한" 토스트 분기까지 갖추고 있어 **방어가 있는 것처럼 보인다.**
실제로는 아무것도 막지 않는다. DB UNIQUE 제약이 같은 차량·같은 시간의 중복만 막을 뿐,
서로 다른 차량·시간으로의 대량 요청은 그대로 통과한다.

관리자 일정이 스팸 요청으로 채워지면 정상 사용자가 예약할 수 없다.

**고치는 법**: `consultation_requests`에 대해 "최근 N분간 M건" 카운트를 세는
SECURITY DEFINER RPC를 만들고 insert 전에 호출한다. 클라이언트 우회가 가능한 위치이므로
최종적으로는 insert 트리거에서 거부하는 편이 확실하다.

> **해결(2026-08-18)**: BEFORE INSERT 트리거로 강제한다(1시간 5건 / 24시간 20건,
> 관리자·서버 면제). 화면 사전 안내용 `consultation_quota()` RPC를 별도로 두되,
> 그건 UX일 뿐 방어가 아님을 코드 주석에 명시했다.
> 검증: 롤백 트랜잭션에서 일반 사용자 문맥을 주입해 6번째 요청이 `rate_limit_hour`로
> 거부되는 것을 확인했다.

---

## ~~🟡 S4. 업무 로직 서비스에 테스트가 0건이다~~ ✅ 대부분 해결

테스트 57개가 모두 통과하지만 대상이 편중돼 있다.

| 영역 | 테스트 |
|---|---|
| 컴포넌트(Button/Card/Badge/InputField) | 있음 |
| theme | 있음 |
| **auth / vehicle / storage 서비스** | **0건** |
| consultation / notification(fcm) 서비스 | 있음 (2026-08-18 실제 모듈로 이관) |
| `vehiclePrice`(가격 가시성 규칙) | 있음 (2026-08-18 추가) |

즉 **테스트가 가장 필요한 곳에 없고, 지워야 할 코드에는 있다.** 상담 상태 전이,
가격 가시성 판정, 소유권 이전 같은 규칙이 회귀해도 CI가 잡지 못한다.

**우선순위**: `canViewVehiclePrice`(비즈니스 규칙 중 가장 치명적), 상담 상태 전이,
`mappers.js`의 snake_case↔camelCase 변환. 이 셋만 덮어도 회귀 위험이 크게 준다.

> **해결(2026-08-18)**: 지목한 세 곳을 모두 덮었다. 57 → 98건.
> - `vehiclePrice` 8건 — fail-closed 포함
> - `mappers` 21건 — 왕복 비대칭을 "알고 쓰라"고 명시적으로 고정
> - `constants/consultation` 10건 — DB 가드와 짝을 이루는 취소 가능 목록
> - `consultationService` / `fcmService` — 실제 모듈로 이관 + 레이트리밋·슬롯충돌 구분
>
> **테스트를 쓰다가 실제 버그를 찾았다**: 화면이 approved 상담에 취소 버튼을 노출하는데
> DB 가드가 거부했다(confirmed·on-hold는 허용하면서 approved만 누락).
> 반대로 confirmed·on-hold는 DB가 허용하는데 버튼이 없었고, 조건에 존재하지도 않는
> 상태 `'meeting'`이 섞여 있었다. DB 가드에 approved를 추가하고, 화면은
> `USER_CANCELLABLE_STATUSES` 한 곳을 보도록 바꿨다.
>
> 남은 것: auth / vehicle / storage 서비스는 여전히 0건.

---

## ~~🟡 S5. 죽은 Firebase 잔재가 남아 있다~~ ✅ 해결

- `src/services/firebaseService.js` — import하는 곳이 없다
- `__tests__/services/firebaseService.test.js` — 죽은 코드를 테스트한다
- `src/types/firestore.js`, `src/types/FIRESTORE_SCHEMA.md` — Firestore 시절 스키마 문서

Supabase 이전이 끝났는데 남아 있어, 새로 합류한 사람(또는 다음 세션의 나)이
어느 쪽이 진짜인지 판단하는 데 시간을 쓴다. `UpdateChecker` 때와 같은 종류의 지뢰다
(그건 끊어진 import가 배럴에 남아 있었다).

**고치는 법**: 삭제. `FIRESTORE_SCHEMA.md`에 남길 내용이 있으면
`supabase/migrations/`를 가리키는 한 줄로 대체한다.

> **해결(2026-08-18) — 다만 진단이 일부 틀렸다.**
> `firebaseService.test.js`를 "죽은 코드를 테스트한다"고 적었지만, 열어보니
> 테스트 자체는 **Supabase 이전에 맞춰 갱신된 살아 있는 테스트**였고
> import만 죽은 배럴을 경유하고 있었다. 그래서 삭제하지 않고 실제 모듈을 가리키는
> `consultationService.test.js` / `fcmService.test.js`로 분리했다.
> 배럴(`firebaseService.js`)과 Firestore 스키마 문서 2종은 삭제했다.
>
> 옮기는 과정에서 `jest.setup.js`의 messaging 목이 **구형 네임스페이스 API 형태**라
> 모듈러 named export가 없다는 것도 드러났다. 앱은 전부 모듈러 API를 쓰므로
> 목을 현행화했다 — 그전까지 실제 호출 경로를 검증하지 못하고 있었다.

---

## 🟡 S6. 모달 6개가 같은 구조를 각자 구현한다

`src/components/modals/` 총 2,348줄. 6개 파일이 각각 `<Modal>` 래핑, 오버레이,
헤더, 닫기 버튼, 스타일시트를 처음부터 다시 만든다. 가장 큰 `CompleteDealModal`은 590줄이다.

디자인 변경이 6곳 수정으로 번지고, 접근성 속성이나 안드로이드 뒤로가기 처리 같은 것이
한 곳만 빠지는 식으로 어긋난다.

**고치는 법**: `BaseModal`(오버레이·헤더·닫기·키보드 회피)을 만들고 각 모달은
본문만 갖게 한다. 리스크가 낮고 효과가 즉시 보이는 리팩터링이라, 손대기 좋은 첫 후보다.

---

## ~~🟡 S7. `VehicleCard`의 가격 기본값이 열려 있다~~ ✅ 해결

```js
const VehicleCard = ({ vehicle, onPress, statusDot, hidePrice, style }) => {
```

`hidePrice`를 넘기지 않으면 가격을 표시하는 쪽으로 동작한다(fail-open).
지금은 DB가 비관리자에게 가격을 주지 않아 실제 유출로 이어지지 않지만,
방어가 한 겹뿐인 상태를 규칙의 중요도에 비해 얇게 두고 있다.

**고치는 법**: 기본값을 `hidePrice = true`로 뒤집고, 관리자 화면에서만 명시적으로
`hidePrice={false}`를 넘긴다. 실수했을 때 "가격이 안 보인다"로 끝나게 만든다.

> **해결(2026-08-18)**: 기본값을 뒤집었다. 기존 호출부 2곳(`VehiclesListScreen`,
> `VehicleBrowseScreen`)은 이미 `hidePrice`를 명시하고 있어 동작 변화가 없다.
> 함께 `__tests__/utils/vehiclePrice.test.js`를 추가해 판정 규칙을 고정했다 —
> 소유자여도 못 본다, role이 없거나 예상 밖 값이면 fail-closed 등 8건.

---

## 개선 아이디어 (기능)

점검 중 코드 구조상 자연스럽게 붙일 수 있다고 판단한 것들. 우선순위는 사업 판단 영역이라
근거만 적는다.

1. **상담 취소·변경을 사용자에게 열기** — 상태 전이 트리거와 알림 허브가 이미 있어
   상태 하나와 알림 타입 하나만 추가하면 된다. 현재는 사용자가 잘못 예약하면
   관리자에게 연락하는 수밖에 없다.
2. **알림 센터 화면** — `notifications` 테이블이 이미 허브로 동작하는데 앱에는
   목록 화면이 없다. 푸시를 놓치면 확인할 방법이 없다. 읽음 처리(`read` 컬럼)와
   `grant update (read)`까지 이미 있어 화면만 붙이면 된다.
3. **차량 등록 임시저장** — `VehicleRegistrationScreen`이 664줄에 다단계 입력인데
   중간 이탈 시 전부 날아간다. 외부 API 조회까지 다시 해야 해서 체감이 나쁘다.
4. **관리자용 상담 일정 충돌 사전 표시** — 이중 예약은 DB가 막지만, 사용자는
   저장 버튼을 누른 뒤에야 실패를 안다. 이미 있는 `is_slot_taken` RPC를
   시간 선택 화면에서 호출하면 선점된 슬롯을 미리 회색 처리할 수 있다.
5. **이미지 지연 로딩·캐시** — 공개 버킷 URL을 그대로 `Image`에 넣고 있다.
   `expo-image`로 바꾸면 캐시·플레이스홀더·점진 로딩이 기본 제공되고,
   목록 스크롤 체감이 개선된다. Expo 이전을 이미 했으므로 추가 비용이 거의 없다.

---

## 권장 처리 순서

1. ~~**S1**~~ ✅ 완료 — 유일하게 악용 시 사용자 피해로 직결되던 항목.
2. ~~**S3, S2**~~ ✅ 완료 — 남용·비용 경로.
3. ~~**S5, S7**~~ ✅ 완료 — 지뢰 제거.
4. **S4, S6** — 시간이 드는 대신 이후 모든 작업 속도에 복리로 작용한다.

기능 아이디어는 그다음이며, 그중 **알림 센터(2번)**가 이미 있는 인프라 대비
투입 대비 효과가 가장 크다.
