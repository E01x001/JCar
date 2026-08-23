-- 실사진과 참고 이미지를 분리한다
--
-- 배경: 등록 화면이 사용자 사진이 없으면 CarZen 카탈로그 이미지를 image_urls에
-- 채워 넣는다(`https://www.cartory.net/cars/{CARURL}`). 그래서 모든 차량이 항상
-- "사진 1장 이상"이고, **사진 없는 차량이라는 상태가 존재하지 않는다.**
--
-- 앞으로 두 가지가 걸린다:
--   * 실사진 1장 이상을 등록 조건으로 삼는다
--   * 국토부 API로 옮기면 카탈로그 이미지가 아예 없다. 대신 Wikimedia Commons
--     이미지를 참고용으로 붙일 수 있는데, 그걸 image_urls에 섞으면 같은 문제가
--     반복된다.
--
-- 그래서 컬럼을 나눈다:
--   image_urls        — 판매자가 직접 찍은 사진. 노출 여부를 결정한다.
--   catalog_image_url — 모델 참고 이미지. 노출 판단에 쓰지 않는다.
--
-- 이 마이그레이션은 컬럼만 만든다. 노출 규칙 변경과 기존 데이터 이관은
-- 사진 추가 화면이 생긴 뒤에 한다 — 먼저 걸면 기존 차량이 빠져나올 방법이 없다.

alter table public.vehicles
  add column if not exists catalog_image_url text;

comment on column public.vehicles.catalog_image_url is
  '모델 참고 이미지(카탈로그/Commons). 실사진이 아니므로 노출 판단에 쓰지 않는다.';

comment on column public.vehicles.image_urls is
  '판매자가 직접 촬영한 사진. 1장 이상이어야 다른 사용자에게 노출된다.';

-- 컬럼 단위 그랜트 체계를 따른다(20260708161043 참고).
-- 소유자가 등록·수정할 수 있어야 하고, 권한 컬럼이 아니므로 제한할 이유가 없다.
grant insert (catalog_image_url) on public.vehicles to authenticated;
grant update (catalog_image_url) on public.vehicles to authenticated;
