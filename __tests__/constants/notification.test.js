// __tests__/constants/notification.test.js
//
// notifications.type에는 **일부러 CHECK 제약이 없다** — 알림 INSERT가 상태변경과 같은
// 트랜잭션에서 일어나므로 제약 위반이 상담 승인 자체를 롤백시키기 때문이다.
// 즉 화면은 모르는 타입을 반드시 받을 수 있다. 그 전제를 여기서 고정한다.

import {
  NOTIFICATION_TYPE,
  iconFor,
  toneFor,
  routeFor,
  DEFAULT_ICON,
  DEFAULT_TONE,
} from '../../src/constants/notification';

describe('iconFor / toneFor', () => {
  it('알려진 모든 타입에 아이콘과 톤이 있다', () => {
    for (const type of Object.values(NOTIFICATION_TYPE)) {
      expect(iconFor(type)).toBeTruthy();
      expect(toneFor(type)).toBeTruthy();
    }
  });

  it('모르는 타입도 기본값으로 안전하게 처리한다', () => {
    // DB에 CHECK가 없으므로 트리거가 새 타입을 넣으면 앱이 먼저 만난다
    expect(iconFor('brand_new_type_2027')).toBe(DEFAULT_ICON);
    expect(toneFor('brand_new_type_2027')).toBe(DEFAULT_TONE);
  });

  it('type이 null/undefined여도 기본값을 준다', () => {
    // notifications.type은 nullable이다
    expect(iconFor(null)).toBe(DEFAULT_ICON);
    expect(iconFor(undefined)).toBe(DEFAULT_ICON);
    expect(toneFor(null)).toBe(DEFAULT_TONE);
  });
});

describe('routeFor — 푸시 딥링크와 같은 규약', () => {
  it('상담 알림은 consultationId를 실어 상담 상세로 보낸다', () => {
    const route = routeFor({
      type: NOTIFICATION_TYPE.CONSULTATION_APPROVED,
      data: { screen: 'UserConsultationDetail', consultationId: 'c-1' },
    });
    expect(route).toEqual({
      screen: 'UserConsultationDetail',
      params: { consultationId: 'c-1' },
    });
  });

  it('차량 알림은 vehicleId를 실어 보낸다', () => {
    const route = routeFor({
      type: NOTIFICATION_TYPE.VEHICLE_APPROVED,
      data: { screen: 'VehicleDetail', vehicleId: 'v-1' },
    });
    expect(route).toEqual({ screen: 'VehicleDetail', params: { vehicleId: 'v-1' } });
  });

  it('screen이 없으면 이동하지 않는다', () => {
    expect(routeFor({ data: { consultationId: 'c-1' } })).toBeNull();
    expect(routeFor({ data: {} })).toBeNull();
    expect(routeFor({})).toBeNull();
    expect(routeFor(null)).toBeNull();
  });

  it('id가 없으면 파라미터 없이 화면만 연다', () => {
    expect(routeFor({ data: { screen: 'MyVehicles' } })).toEqual({
      screen: 'MyVehicles',
      params: {},
    });
  });

  it('data가 객체가 아니면 이동하지 않는다', () => {
    expect(routeFor({ data: 'not-an-object' })).toBeNull();
    expect(routeFor({ data: null })).toBeNull();
  });
});
