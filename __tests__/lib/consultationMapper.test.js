/**
 * consultationRowToApp — DB null을 화면이 기대하는 형태로 정규화하는지.
 *
 * 이 테스트가 있는 이유: alternative_slots(jsonb)가 null로 오는데 화면들이
 * `alternativeSlots = []` 구조분해 기본값을 쓰고 있었다. 기본값은 undefined에만
 * 적용되므로 null이 그대로 통과해 `.length`에서 터졌다 — 관리자 상담관리 화면이
 * 통째로 ErrorBoundary로 떨어졌다(2026-08-23).
 */
import { consultationRowToApp } from '../../src/lib/mappers';

describe('consultationRowToApp', () => {
  it('alternative_slots가 null이면 빈 배열로 정규화한다', () => {
    const c = consultationRowToApp({ id: 'c1', alternative_slots: null });
    expect(c.alternativeSlots).toEqual([]);
  });

  it('alternative_slots가 없어도 빈 배열이다', () => {
    const c = consultationRowToApp({ id: 'c1' });
    expect(c.alternativeSlots).toEqual([]);
  });

  it('실제 슬롯이 있으면 그대로 보존한다', () => {
    const slots = [{ date: '2026-09-01', time: '10:00' }];
    const c = consultationRowToApp({ id: 'c1', alternative_slots: slots });
    expect(c.alternativeSlots).toEqual(slots);
  });

  it('배열이 아닌 값이 와도 배열을 보장한다 (fail-safe)', () => {
    const c = consultationRowToApp({ id: 'c1', alternative_slots: 'garbage' });
    expect(Array.isArray(c.alternativeSlots)).toBe(true);
  });

  it('preferredTime은 HH:MM으로 잘라 준다', () => {
    const c = consultationRowToApp({ id: 'c1', preferred_time: '18:00:00' });
    expect(c.preferredTime).toBe('18:00');
  });

  it('row가 없으면 그대로 돌려준다', () => {
    expect(consultationRowToApp(null)).toBeNull();
  });
});
