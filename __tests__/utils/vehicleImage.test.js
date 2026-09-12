/**
 * 카탈로그 주소가 image_urls에 복제돼 있어도 실사진으로 세지 않는지 본다.
 *
 * 노출 조건이 image_urls를 비어 있지 않기를 요구해서, 실사진이 없는 이식분
 * 차량은 카탈로그 주소를 image_urls에도 넣어 뒀다(14대). 그걸 실사진으로 보면
 * 흰 배경 PNG를 cover로 잘라 그리게 된다 — 조용히 어그러지는 종류라 테스트로 묶는다.
 */
import { pickVehicleImage, realPhotosOf } from '../../src/utils/vehicleImage';

const CATALOG = 'https://www.cartory.net/cars/palisade.png';
const PHOTO = 'https://xyz.supabase.co/storage/v1/object/public/vehicles/uid/a.jpg';

describe('realPhotosOf', () => {
  it('카탈로그와 같은 주소는 실사진에서 뺀다', () => {
    expect(realPhotosOf({ imageUrls: [CATALOG], catalogImageUrl: CATALOG })).toEqual([]);
  });

  it('실사진과 카탈로그가 섞여 있으면 실사진만 남긴다', () => {
    expect(realPhotosOf({ imageUrls: [CATALOG, PHOTO], catalogImageUrl: CATALOG }))
      .toEqual([PHOTO]);
  });

  it('순서를 바꾸지 않는다 — 첫 칸이 대표다', () => {
    const b = `${PHOTO}?2`;
    expect(realPhotosOf({ imageUrls: [PHOTO, b] })).toEqual([PHOTO, b]);
  });

  it('단일 imageUrl만 있어도 읽는다', () => {
    expect(realPhotosOf({ imageUrl: PHOTO })).toEqual([PHOTO]);
  });

  it('빈 값에서 터지지 않는다', () => {
    expect(realPhotosOf(null)).toEqual([]);
    expect(realPhotosOf({})).toEqual([]);
    expect(realPhotosOf({ imageUrls: [] })).toEqual([]);
  });
});

describe('pickVehicleImage', () => {
  it('복제된 카탈로그뿐이면 카탈로그로 보고 contain을 쓴다', () => {
    expect(pickVehicleImage({ imageUrls: [CATALOG], catalogImageUrl: CATALOG }))
      .toEqual({ uri: CATALOG, resizeMode: 'contain', isCatalog: true });
  });

  it('실사진이 있으면 실사진을 cover로 쓴다', () => {
    expect(pickVehicleImage({ imageUrls: [PHOTO], catalogImageUrl: CATALOG }))
      .toEqual({ uri: PHOTO, resizeMode: 'cover', isCatalog: false });
  });

  it('둘 다 없으면 null', () => {
    expect(pickVehicleImage({ imageUrls: [] })).toBeNull();
  });
});
