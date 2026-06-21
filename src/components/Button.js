/**
 * JCar Design System - Button Component
 *
 * Unified button component supporting all variants and states from PRD.
 */

import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Button Component
 *
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'text'} props.variant - Button variant
 * @param {string} props.title - Button text
 * @param {Function} props.onPress - Press handler
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.loading=false] - Loading state
 * @param {boolean} [props.fullWidth=false] - Stretch to container width
 * @param {Object} [props.style] - Additional styles
 */
const Button = ({
  variant = 'primary',
  title,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}) => {
  const theme = useTheme();

  const getBackgroundColor = (pressed) => {
    if (disabled) {
      // 시안: secondary/ghost는 비활성 시 연한 면, solid는 회색 면
      if (variant === 'ghost' || variant === 'text') { return 'transparent'; }
      if (variant === 'secondary') { return theme.colors.primary.opacity10; }
      return theme.colors.background.disabled;
    }

    switch (variant) {
      case 'primary':
        return pressed ? theme.colors.primary.dark : theme.colors.primary.main;
      case 'danger':
        return pressed ? theme.colors.danger.dark : theme.colors.danger.main;
      case 'success':
        return pressed ? theme.colors.success.dark : theme.colors.success.main;
      case 'secondary':
        // 시안: 연블루 솔리드 (tag.accent.bg = #EEF1FA), pressed 시 약간 진하게
        return pressed ? theme.colors.primary.opacity10 : theme.colors.tag.accent.bg;
      case 'ghost':
        return pressed ? theme.colors.background.secondary : theme.colors.background.primary;
      case 'text':
        return 'transparent';
      default:
        return theme.colors.primary.main;
    }
  };

  const getTextColor = () => {
    if (disabled) {
      return theme.colors.text.tertiary;
    }

    switch (variant) {
      case 'primary':
      case 'danger':
      case 'success':
        return theme.colors.text.white;
      case 'secondary':
      case 'text':
        return theme.colors.primary.main;
      case 'ghost':
        return theme.colors.text.secondary;
      default:
        return theme.colors.text.white;
    }
  };

  const getBorderStyle = () => {
    if (variant === 'ghost') {
      return { borderWidth: 1.5, borderColor: theme.colors.border.subtle };
    }
    return {};
  };

  // 시안: solid 버튼은 색상별 소프트 그림자, 그 외는 없음
  const getShadow = () => {
    if (disabled) { return null; }
    if (variant === 'primary' || variant === 'success') { return theme.shadows.button; }
    if (variant === 'danger') { return theme.shadows.buttonDanger; }
    return null;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { borderRadius: theme.borderRadius.button },
        fullWidth && styles.fullWidth,
        getShadow(),
        {
          backgroundColor: getBackgroundColor(pressed),
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        getBorderStyle(),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: getTextColor(),
              fontSize: theme.typography.fontSize.button,
              fontWeight: theme.typography.fontWeight.bold,
            },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  text: {
    textAlign: 'center',
  },
});

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success', 'ghost', 'text']),
  title: PropTypes.string.isRequired,
  onPress: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  fullWidth: PropTypes.bool,
  style: PropTypes.object,
};

export default Button;
