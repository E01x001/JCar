/**
 * JCar Design System - Color Palette
 *
 * Brand colors, semantic colors, and neutral colors for the JCar app.
 * Based on the UI/UX Improvement PRD.
 */

export const colors = {
  // Primary Colors (Brand)
  primary: {
    main: '#2B4593',
    light: '#4A63B3',
    dark: '#1A2B5C',
    opacity10: 'rgba(43, 69, 147, 0.1)',
  },

  // Semantic Colors
  success: {
    main: '#28A745',
    light: '#48C765',
    dark: '#1E7B34',
  },
  warning: {
    main: '#FFA000',
    light: '#FFB333',
    dark: '#E68900',
  },
  danger: {
    main: '#DC3545',
    light: '#E55565',
    dark: '#C82333',
  },
  error: {
    main: '#DC3545',
    light: '#E55565',
    dark: '#C82333',
  },
  info: {
    main: '#17A2B8',
    light: '#3BB5C8',
    dark: '#127A8A',
  },

  // Background Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    tertiary: '#F1F3F5',
    card: '#FFFFFF',
    disabled: '#E9ECEF',
  },

  // Text Colors
  text: {
    primary: '#212529',
    secondary: '#6C757D',
    tertiary: '#ADB5BD',
    white: '#FFFFFF',
  },

  // Border Colors
  border: {
    default: '#DEE2E6',
    light: '#E9ECEF',
    subtle: '#E1E5EA', // 시안: 입력/고스트 버튼 테두리
    dark: '#ADB5BD',
  },

  // Neutral Colors
  neutral: {
    white: '#FFFFFF',
    black: '#000000',
    gray100: '#F8F9FA',
    gray200: '#E9ECEF',
    gray300: '#DEE2E6',
    gray400: '#CED4DA',
    gray500: '#ADB5BD',
    gray600: '#6C757D',
    gray700: '#495057',
    gray800: '#343A40',
    gray900: '#212529',
  },

  // Status Colors (for consultation status badges and indicators)
  status: {
    pending: '#FFA000',      // warning color
    approved: '#28A745',     // success color
    confirmed: '#28A745',    // success color
    rejected: '#DC3545',     // danger color
    completed: '#28A745',    // success color
    cancelled: '#6C757D',    // gray color
    'on-hold': '#FFA000',    // warning color
  },

  // 시안 톤다운 상태 칩 (bg/fg/dot) — Badge 신규 스타일용 (additive)
  statusChip: {
    pending:   { bg: '#FFF6E5', fg: '#C77700', dot: '#FFA000' }, // 대기중
    approved:  { bg: '#E7F6EC', fg: '#1E7E34', dot: '#28A745' }, // 승인됨
    rejected:  { bg: '#FCE9EB', fg: '#B02A37', dot: '#DC3545' }, // 거절됨
    completed: { bg: '#EAEFFB', fg: '#2B4593', dot: '#2B4593' }, // 완료
    neutral:   { bg: '#F1F3F5', fg: '#495057', dot: '#ADB5BD' }, // 기타/취소
  },

  // 시안 태그 칩 (차종 등)
  tag: {
    info:    { bg: '#EAF4FF', fg: '#1A6FB5' },
    neutral: { bg: '#F1F3F5', fg: '#495057' },
    accent:  { bg: '#EEF1FA', fg: '#2B4593' },
  },
};

export default colors;
