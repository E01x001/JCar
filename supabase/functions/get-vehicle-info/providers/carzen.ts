// CarZen(datahub-dev.scraping.co.kr) 조회처.
//
// 스크래핑 기반이라 정비 소모품 정보(연비·연료탱크·엔진오일·와이퍼·배터리)까지
// 돌려주고, 카탈로그 이미지 경로(CARURL)와 신차가격(PRICE)도 준다. 대신 유료다.
//
// 명세(CarAllInfoInquiry) 대비 우리가 쓰지 않는 필드는 이제 셋뿐이다:
//   STATUS/RESPONSE/RESULT/ERRMSG — 제어 필드(성공 판정에만 쓴다)
// 데이터 필드는 전부 정규화 형태로 옮긴다.

import type {
  BatteryOption,
  NormalizedVehicle,
  VehicleLookupResult,
  VehicleProvider,
} from "../types.ts";
import { VehicleNotFoundError } from "../types.ts";

// 개발계. 운영 전환 시 api.mydatahub.co.kr로 바꾼다(명세 2항).
const CARZEN_URL =
  "https://datahub-dev.scraping.co.kr/assist/common/carzen/CarAllInfoInquiry";

/** 값이 없으면 undefined가 아니라 null을 돌려준다 — 조용한 누락을 막는다 */
const text = (v: unknown): string | null =>
  v === null || v === undefined || v === "" ? null : String(v);

const int = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * BATTERYLIST[] → BatteryOption[].
 *
 * 예전에는 [0].MODEL 하나만 남기고 나머지를 버렸다. 명세 예시만 봐도 한 차량에
 * 브랜드가 넷(로케트·솔라이트·델코·아트라스) 붙는다 — 그건 "배터리 모델"이
 * 아니라 **호환 배터리 목록**이고, 정비 화면이 쓸 값이다.
 *
 * 세 필드가 모두 빈 항목은 버린다. 남는 게 없으면 빈 배열이 아니라 null이다
 * ("조회처가 안 줬다"와 "빈 목록을 줬다"를 구분한다).
 */
const batteries = (v: unknown): BatteryOption[] | null => {
  if (!Array.isArray(v)) { return null; }

  const list = v
    .map((b): BatteryOption => ({
      brand: text((b as Record<string, unknown>)?.BRAND),
      model: text((b as Record<string, unknown>)?.MODEL),
      type: text((b as Record<string, unknown>)?.TYPE),
    }))
    .filter((b) => b.brand || b.model || b.type);

  return list.length > 0 ? list : null;
};

export class CarzenProvider implements VehicleProvider {
  readonly name = "carzen";

  constructor(private readonly apiKey: string) {}

  async lookup(regiNumber: string, ownerName: string): Promise<VehicleLookupResult> {
    const response = await fetch(CARZEN_URL, {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({ REGINUMBER: regiNumber, OWNERNAME: ownerName }),
    });

    const body = await response.json();

    console.log(
      "carzen response meta:",
      JSON.stringify({
        errCode: body.errCode,
        errMsg: body.errMsg,
        result: body.result,
        status: body.data?.STATUS,
      }),
    );

    if (
      body.errCode !== "0000" ||
      body.result !== "SUCCESS" ||
      String(body.data?.STATUS) !== "200"
    ) {
      throw new VehicleNotFoundError(body.errMsg || "차량 정보를 찾을 수 없습니다.");
    }

    const d = body.data ?? {};

    // 응답의 **키 이름만** 남긴다(값은 남기지 않는다 — 차량번호·VIN이 섞여 있다).
    // 명세와 키 이름은 맞는 것을 확인했지만, 차량에 따라 어떤 항목이 실제로
    // 채워져 오는지는 아직 모른다. 저장된 두 대 모두 연비·연료탱크·좌석·와이퍼·
    // 배터리가 비어 있었고, 그게 "조회처가 안 준 것"인지 확인이 남아 있다.
    console.log("carzen data keys:", Object.keys(d).join(","));

    const batteryList = batteries(d.BATTERYLIST);

    const vehicle: NormalizedVehicle = {
      vehicleName: text(d.CARNAME),
      subModel: text(d.SUBMODEL),
      manufacturer: text(d.CARVENDER),
      year: int(d.CARYEAR),

      catalogUid: text(d.UID),

      fuelType: text(d.FUEL),
      transmission: text(d.MISSION),
      cc: int(d.CC),
      driveType: text(d.DRIVE),
      seats: text(d.SEATS),

      frontTire: text(d.FRONTTIRE),
      rearTire: text(d.REARTIRE),

      fuelEco: text(d.FUELECO),
      fuelTank: text(d.FUELTANK),
      engineOilLiter: text(d.EOILLITER),
      wiperInfo: text(d.WIPER),
      battery: batteryList?.[0]?.model ?? null,
      batteries: batteryList,

      newCarPrice: int(d.PRICE),

      vin: text(d.VIN),

      catalogImageUrl: d.CARURL ? `https://www.cartory.net/cars/${d.CARURL}` : null,
    };

    return { vehicle, provider: this.name, raw: d };
  }
}
