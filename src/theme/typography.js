/**
 * JCar Design System - Typography
 *
 * Font sizes, weights, and line heights for the JCar app.
 * Based on the UI/UX Improvement PRD.
 */

export const typography = {
  // Font Sizes
  fontSize: {
    h1: 28,
    h2: 24,
    h3: 20,
    h4: 18,
    bodyLarge: 16,
    body: 14,
    bodySmall: 12,
    caption: 12, // 별칭(정합성 복구): 다수 코드가 fontSize.caption 참조하나 키 없어 깨져 있었음
    button: 16,
  },

  // Font Weights
  fontWeight: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
    extraBold: '800', // 시안: 가격/타이틀 강조 (H1 등)
  },

  // Line Heights
  lineHeight: {
    heading: 1.3,
    body: 1.5,
    button: 1.2,
  },

  // Text Styles (Presets)
  styles: {
    h1: {
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 28 * 1.3,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 24 * 1.3,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 20 * 1.3,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 18 * 1.3,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 16 * 1.5,
    },
    body: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 14 * 1.5,
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 12 * 1.5,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 16 * 1.2,
    },

    // --- 시안(J-Car.dc.html) 스케일 프리셋 (additive) ---
    // 기존 h1~caption 프리셋은 하위호환 위해 보존. 신규 화면은 아래 프리셋 사용.
    display: {
      // 가격/대형 타이틀: "팰리세이드 4,285만원"
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: -0.6,
    },
    heading: {
      // 섹션 제목: "차량 기본 정보 조회"
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    title: {
      // 카드/리스트 타이틀: "상담 신청이 접수되었습니다"
      fontSize: 16,
      fontWeight: '600',
    },
    bodyDefault: {
      // 본문: "현대 · 2022년식 · 가솔린"
      fontSize: 15,
      fontWeight: '400',
      lineHeight: 15 * 1.6,
    },
    caption: {
      // 보조: "2026-07-18 · 오전 10:00 예약"
      fontSize: 13,
      fontWeight: '400',
    },
  },
};

export default typography;
