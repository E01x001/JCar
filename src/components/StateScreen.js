/**
 * StateScreen Component
 *
 * A generic component for displaying empty or error states.
 * Provides consistent layout with icon, title, message, and optional retry button.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeProvider';
import Button from './Button';

/**
 * StateScreen Component
 *
 * @param {object} props - Component props
 * @param {string} props.icon - Material icon name
 * @param {string} props.title - Main title text
 * @param {string} props.message - Descriptive message text
 * @param {Function} [props.onRetry] - Optional retry callback
 * @param {string} [props.retryButtonText='다시 시도'] - Retry button text
 * @param {object} [props.style] - Additional container styles
 * @returns {JSX.Element}
 */
const StateScreen = ({
  icon,
  title,
  message,
  onRetry,
  retryButtonText = '다시 시도',
  style,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Icon
        name={icon}
        size={80}
        color={theme.colors.text.tertiary}
        style={{ marginBottom: theme.spacing.lg }}
      />

      <Text
        style={[
          styles.title,
          {
            fontSize: theme.typography.fontSize.h3,
            fontWeight: theme.typography.fontWeight.semiBold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.sm,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.message,
          {
            fontSize: theme.typography.fontSize.body,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.xl,
          },
        ]}
      >
        {message}
      </Text>

      {onRetry && (
        <Button
          variant="secondary"
          title={retryButtonText}
          onPress={onRetry}
          style={{ minWidth: 150 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    maxWidth: 300,
  },
});

export default StateScreen;
