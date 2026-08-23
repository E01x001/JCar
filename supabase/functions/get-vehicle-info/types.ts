// 차량 조회 응답의 **공통 형태**.
//
// 존재 이유: 등록 화면이 CarZen 원본 키(CARNAME, BATTERYLIST[0].MODEL 등)를
// 18군데에서 직접 읽고 있었다. 그 상태로는 조회처를 바꾸는 순간 화면을 다 뜯어야
// 한다. 국토교통부 API로 옮기려면 먼저 이 결합을 끊어야 한다.
//
// 규칙: 값을 못 찾으면 **null을 명시한다.** undefined로 두면 appToRow가 키를
// 건너뛰어 컬럼이 조용히 비고, "조회처에 값이 없었다"와 "코드가 흘렸다"를
// 구분할 수 없게 된다(실제로 battery가 그렇게 비어 있었다).

export interface NormalizedVehicle {
  /** 차명 */
  vehicleName: string | null;
  /** 세부 모델/트림 */
  subModel: string | null;
  manufacturer: string | null;
  /** 연식 */
  year: number | null;

  fuelType: string | null;
  transmission: string | null;
  /** 배기량(cc). 전기차는 null이 정상이다. */
  cc: number | null;
  driveType: string | null;
  seats: string | null;

  frontTire: string | null;
  rearTire: string | null;

  // 아래 다섯은 정비 소모품 정보다. 스크래핑 기반인 CarZen이라 얻을 수 있었고,
  // 국토부 제원 항목에는 없을 가능성이 높다. 없으면 null로 온다.
  fuelEco: string | null;
  fuelTank: string | null;
  engineOilLiter: string | null;
  wiperInfo: string | null;
  battery: string | null;

  /** 차대번호. 비공개 테이블에만 저장한다. */
  vin: string | null;

  /**
   * 모델 참고 이미지. 실사진이 아니므로 노출 판단에 쓰지 않는다.
   * 국토부 API는 이미지를 주지 않으므로 그쪽에서는 null이 된다.
   */
  catalogImageUrl: string | null;
}

export interface VehicleLookupResult {
  vehicle: NormalizedVehicle;
  /** 어느 조회처에서 왔는지 — 로그와 디버깅용 */
  provider: string;
  /** 원본 응답. 전환기 하위호환용이며 정규화가 끝나면 뺀다. */
  raw: Record<string, unknown>;
}

/** 조회처 구현이 지켜야 하는 계약 */
export interface VehicleProvider {
  readonly name: string;
  lookup(regiNumber: string, ownerName: string): Promise<VehicleLookupResult>;
}

/** 조회처가 "찾지 못했다"고 답한 경우 — 서버 오류와 구분한다 */
export class VehicleNotFoundError extends Error {}
