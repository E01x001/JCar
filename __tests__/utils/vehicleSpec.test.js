import { formatWiper, formatBatteries } from '../../src/utils/vehicleSpec';

describe('formatWiper', () => {
  it('명세 예시 형식을 사람이 읽는 문장으로 푼다', () => {
    expect(formatWiper('D:600;P:400;R:전용'))
      .toBe('운전석 600mm · 조수석 400mm · 후면 전용');
  });

  it('숫자에만 mm를 붙인다', () => {
    expect(formatWiper('D:650')).toBe('운전석 650mm');
    expect(formatWiper('R:전용')).toBe('후면 전용');
  });

  it('빈 값은 null', () => {
    expect(formatWiper(null)).toBeNull();
    expect(formatWiper('')).toBeNull();
    expect(formatWiper(undefined)).toBeNull();
  });

  // 조회처가 형식을 바꿔도 빈칸이 되면 안 된다 — 원문이라도 보여야 진단이 된다
  it('모르는 형식은 원문 그대로 돌려준다', () => {
    expect(formatWiper('600/400')).toBe('600/400');
    expect(formatWiper('X:600')).toBe('X:600');
    expect(formatWiper('D:')).toBe('D:');
  });
});

describe('formatBatteries', () => {
  it('브랜드·모델·종류를 한 줄로 합친다', () => {
    expect(formatBatteries([
      { brand: '로케트', model: '56211', type: 'DIN' },
      { brand: '솔라이트', model: 'DIN63L', type: 'DIN' },
    ])).toEqual(['로케트 56211 (DIN)', '솔라이트 DIN63L (DIN)']);
  });

  it('종류가 없으면 괄호를 붙이지 않는다', () => {
    expect(formatBatteries([{ brand: '델코', model: 'DIN50HL', type: null }]))
      .toEqual(['델코 DIN50HL']);
  });

  it('이름이 될 값이 하나도 없는 항목은 버린다', () => {
    expect(formatBatteries([{ brand: null, model: null, type: 'DIN' }])).toEqual([]);
  });

  it('배열이 아니면 빈 배열', () => {
    expect(formatBatteries(null)).toEqual([]);
    expect(formatBatteries(undefined)).toEqual([]);
    expect(formatBatteries('DIN63L')).toEqual([]);
  });
});
