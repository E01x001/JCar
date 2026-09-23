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

/**
 * 터치 가능한 컨트롤의 최소 높이/너비(dp).
 *
 * 왜 상수로 두는가: 관리자 상담 카드의 보조 버튼(보류·메모·일정 제안)이 높이를
 * 지정하지 않아 실제 17px(아이콘 크기)로 렌더됐다. 마우스로는 눌리지만 손가락은
 * 대부분 빗나가고, 그 탭이 부모 카드에 떨어져 **엉뚱한 화면으로 이동**했다.
 * 안드로이드에서만 재현된 이유가 이것이다(마우스는 픽셀 단위로 정확하다).
 *
 * RN 공식 문서 권고는 30–40dp, Material은 48dp다. 44를 최소선으로 삼고
 * 필요하면 hitSlop으로 더 넓힌다. 아이콘만 있는 작은 컨트롤은 이 값을 쓸 것.
 */
export const TOUCH_TARGET_MIN = 44;

export default spacing;
