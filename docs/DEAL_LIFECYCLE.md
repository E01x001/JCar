# 차량 등록 · 상담 · 매입 흐름

> 2026-08-23 정리. 로직이 서비스·RPC·상수 세 군데에 흩어져 있어 전체 그림이
> 코드만 봐서는 잘 보이지 않는다. 특히 "판매 상담을 넣었는데 왜 매입예정 그대로인가"는
> 실제로 나온 질문이다 — 버그가 아니라 설계다.

## 핵심 전제

**회사가 아직 사지 않은 차량도 목록에 노출한다.**

이것이 이 설계의 출발점이다. 재고만 노출하면 매물이 거의 없고, 매입을 먼저 하면
안 팔릴 위험을 회사가 떠안는다. 대신 **먼저 노출해 구매 수요를 받고, 살 사람이
나타나면 그때 매입한다.** `DEAL_STAGE_VISIBLE`이 `sold`만 제외하는 이유다.

## 단계 (`vehicles.deal_stage`)

| 단계 | 라벨 | 뜻 |
|---|---|---|
| `listed` | 매입예정 | 소유자가 등록. 회사는 아직 안 샀다. |
| `acquiring` | 매입진행중 | **살 사람이 나타났다.** 회사가 매입을 서두르는 중. |
| `in_stock` | 즉시거래 | 회사가 매입 완료. 재고. |
| `sold` | 판매완료 | 구매자에게 판매됨. 목록에서 제외. |

## 전이

```
① 소유자가 차량 등록
   → listed
   VehicleRegistrationScreen · vehicles_insert_own 정책이 deal_stage='listed' 강제

② 소유자가 판매 상담 신청
   → listed 유지  ★ 전환하지 않는다
   "내 차 사가세요"는 아직 제안일 뿐이고 회사는 검토도 하지 않았다.
   이 시점에 "매입진행중" 배지를 붙이면 구매자에게 사실과 다른 신호를 준다.

③ 다른 사용자가 그 차량에 구매 상담 신청
   → acquiring
   consultationService.saveConsultationRequest 가 type==='buy'일 때만
   RPC mark_vehicle_acquiring 호출.
   사겠다는 사람이 생겼으니 비로소 회사가 매입할 이유가 확정된다.

④ 관리자가 판매 상담을 거래완료 처리
   → in_stock
   RPC complete_sell_consultation 이 한 트랜잭션으로:
     상담 completed + deal_amount/completed_by 기록
     admin_owned_vehicles 매입기록 (consultation_id UNIQUE → 멱등)
     vehicles: deal_stage=in_stock, is_admin_owned=true, current_owner_id=관리자
     vehicle_pricing.purchase_price 기록
```

`③`을 거치지 않고 `②→④`로 바로 갈 수 있다. 회사가 구매 수요와 무관하게
매입을 결정하는 경우다. `acquiring`은 필수 경유지가 아니다.

## 왜 판매 상담은 전환하지 않는가

구매 상담과 판매 상담은 **매입 동기의 확실성이 다르다.**

- 구매 상담: 반대편에 이미 사겠다는 사람이 있다 → 매입 동기 확정
- 판매 상담: 소유자의 일방적 제안 → 회사가 받을지 미정

`acquiring`(매입진행중)은 구매자 화면에 배지로 노출되는 상태다.
회사가 검토도 안 한 매물에 그 배지를 붙이면 표시가 실제와 어긋난다.

한때 "판매 상담 승인 시 전환"을 검토했으나 철회했다 — 승인하면 곧바로 ④의
매입 완료로 가므로 `acquiring`을 스쳐 갈 이유가 없다.

## 권한 경계

`deal_stage`는 **일반 사용자가 직접 바꿀 수 없다.** `guard_vehicle_update`
트리거가 막는다(`status`·`hidden`·`seller_id`·`is_admin_owned`도 함께).

`③`의 전환은 구매자가 하는데, 구매자에게는 그 차량에 대한 update 권한이 없다.
그래서 SECURITY DEFINER RPC `mark_vehicle_acquiring`을 경유한다.
이 RPC는 스스로 자격을 검사한다:

- 로그인 + 활성 계정
- 관리자가 아니라면 **그 차량에 본인 명의의 진행 중인 구매 상담이 존재**
  (`pending`·`approved`·`confirmed`·`on-hold`. 완료·보관된 상담은 근거가 되지 않는다)

통과하면 트랜잭션 한정 플래그 `app.bypass_vehicle_guard='deal_stage'`를 세워
**그 컬럼 하나만** 가드를 면제한다. `set_config`는 pg_catalog 함수라
PostgREST로 직접 호출할 수 없어 클라이언트가 위조할 수 없다.

> 이력: 이 RPC는 원래 검사가 "로그인했는가" 하나뿐이었고, 실제로는 가드
> 트리거에 막혀 **아무 일도 일어나지 않았다**(호출부가 실패를 로그로만 삼킴).
> 즉 `③` 전환은 2026-08-22까지 한 번도 동작한 적이 없다.
> `20260822170000` + `20260823090000`에서 교정.

## 가격

`vehicle_pricing`은 **관리자 전용**(RLS)이다. 일반 사용자 화면에는 어떤 경로로도
가격을 렌더링하지 않고 "상담 후 안내"를 보여준다. `④`에서 기록되는
`purchase_price`도 같은 테이블이라 구매자에게 노출되지 않는다.

## 관련 파일

| 무엇 | 어디 |
|---|---|
| 단계 상수·라벨·노출 목록 | `src/constants/vehicle.js` |
| 상담 접수 + `③` 전환 호출 | `src/services/consultation/consultationService.js` |
| 거래완료(`④`) 호출부 | 같은 파일 `completeConsultation` |
| 매입 완료 RPC | `complete_sell_consultation` (DB) |
| 전환 RPC | `mark_vehicle_acquiring` (DB) |
| 컬럼 가드 | `app_private.guard_vehicle_update` (DB) |
