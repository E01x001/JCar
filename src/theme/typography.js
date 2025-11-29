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
    button: 16,
  },

  // Font Weights
  fontWeight: {
    regular: '400',
    semiBold: '600',
    bold: '700',
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
  },
};

export default typography;
