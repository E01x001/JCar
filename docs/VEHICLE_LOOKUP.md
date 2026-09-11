# 차량 정보 조회

차량번호와 소유자명으로 제원을 받아오는 경로. 등록 화면(1단계)이 이걸 쓴다.

```
VehicleRegistrationScreen
  └─ supabase.functions.invoke('get-vehicle-info')   ← API 키는 여기 안에만 있다
       └─ providers/carzen.ts                        ← 조회처 구현
            └─ datahub-dev.scraping.co.kr /assist/common/carzen/CarAllInfoInquiry
```

**API 키는 클라이언트에 없다.** Edge Function의 시크릿(`CARZEN_API_KEY`)에만 있고,
앱 번들에는 들어가지 않는다. 조회처가 무엇인지도 앱은 모른다 — 응답을 정규화해서
주기 때문이다(`types.ts`의 `NormalizedVehicle`).

조회처는 환경변수로 고른다:

```
VEHICLE_INFO_PROVIDER=carzen   (기본값, 유료)
VEHICLE_INFO_PROVIDER=molit    (국토교통부, 미구현)
```

---

## 필드 대응표

CarZen `CarAllInfoInquiry` 명세 기준. **왼쪽이 원본 키, 오른쪽이 저장 위치다.**

| 원본 | 정규화 | 저장 | 화면 |
|---|---|---|---|
| `CARNAME` | `vehicleName` | `vehicles.vehicle_name` | 목록 · 상세 · 등록 확인 · 상담 |
| `SUBMODEL` | `subModel` | `vehicles.sub_model` | 상세(사용자·관리자) |
| `CARVENDER` | `manufacturer` | `vehicles.manufacturer` | 목록 · 상세 · 등록 확인 |
| `CARYEAR` | `year` | `vehicles.year` | 목록 · 상세 · 등록 확인 |
| `UID` | `catalogUid` | `vehicles.catalog_uid` | 관리자 상세만 (전산코드) |
| `FUEL` | `fuelType` | `vehicles.fuel_type` | 상세 · 등록 확인 |
| `MISSION` | `transmission` | `vehicles.transmission` | 상세 · 등록 확인 |
| `CC` | `cc` | `vehicles.cc` | 상세 · 등록 확인 |
| `DRIVE` | `driveType` | `vehicles.drive_type` | 상세 |
| `SEATS` | `seats` | `vehicles.seats` | 상세 |
| `FRONTTIRE` / `REARTIRE` | `frontTire` / `rearTire` | `vehicles.front_tire` / `rear_tire` | 상세 |
| `FUELECO` | `fuelEco` | `vehicles.fuel_eco` | 상세 |
| `FUELTANK` | `fuelTank` | `vehicles.fuel_tank` | 상세 |
| `EOILLITER` | `engineOilLiter` | `vehicles.engine_oil_liter` | 상세 |
| `WIPER` | `wiperInfo` | `vehicles.wiper_info` | 상세 (`formatWiper`로 풀어서) |
| `BATTERYLIST[]` | `batteries` | `vehicles.batteries` (jsonb) | 상세 (`formatBatteries`) |
| `BATTERYLIST[0].MODEL` | `battery` | `vehicles.battery` (하위호환) | 목록이 비었을 때 '호환 배터리' 대체값 |
| **`PRICE`** | `newCarPrice` | **`vehicle_pricing.new_car_price`** — 관리자 전용 | **관리자 상세만** |
| `VIN` | `vin` | `vehicle_private_contact.vin` — 비공개 | **관리자 상세만** (등록자 정보) |
| `CARURL` | `catalogImageUrl` | `vehicles.catalog_image_url` | 목록 카드 · 등록 확인 · 관리자 상세 (실사진이 없을 때) |

"상세"는 사용자 상세(`VehicleDetailScreen`)와 관리자 상세(`AdminVehicleDetailScreen`)
둘 다를 뜻한다. 값이 없으면 사용자 화면은 그 줄을 숨기고 관리자 화면은 `-`를 보인다.

**화면 대조 (2026-09-12)** — 명세의 데이터 필드 20개가 전부 화면까지 닿는 것을
확인했다. 경로는 `select('*')` → `rowToApp`(일반 snake→camel 변환)이라 컬럼이
중간에 빠지는 곳이 없다. 이때 드러나 고친 것 둘:

- `VIN`은 관리자 화면이 `vehicle_private_contact`를 **불러오면서도 그리지 않았다.**
  소유자명·차량번호와 함께 등록자 정보에 추가했다.
- `CARURL`은 관리자 상세에서 실사진이 없는 차량(승인 전)에 쓰이지 않아 "이미지
  없음"으로만 보였다. 카탈로그 이미지로 대신한다(`contain` — 흰 배경 PNG라
  `cover`면 잘린다).

`PRICE`는 등록 화면이 조회 결과로 받지만 **그리지 않고** `record_new_car_price`로만
보낸다 — 가격은 관리자 전용이라는 규칙이 등록 경로에서도 지켜진다.

`STATUS` · `RESPONSE` · `RESULT` · `ERRMSG`는 성공 판정에만 쓰고 저장하지 않는다.

### 신차가격이 vehicles에 없는 이유

가격은 관리자에게만 보인다는 것이 이 프로젝트의 경계이고, 그 경계는 컴포넌트가
아니라 RLS가 지킨다. 신차가격은 공시가라 매입가만큼 민감하진 않지만, **가격이라는
이름이 붙은 값을 일반 사용자가 읽을 수 있는 테이블에 두는 순간 그 경계가 흐려진다.**

