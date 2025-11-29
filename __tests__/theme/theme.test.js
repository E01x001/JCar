/**
 * Theme System Tests
 *
 * Unit tests to verify theme values match PRD specifications
 */

import { theme, colors, typography, spacing, borderRadius, shadows } from '../../src/theme';

describe('Theme System', () => {
  describe('Colors', () => {
    it('should have correct primary colors', () => {
      expect(colors.primary.main).toBe('#2B4593');
      expect(colors.primary.light).toBe('#4A63B3');
      expect(colors.primary.dark).toBe('#1A2B5C');
      expect(colors.primary.opacity10).toBe('rgba(43, 69, 147, 0.1)');
    });

    it('should have correct semantic colors', () => {
      expect(colors.success.main).toBe('#28A745');
      expect(colors.warning.main).toBe('#FFA000');
      expect(colors.danger.main).toBe('#DC3545');
      expect(colors.info.main).toBe('#17A2B8');
    });

    it('should have correct background colors', () => {
      expect(colors.background.primary).toBe('#FFFFFF');
      expect(colors.background.secondary).toBe('#F8F9FA');
      expect(colors.background.tertiary).toBe('#F1F3F5');
    });

    it('should have correct text colors', () => {
      expect(colors.text.primary).toBe('#212529');
      expect(colors.text.secondary).toBe('#6C757D');
      expect(colors.text.tertiary).toBe('#ADB5BD');
      expect(colors.text.white).toBe('#FFFFFF');
    });

    it('should have correct border colors', () => {
      expect(colors.border.default).toBe('#DEE2E6');
      expect(colors.border.light).toBe('#E9ECEF');
      expect(colors.border.dark).toBe('#ADB5BD');
    });
  });

  describe('Typography', () => {
    it('should have correct font sizes', () => {
      expect(typography.fontSize.h1).toBe(28);
      expect(typography.fontSize.h2).toBe(24);
      expect(typography.fontSize.h3).toBe(20);
      expect(typography.fontSize.h4).toBe(18);
      expect(typography.fontSize.bodyLarge).toBe(16);
      expect(typography.fontSize.body).toBe(14);
      expect(typography.fontSize.bodySmall).toBe(12);
      expect(typography.fontSize.button).toBe(16);
    });

    it('should have correct font weights', () => {
      expect(typography.fontWeight.regular).toBe('400');
      expect(typography.fontWeight.semiBold).toBe('600');
      expect(typography.fontWeight.bold).toBe('700');
    });

    it('should have correct line heights', () => {
      expect(typography.lineHeight.heading).toBe(1.3);
      expect(typography.lineHeight.body).toBe(1.5);
      expect(typography.lineHeight.button).toBe(1.2);
    });

    it('should have prebuilt text styles', () => {
      expect(typography.styles.h1).toEqual({
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 28 * 1.3,
      });
      expect(typography.styles.body).toEqual({
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 14 * 1.5,
      });
    });
  });

  describe('Spacing', () => {
    it('should have correct spacing values', () => {
      expect(spacing.xs).toBe(4);
      expect(spacing.sm).toBe(8);
      expect(spacing.md).toBe(16);
      expect(spacing.lg).toBe(24);
      expect(spacing.xl).toBe(32);
      expect(spacing.xxl).toBe(48);
    });
  });

  describe('Border Radius', () => {
    it('should have correct border radius values', () => {
      expect(borderRadius.small).toBe(4);
      expect(borderRadius.medium).toBe(8);
      expect(borderRadius.large).toBe(12);
      expect(borderRadius.round).toBe(999);
    });
  });

  describe('Shadows', () => {
    it('should have correct card shadow', () => {
      expect(shadows.card).toEqual({
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      });
    });

    it('should have correct modal shadow', () => {
      expect(shadows.modal).toEqual({
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
      });
    });
  });

  describe('Theme Object', () => {
    it('should consolidate all tokens', () => {
      expect(theme.colors).toBeDefined();
      expect(theme.typography).toBeDefined();
      expect(theme.spacing).toBeDefined();
      expect(theme.borderRadius).toBeDefined();
      expect(theme.shadows).toBeDefined();
    });

    it('should match individual exports', () => {
      expect(theme.colors).toEqual(colors);
      expect(theme.typography).toEqual(typography);
      expect(theme.spacing).toEqual(spacing);
      expect(theme.borderRadius).toEqual(borderRadius);
      expect(theme.shadows).toEqual(shadows);
    });
  });
});
