/**
 * JCar Design System - Shadows
 *
 * Shadow styles for cards, modals, and elevated elements.
 * Based on the UI/UX Improvement PRD.
 */

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2, // Android elevation
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5, // Android elevation
  },

  // --- 시안(J-Car.dc.html) 소프트 엘리베이션 (additive) ---
  // 네이비 톤의 부드러운 그림자. 테두리 대신 떠 있는 카드 표현.
  soft: {
    shadowColor: '#1A2B5C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 30,
    elevation: 3,
  },
  // Primary 버튼 강조 그림자
  button: {
    shadowColor: '#2B4593',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 4,
  },
  buttonDanger: {
    shadowColor: '#DC3545',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  // 화이트 헤더/탭바 하단·상단 그림자
  header: {
    shadowColor: '#1A2B5C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};

export default shadows;