그래서 `vehicle_pricing`(관리자 전용 RLS)에 넣는다. 등록하는 사람은 일반 사용자라
그 테이블에 쓸 수 없으므로, 좁은 통로를 하나 냈다:

```sql
record_new_car_price(p_vehicle_id, p_price)   -- SECURITY DEFINER
```

그 차량의 판매자가, 값이 아직 없을 때만, 신차가격 한 칸만 쓴다. 관리자가 고쳐 둔
값은 덮지 않는다.

**한계**: 값은 클라이언트를 거쳐 온다(조회가 차량 행 생성보다 먼저 일어나므로
서버가 직접 쓸 수 없다). 위조된 신차가격이 들어올 수 있다는 뜻이고, 그래서 이건
**참고값이지 판단의 최종 근거가 아니다.** 관리자가 언제든 직접 고칠 수 있다.

### 표시 형식은 저장하지 않는다

`WIPER`는 `"D:600;P:400;R:전용"` 형태로 온다. 이 원문을 그대로 저장하고,
보여줄 때 `formatWiper`(`src/utils/vehicleSpec.js`)가 푼다 —
"운전석 600mm · 조수석 400mm · 후면 전용".

저장 단계에서 가공하지 않는 이유: 원문은 조회처의 것이고 표시 형식은 우리 것이다.
저장할 때 풀어버리면 나중에 형식을 바꿀 때 이미 저장된 행을 손댈 수 없다.

`BATTERYLIST`도 같다. 이건 배터리 **하나**가 아니라 **호환 배터리 목록**이다
(명세 예시만 봐도 로케트·솔라이트·델코·아트라스 넷이 붙는다). 목록을 통째로 두고
`formatBatteries`가 표시용 줄로 만든다.

---

## 조회처를 바꿀 때

`providers/`에 파일을 하나 추가하고 `VehicleProvider` 계약을 지키면 된다.
화면은 손대지 않는다 — 그러라고 정규화 계층을 만들었다.

```ts
export class MolitProvider implements VehicleProvider {
  readonly name = "molit";
  async lookup(regiNumber, ownerName): Promise<VehicleLookupResult> { ... }
}
```

**국토교통부로 옮길 때 없어질 것들**(제원 항목에 없을 가능성이 높다):
`fuelEco` · `fuelTank` · `engineOilLiter` · `wiperInfo` · `batteries` · `catalogImageUrl` ·
`newCarPrice`. 이건 CarZen이 스크래핑 기반이라 얻을 수 있던 값이다.

없는 값은 **반드시 `null`을 명시한다.** `undefined`로 두면 `appToRow`가 키를 건너뛰어
컬럼이 조용히 비고, "조회처에 값이 없었다"와 "코드가 흘렸다"를 구분할 수 없게 된다.

`catalogUid`를 저장하는 이유가 이것이다 — 두 조회처의 같은 차량을 대조할 기준.

---

## 조회 주소 — 개발계를 쓴다 (전환하지 않는다)

```
Dev   https://datahub-dev.scraping.co.kr/assist/common/carzen/CarAllInfoInquiry   ← 사용 중
Prod  https://api.mydatahub.co.kr/assist/common/carzen/CarAllInfoInquiry          ← 쓰지 않는다
```

**개발계는 무료 사용 한도가 있다.** 조회 한 번이 한도를 소모하므로:

- **에이전트·스크립트·curl로 절대 호출하지 않는다** (CLAUDE.md 지침). 실제 조회는
  사용자가 앱의 차량 등록으로만 한다.
- 운영계로의 전환은 사용자가 결정한다. 2026-09-12 개발계 유지로 결정됐다.
  (이전 판의 이 문서는 "운영 전환 전에 할 것"을 적어 전환을 권했다 — 그 권고는 철회.)

주소는 `providers/carzen.ts`의 `CARZEN_URL` 한 줄에 있다. 명세상 인증 헤더는
`Authorization: Token {발급토큰}` 형식이며, 우리는 시크릿 값을 그대로 넣는다 —
시크릿에 `Token ` 접두사가 포함돼 있어야 한다.

---

## 오류 구분

| errCode / 증상 | 뜻 | 대응 |
|---|---|---|
| `0000` + `STATUS 200` | 성공 | — |
| `6112` 소유자 정보가 맞지 않습니다 | 소유자명 불일치 | 사용자에게 재입력 안내 |
| `STATUS 202` | 알 수 없는 차량 | 차량번호 확인 |
| `STATUS 403` | 인증키 또는 IP 오류 | 시크릿·허용 IP 확인 |
| 자동차등록원부 발급 중 오류 | **상위(민원 포털) 장애** | 우리 쪽 문제가 아니다. 시간을 두고 재시도 |

마지막 항목은 스크래핑 기반이라 생기는 것으로, 명세 7항도 "간헐적인 지연이나
실패가 발생할 수 있다"고 적고 있다. 2026-08-28 현재 이 오류가 계속 나고 있다
(ISSUE-07).

---

## 진단

Edge Function 로그에 응답 키 이름을 남긴다(**값은 남기지 않는다** — 차량번호와
VIN이 섞여 있다).

```
carzen response meta: {"errCode":"0000","result":"SUCCESS","status":"200"}
carzen data keys: STATUS,RESPONSE,CARVENDER,CARNAME,...
```

로그 보존 기간이 짧으니(무료 플랜 하루) 등록 직후에 본다.

```
https://supabase.com/dashboard/project/<ref>/functions
```
