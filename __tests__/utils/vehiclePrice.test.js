// __tests__/utils/vehiclePrice.test.js
//
// 가격 비공개는 이 프로젝트에서 가장 강한 비즈니스 규칙이다:
// **가격은 관리자만 볼 수 있고, 일반 사용자는 어떤 화면에서도 보지 않는다.**
// DB(vehicle_pricing + RLS)가 1차 방어지만, 판정 함수가 조용히 뒤집히면
// 관리자 화면 밖으로 가격이 새는 경로가 생긴다. 회귀를 여기서 잡는다.

import { canViewVehiclePrice, PRICE_HIDDEN_LABEL } from '../../src/utils/vehiclePrice';

describe('canViewVehiclePrice', () => {
  const vehicle = { id: 'v1', sellerId: 'seller-1', currentOwnerId: 'seller-1' };

  it('관리자는 볼 수 있다', () => {
    expect(canViewVehiclePrice(vehicle, { uid: 'admin-1', role: 'admin' })).toBe(true);
  });

  it('일반 사용자는 볼 수 없다', () => {
    expect(canViewVehiclePrice(vehicle, { uid: 'user-1', role: 'user' })).toBe(false);
  });

  it('차량 소유자(판매자)여도 볼 수 없다', () => {
    // 의도된 정책이다 — 소유자에게도 가격은 상담을 통해서만 안내한다
    expect(canViewVehiclePrice(vehicle, { uid: 'seller-1', role: 'user' })).toBe(false);
  });

  it('비로그인(viewer 없음)은 볼 수 없다', () => {
    expect(canViewVehiclePrice(vehicle, null)).toBe(false);
    expect(canViewVehiclePrice(vehicle, undefined)).toBe(false);
  });

  it('role이 없거나 예상 밖 값이면 볼 수 없다 (fail-closed)', () => {
    expect(canViewVehiclePrice(vehicle, { uid: 'u' })).toBe(false);
    expect(canViewVehiclePrice(vehicle, { uid: 'u', role: '' })).toBe(false);
    expect(canViewVehiclePrice(vehicle, { uid: 'u', role: 'ADMIN' })).toBe(false);
    expect(canViewVehiclePrice(vehicle, { uid: 'u', role: 'superadmin' })).toBe(false);
  });

  it('차량 정보가 없어도 판정은 뷰어 기준으로만 이뤄진다', () => {
    expect(canViewVehiclePrice(null, { uid: 'admin-1', role: 'admin' })).toBe(true);
    expect(canViewVehiclePrice(null, { uid: 'user-1', role: 'user' })).toBe(false);
  });
});

describe('PRICE_HIDDEN_LABEL', () => {
  it('가격 자리에 노출할 문구가 정의돼 있다', () => {
    // 화면들이 이 상수를 공유하므로 값이 비면 빈 칸이 노출된다
    expect(typeof PRICE_HIDDEN_LABEL).toBe('string');
    expect(PRICE_HIDDEN_LABEL.length).toBeGreaterThan(0);
  });

  it('문구에 숫자가 섞이지 않는다 (가격처럼 보이면 안 된다)', () => {
    expect(PRICE_HIDDEN_LABEL).not.toMatch(/\d/);
  });
});
