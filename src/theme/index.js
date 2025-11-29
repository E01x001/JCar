/**
 * JCar Design System - Theme
 *
 * Main theme object that consolidates all design tokens.
 * This serves as the single source of truth for all UI styling.
 */

import colors from './colors';
import typography from './typography';
import spacing from './spacing';
import borderRadius from './borderRadius';
import shadows from './shadows';

/**
 * Main theme object containing all design tokens
 */
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

// Export individual tokens for convenience
export { colors, typography, spacing, borderRadius, shadows };

export default theme;
