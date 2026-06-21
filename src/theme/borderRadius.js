/**
 * JCar Design System - Border Radius
 *
 * Consistent border radius values for UI elements.
 * Based on the UI/UX Improvement PRD.
 */

export const borderRadius = {
  small: 4,   // Tags, badges
  medium: 8,  // Buttons, input fields, cards
  large: 12,  // Modals, large cards
  round: 999, // Avatars, circular buttons (use large value for full round)

  // --- 시안(J-Car.dc.html) 시맨틱 라운드 (additive) ---
  chip: 9,    // 상태 칩, 태그
  input: 12,  // 입력 필드
  button: 14, // 버튼, CTA
  card: 16,   // 차량 카드 등
  cardLg: 20, // 대형 카드/시트

  // --- 하위호환 별칭 (정합성 복구) ---
  // 기존 코드 다수가 sm/md/lg/xl를 참조하나 키가 없어 undefined(→radius 0)로 깨져 있었음.
  // small/medium/large와 동일 값으로 별칭 제공.
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
};

export default borderRadius;
