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
 * @param {'primary' | 'secondary' | 'danger' | 'success' | 'text'} props.variant - Button variant
 * @param {string} props.title - Button text
 * @param {Function} props.onPress - Press handler
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.loading=false] - Loading state
 * @param {Object} [props.style] - Additional styles
 */
const Button = ({
  variant = 'primary',
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
}) => {
  const theme = useTheme();

  const getBackgroundColor = (pressed) => {
    if (disabled) {
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
      default:
        return theme.colors.text.white;
    }
  };

  const getBorderStyle = () => {
    if (variant === 'secondary') {
      return {
        borderWidth: 1,
        borderColor: disabled
          ? theme.colors.border.light
          : theme.colors.primary.main,
      };
    }
    return {};
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
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
              fontWeight: theme.typography.fontWeight.semiBold,
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
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  text: {
    textAlign: 'center',
  },
});

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'success', 'text']),
  title: PropTypes.string.isRequired,
  onPress: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  style: PropTypes.object,
};

export default Button;
