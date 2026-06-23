/**
 * JCar Design System - StatisticsCard Component
 *
 * Displays a statistic card with an icon, label, and numerical value.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeProvider';
import Card from './Card';

/**
 * StatisticsCard Component
 *
 * @param {Object} props
 * @param {string} props.iconName - Material icon name
 * @param {string} props.label - Label text
 * @param {number} props.count - Numerical value to display
 * @param {string} [props.variant] - Color variant (primary, success, warning, error, info)
 * @param {Object} [props.style] - Additional styles
 */
const StatisticsCard = ({ iconName, label, count, variant = 'primary', style }) => {
  const theme = useTheme();

  // Determine color based on variant
  const getVariantColor = () => {
    switch (variant) {
      case 'success':
        return theme.colors.success.main;
      case 'warning':
        return theme.colors.warning.main;
      case 'error':
        return theme.colors.error.main;
      case 'info':
        return theme.colors.info.main;
      case 'primary':
      default:
        return theme.colors.primary.main;
    }
  };

  const variantColor = getVariantColor();

  return (
    <Card
      style={[
        styles.container,
        {
          minWidth: 120,
          marginRight: theme.spacing.sm,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          {
            marginBottom: 4,
          },
        ]}
      >
        <Icon name={iconName} size={28} color={variantColor} />
      </View>

      <Text
        style={[
          styles.count,
          {
            fontSize: theme.typography.fontSize.h2,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.xxs,
          },
        ]}
      >
        {count.toLocaleString()}
      </Text>

      <Text
        style={[
          styles.label,
          {
            fontSize: theme.typography.fontSize.bodySmall,
            color: theme.colors.text.secondary,
          },
        ]}
      >
        {label}
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {},
  label: {},
});

StatisticsCard.propTypes = {
  iconName: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  variant: PropTypes.oneOf(['primary', 'success', 'warning', 'error', 'info']),
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default StatisticsCard;
