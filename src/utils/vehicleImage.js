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
 * 실사진을 우선한다 — 구매자가 봐야 하는 것은 실제 그 차다. 카탈로그는
 * 실사진이 없을 때만 쓰이며, 그런 차량은 RLS가 다른 사용자에게 노출하지 않는다
 * (즉 소유자와 관리자 화면에서만 보인다).
 *
 * @param {Object} vehicle - imageUrls / imageUrl / catalogImageUrl 중 있는 것
 * @returns {{uri: string, resizeMode: 'cover'|'contain', isCatalog: boolean}|null}
 */
export const pickVehicleImage = (vehicle) => {
  if (!vehicle) { return null; }

  const real = Array.isArray(vehicle.imageUrls)
    ? vehicle.imageUrls[0]
    : vehicle.imageUrls || vehicle.imageUrl;

  if (real) {
    return { uri: real, resizeMode: 'cover', isCatalog: false };
  }

  if (vehicle.catalogImageUrl) {
    return { uri: vehicle.catalogImageUrl, resizeMode: 'contain', isCatalog: true };
  }

  return null;
};
