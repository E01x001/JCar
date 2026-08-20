/**
 * JCar Design System - Spacing
 *
 * Consistent spacing values for margins and paddings.
 * Based on the UI/UX Improvement PRD.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  // 화면 좌우 여백 기준값.
  // 이 토큰이 없어 화면마다 16/18/20/22/26이 제각각 쓰였다(5종).
  // 홈·차량 목록이 쓰던 20을 기준으로 삼는다 — 첫 화면이 기준이 되는 게 자연스럽다.
  screenX: 20,
};

export default spacing;
