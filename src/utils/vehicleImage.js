/**
 * 차량 이미지 고르기 — 어떤 이미지를 보여줄지와 **어떻게 맞출지**를 함께 정한다.
 *
 * 두 종류가 성격이 다르다:
 *   실사진(image_urls)        판매자가 직접 찍은 사진. 배경이 제각각이라
 *                            상자를 꽉 채워야(cover) 빈틈이 안 생긴다.
 *   카탈로그(catalog_image_url) 흰 배경에 차량만 있는 PNG. 채우면 차가 잘리므로
 *                            잘리지 않게 넣어야(contain) 한다.
 *
 * 리사이즈 방식을 화면마다 고정값으로 두면 둘 중 하나는 반드시 어그러진다.
 * 그래서 이미지를 고르는 쪽이 방식까지 같이 돌려준다.
 *
 * 실사진을 우선한다 — 구매자가 봐야 하는 것은 실제 그 차다.
 *
 * **image_urls에 카탈로그 주소가 들어 있을 수 있다.** 노출 조건이 image_urls를
 * 비어 있지 않기를 요구하므로(20260823133000), 실사진이 없는 차를 목록에
 * 올리려고 같은 주소를 두 칸에 넣어 둔 것이 있다(2026-09-12 이식분 14대 —
 * 시연용 차량이고 그대로 두기로 했다. docs/KNOWN_ISSUES.md ISSUE-09).
 * 배열에 들어 있다는 것만으로 실사진으로 보면 흰 배경 PNG를 cover로 잘라
 * 그리게 된다. 그래서 걸러내는 판단을 여기 한 곳에 둔다.
 *
 * @param {Object} vehicle - imageUrls / imageUrl / catalogImageUrl 중 있는 것
 * @returns {{uri: string, resizeMode: 'cover'|'contain', isCatalog: boolean}|null}
 */
export const realPhotosOf = (vehicle) => {
  if (!vehicle) { return []; }

  const list = Array.isArray(vehicle.imageUrls)
    ? vehicle.imageUrls
    : [vehicle.imageUrls || vehicle.imageUrl].filter(Boolean);

  // 카탈로그 주소와 같은 칸은 실사진이 아니다. 호스트 이름으로 가리지 않는
  // 이유: 옛 Firebase Storage 사진도 우리 버킷 밖 주소라 같이 걸린다.
  return list.filter((url) => url && url !== vehicle.catalogImageUrl);
};

export const pickVehicleImage = (vehicle) => {
  if (!vehicle) { return null; }

  const real = realPhotosOf(vehicle)[0];

  if (real) {
    return { uri: real, resizeMode: 'cover', isCatalog: false };
  }

  if (vehicle.catalogImageUrl) {
    return { uri: vehicle.catalogImageUrl, resizeMode: 'contain', isCatalog: true };
  }

  return null;
};
