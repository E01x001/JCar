/**
 * JCar Design System - Badge Component
 *
 * Status badge with semantic color mapping.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Badge Component
 *
 * @param {Object} props
 * @param {'pending' | 'approved' | 'rejected' | 'completed'} props.status - Badge status
 * @param {string} [props.label] - Custom label (overrides default status text)
 * @param {Object} [props.style] - Additional styles
 */
const Badge = ({ status, label, style }) => {
  const theme = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          color: theme.colors.warning.main,
          text: label || '대기중',
        };
      case 'approved':
        return {
          color: theme.colors.success.main,
          text: label || '승인',
        };
      case 'rejected':
        return {
          color: theme.colors.danger.main,
          text: label || '거절',
        };
      case 'completed':
        return {
          color: theme.colors.info.main,
          text: label || '완료',
        };
      default:
        return {
          color: theme.colors.text.secondary,
          text: label || status,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.color,
          borderRadius: theme.borderRadius.small,
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.sm,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: theme.colors.text.white,
            fontSize: theme.typography.fontSize.bodySmall,
            fontWeight: theme.typography.fontWeight.semiBold,
          },
        ]}
      >
        {config.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  text: {
    textAlign: 'center',
  },
});

Badge.propTypes = {
  status: PropTypes.oneOf(['pending', 'approved', 'rejected', 'completed']).isRequired,
  label: PropTypes.string,
  style: PropTypes.object,
};

export default Badge;
