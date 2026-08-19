
describe('formatRelativeTime', () => {
  const { formatRelativeTime } = require('../../src/utils/format');
  const NOW = new Date('2026-08-19T12:00:00.000Z').getTime();
  const minutesAgo = (m) => NOW - m * 60 * 1000;

  it('1분 미만은 "방금"', () => {
    expect(formatRelativeTime(minutesAgo(0.5), NOW)).toBe('방금');
  });

  it('분 단위', () => {
    expect(formatRelativeTime(minutesAgo(3), NOW)).toBe('3분 전');
    expect(formatRelativeTime(minutesAgo(59), NOW)).toBe('59분 전');
  });

  it('시간 단위', () => {
    expect(formatRelativeTime(minutesAgo(60), NOW)).toBe('1시간 전');
    expect(formatRelativeTime(minutesAgo(60 * 23), NOW)).toBe('23시간 전');
  });

  it('하루 전은 "어제"', () => {
    expect(formatRelativeTime(minutesAgo(60 * 24), NOW)).toBe('어제');
  });

  it('2~6일은 일 단위', () => {
    expect(formatRelativeTime(minutesAgo(60 * 24 * 3), NOW)).toBe('3일 전');
  });

  it('7일 이상은 절대 날짜로 넘어간다', () => {
    // 상대 표기가 오히려 읽기 어려워지는 지점
    expect(formatRelativeTime(minutesAgo(60 * 24 * 7), NOW)).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
  });

  it('미래 시각(기기 시계 어긋남)은 "방금"으로 흡수한다', () => {
    expect(formatRelativeTime(NOW + 60 * 60 * 1000, NOW)).toBe('방금');
  });

  it('잘못된 값은 "-"', () => {
    expect(formatRelativeTime(null, NOW)).toBe('-');
    expect(formatRelativeTime('나쁜값', NOW)).toBe('-');
  });
});
