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

| 원본 | 정규화 | 저장 |
|---|---|---|
| `CARNAME` | `vehicleName` | `vehicles.vehicle_name` |
| `SUBMODEL` | `subModel` | `vehicles.sub_model` |
| `CARVENDER` | `manufacturer` | `vehicles.manufacturer` |
| `CARYEAR` | `year` | `vehicles.year` |
| `UID` | `catalogUid` | `vehicles.catalog_uid` |
| `FUEL` | `fuelType` | `vehicles.fuel_type` |
| `MISSION` | `transmission` | `vehicles.transmission` |
| `CC` | `cc` | `vehicles.cc` |
| `DRIVE` | `driveType` | `vehicles.drive_type` |
| `SEATS` | `seats` | `vehicles.seats` |
| `FRONTTIRE` / `REARTIRE` | `frontTire` / `rearTire` | `vehicles.front_tire` / `rear_tire` |
| `FUELECO` | `fuelEco` | `vehicles.fuel_eco` |
| `FUELTANK` | `fuelTank` | `vehicles.fuel_tank` |
| `EOILLITER` | `engineOilLiter` | `vehicles.engine_oil_liter` |
| `WIPER` | `wiperInfo` | `vehicles.wiper_info` |
| `BATTERYLIST[]` | `batteries` | `vehicles.batteries` (jsonb) |
| `BATTERYLIST[0].MODEL` | `battery` | `vehicles.battery` (하위호환) |
| **`PRICE`** | `newCarPrice` | **`vehicle_pricing.new_car_price`** — 관리자 전용 |
| `VIN` | `vin` | `vehicle_private_contact.vin` — 비공개 |
| `CARURL` | `catalogImageUrl` | `vehicles.catalog_image_url` |

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

## 운영 전환 전에 할 것

**지금은 개발계(Dev) 주소를 쓴다.**

```
Dev   https://datahub-dev.scraping.co.kr/assist/common/carzen/CarAllInfoInquiry   ← 현재
Prod  https://api.mydatahub.co.kr/assist/common/carzen/CarAllInfoInquiry
```

바꿀 곳은 `providers/carzen.ts`의 `CARZEN_URL` 한 줄이다. 명세상 인증 헤더는
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
