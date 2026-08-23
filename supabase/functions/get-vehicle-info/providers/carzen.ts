// CarZen(datahub-dev.scraping.co.kr) 조회처.
//
// 스크래핑 기반이라 정비 소모품 정보(연비·연료탱크·엔진오일·와이퍼·배터리)까지
// 돌려주고, 카탈로그 이미지 경로(CARURL)도 준다. 대신 유료다.

import type {
  NormalizedVehicle,
  VehicleLookupResult,
  VehicleProvider,
} from "../types.ts";
import { VehicleNotFoundError } from "../types.ts";

const CARZEN_URL =
  "https://datahub-dev.scraping.co.kr/assist/common/carzen/CarAllInfoInquiry";

/** 값이 없으면 undefined가 아니라 null을 돌려준다 — 조용한 누락을 막는다 */
const text = (v: unknown): string | null =>
  v === null || v === undefined || v === "" ? null : String(v);

const int = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
    // 연비·연료탱크·좌석·와이퍼·배터리가 저장된 두 대 모두 비어 있어서,
    // 우리가 읽는 이름이 실제 응답에 있는지 확인이 필요하다.
    console.log("carzen data keys:", Object.keys(d).join(","));
    if (Array.isArray(d.BATTERYLIST) && d.BATTERYLIST[0]) {
      console.log("carzen BATTERYLIST[0] keys:", Object.keys(d.BATTERYLIST[0]).join(","));
    }

    const vehicle: NormalizedVehicle = {
      vehicleName: text(d.CARNAME),
      subModel: text(d.SUBMODEL),
      manufacturer: text(d.CARVENDER),
      year: int(d.CARYEAR),

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
      // MODEL 키가 없으면 null. 예전에는 'Unknown' 폴백이 있었는데도 DB가 NULL이라
      // 표현식이 undefined였다는 뜻이었다 — 그 경로를 여기서 닫는다.
      battery: text(d.BATTERYLIST?.[0]?.MODEL),

      vin: text(d.VIN),

      catalogImageUrl: d.CARURL ? `https://www.cartory.net/cars/${d.CARURL}` : null,
    };

    return { vehicle, provider: this.name, raw: d };
  }
}
