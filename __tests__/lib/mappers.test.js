// __tests__/lib/mappers.test.js
//
// DB(snake_case) ↔ 앱(camelCase) 경계. 모든 서비스가 이 지점을 지나므로
// 여기가 조용히 어긋나면 화면 전체에서 값이 undefined가 되거나
// 잘못된 컬럼에 쓰기가 발생한다.

import {
  rowToApp,
  appToRow,
  vehicleRowToApp,
  consultationRowToApp,
} from '../../src/lib/mappers';

describe('rowToApp', () => {
  it('snake_case 키를 camelCase로 바꾼다', () => {
    expect(rowToApp({ fcm_token: 't', image_urls: ['a'], vehicle_no: '12가3456' })).toEqual({
      fcmToken: 't',
      imageUrls: ['a'],
      vehicleNo: '12가3456',
    });
  });

  it('타임스탬프 컬럼을 epoch ms 숫자로 바꾼다', () => {
    const out = rowToApp({ created_at: '2026-08-18T00:00:00.000Z' });
    expect(out.createdAt).toBe(Date.parse('2026-08-18T00:00:00.000Z'));
    expect(typeof out.createdAt).toBe('number');
  });

  it('타임스탬프가 아닌 문자열은 건드리지 않는다', () => {
    // preferred_date는 날짜지만 TIMESTAMP_KEYS에 없다 — 화면이 문자열로 다룬다
    const out = rowToApp({ preferred_date: '2026-08-18' });
    expect(out.preferredDate).toBe('2026-08-18');
  });

  it('null 타임스탬프는 null로 유지한다', () => {
    expect(rowToApp({ deleted_at: null }).deletedAt).toBeNull();
  });

  it('이미 숫자인 타임스탬프를 다시 변환하지 않는다 (멱등)', () => {
    const ms = 1755000000000;
    expect(rowToApp({ created_at: ms }).createdAt).toBe(ms);
  });

  it('행이 아니면 그대로 돌려준다', () => {
    expect(rowToApp(null)).toBeNull();
    expect(rowToApp(undefined)).toBeUndefined();
    expect(rowToApp('x')).toBe('x');
  });
});

describe('appToRow', () => {
  it('camelCase 키를 snake_case로 바꾼다', () => {
    expect(appToRow({ fcmToken: 't', imageUrls: ['a'] })).toEqual({
      fcm_token: 't',
      image_urls: ['a'],
    });
  });

  it('undefined 필드는 제외한다 (부분 업데이트에서 컬럼을 지우지 않도록)', () => {
    const row = appToRow({ name: '홍길동', phoneNumber: undefined });
    expect(row).toEqual({ name: '홍길동' });
    expect('phone_number' in row).toBe(false);
  });

  it('null은 제외하지 않는다 (의도적으로 값을 비우는 경우)', () => {
    expect(appToRow({ fcmToken: null })).toEqual({ fcm_token: null });
  });

  it('이미 snake_case인 키는 그대로 둔다', () => {
    expect(appToRow({ fcm_token: 't' })).toEqual({ fcm_token: 't' });
  });
});

describe('왕복(round-trip) 비대칭 — 알고 쓰라고 고정해두는 동작', () => {
  // 현재 모든 appToRow 호출부는 새 객체를 만들어 넘기므로 실제 버그는 없다.
  // 다만 "rowToApp 결과를 그대로 appToRow에 넣어도 되겠지"라는 가정은 틀렸다.

  it('타임스탬프는 왕복되지 않는다 — epoch ms가 그대로 나간다', () => {
    const app = rowToApp({ created_at: '2026-08-18T00:00:00.000Z' });
    const back = appToRow(app);
    // ISO 문자열로 복원되지 않는다. timestamptz 컬럼에 숫자를 쓰면 거부된다.
    expect(typeof back.created_at).toBe('number');
  });

  it('vehicleRowToApp의 vehicleId 별칭은 DB 컬럼이 아니다', () => {
    const app = vehicleRowToApp({ id: 'uuid-1', vehicle_no: '12가3456' });
    expect(app.id).toBe('uuid-1');
    expect(app.vehicleId).toBe('12가3456'); // 차량번호(레거시 화면 호환)

    // 그대로 되돌리면 vehicle_id 컬럼에 차량번호가 들어간다 — 그렇게 쓰면 안 된다
    expect(appToRow(app).vehicle_id).toBe('12가3456');
  });

  it('키 안의 숫자는 왕복되지 않는다 (현재 스키마에는 해당 컬럼이 없음)', () => {
    const app = rowToApp({ field_2: 'x' });
    expect(app.field2).toBe('x');
    expect(appToRow(app)).toEqual({ field2: 'x' }); // field_2로 돌아가지 않는다
  });
});

describe('vehicleRowToApp', () => {
  it('imageUrls 배열의 첫 장을 imageUrl로 노출한다 (레거시 화면 호환)', () => {
    expect(vehicleRowToApp({ image_urls: ['a.jpg', 'b.jpg'] }).imageUrl).toBe('a.jpg');
  });

  it('이미지가 없으면 imageUrl은 null이다', () => {
    expect(vehicleRowToApp({ image_urls: [] }).imageUrl).toBeNull();
    expect(vehicleRowToApp({ image_urls: null }).imageUrl).toBeNull();
    expect(vehicleRowToApp({}).imageUrl).toBeNull();
  });

  it('가격 컬럼을 만들어내지 않는다', () => {
    // vehicles 테이블에는 가격이 없다(vehicle_pricing, 관리자 전용).
    // 매퍼가 실수로 기본값을 채우면 화면이 0원을 그릴 수 있다.
    const app = vehicleRowToApp({ id: 'v1', vehicle_no: '12가3456' });
    expect(app.price).toBeUndefined();
  });

  it('행이 없으면 그대로 돌려준다', () => {
    expect(vehicleRowToApp(null)).toBeNull();
  });
});

describe('consultationRowToApp', () => {
  it("time 타입 'HH:MM:SS'를 화면이 기대하는 'HH:MM'으로 자른다", () => {
    expect(consultationRowToApp({ preferred_time: '14:30:00' }).preferredTime).toBe('14:30');
  });

  it("이미 'HH:MM'이면 그대로 둔다", () => {
    expect(consultationRowToApp({ preferred_time: '14:30' }).preferredTime).toBe('14:30');
  });

  it('시간이 없으면 그대로 둔다', () => {
    expect(consultationRowToApp({ preferred_time: null }).preferredTime).toBeNull();
  });

  it('나머지 필드는 일반 규칙을 따른다', () => {
    const c = consultationRowToApp({
      user_id: 'u1',
      consultation_status: 'pending',
      created_at: '2026-08-18T00:00:00.000Z',
    });
    expect(c.userId).toBe('u1');
    expect(c.consultationStatus).toBe('pending');
    expect(typeof c.createdAt).toBe('number');
  });
});
