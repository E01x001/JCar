/**
 * JCar Design System - Input Field Component
 *
 * Unified input field with default, focus, and error states.
 */

import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';

/**
 * InputField Component
 *
 * @param {Object} props
 * @param {string} props.value - Input value
 * @param {Function} props.onChangeText - Change handler
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.error] - Error message
 * @param {string} [props.label] - Input label
 * @param {boolean} [props.secureTextEntry] - Password field
 * @param {Object} [props.style] - Additional styles
 */
const InputField = ({
  value,
  onChangeText,
  placeholder,
  error,
  label,
  secureTextEntry = false,
  style,
  ...otherProps
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) {
      return theme.colors.danger.main;
    }
    if (isFocused) {
      return theme.colors.primary.main;
    }
    return theme.colors.border.default;
  };

  const getBorderWidth = () => {
    return isFocused ? 2 : 1;
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: theme.colors.text.secondary,
              fontSize: theme.typography.fontSize.bodySmall,
              marginBottom: theme.spacing.xs,
            },
          ]}
        >
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.tertiary}
        secureTextEntry={secureTextEntry}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.input,
          {
            borderColor: getBorderColor(),
            borderWidth: getBorderWidth(),
            borderRadius: theme.borderRadius.medium,
            backgroundColor: theme.colors.background.primary,
            color: theme.colors.text.primary,
            fontSize: theme.typography.fontSize.bodyLarge,
            paddingHorizontal: theme.spacing.md,
          },
          isFocused && {
            shadowColor: theme.colors.primary.main,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          },
        ]}
        {...otherProps}
      />
      {error && (
        <Text
          style={[
            styles.errorText,
            {
              color: theme.colors.danger.main,
              fontSize: theme.typography.fontSize.bodySmall,
              marginTop: theme.spacing.xs,
            },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontWeight: '500',
  },
  input: {
    height: 48,
  },
  errorText: {
    fontWeight: '400',
  },
});

InputField.propTypes = {
  value: PropTypes.string.isRequired,
  onChangeText: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  label: PropTypes.string,
  secureTextEntry: PropTypes.bool,
  style: PropTypes.object,
};

export default InputField;
