/**
 * JCar Design System - Badge Component
 *
 * Status badge with semantic color mapping.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';

// 시안 톤다운 칩: status enum → statusChip 토큰 키 매핑
const CHIP_KEY = {
  pending: 'pending',
  'on-hold': 'pending',
  approved: 'approved',
  confirmed: 'approved',
  rejected: 'rejected',
  completed: 'completed',
  cancelled: 'neutral',
  archived: 'neutral',
};

/**
 * Badge Component
 *
 * @param {Object} props
 * @param {'pending' | 'approved' | 'confirmed' | 'on-hold' | 'rejected' | 'completed' | 'cancelled' | 'archived'} props.status - Badge status
 * @param {string} [props.label] - Custom label (overrides default status text)
 * @param {'solid' | 'chip'} [props.variant='solid'] - 'solid'=기존 솔리드 배지, 'chip'=시안 톤다운 칩(+dot)
 * @param {Object} [props.style] - Additional styles
 */
const Badge = ({ status, label, variant = 'solid', style }) => {
  const theme = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          color: theme.colors.warning.main,
          text: label || '대기중',
        };
      case 'approved':
      case 'confirmed':
        return {
          color: theme.colors.success.main,
          text: label || '확정됨',
        };
      case 'on-hold':
        return {
          color: theme.colors.warning.light,
          text: label || '보류',
        };
      case 'rejected':
        return {
          color: theme.colors.danger.main,
          text: label || '거절됨',
        };
      case 'completed':
        return {
          color: theme.colors.info.main,
          text: label || '채결완료',
        };
      case 'cancelled':
        return {
          color: theme.colors.status.cancelled,
          text: label || '취소됨',
        };
      case 'archived':
        return {
          color: theme.colors.text.secondary,
          text: label || '보관됨',
        };
      default:
        return {
          color: theme.colors.text.secondary,
          text: label || status,
        };
    }
  };

  const config = getStatusConfig();

  // 시안 톤다운 칩 스타일
  if (variant === 'chip') {
    const chip = theme.colors.statusChip[CHIP_KEY[status] || 'neutral'];
    return (
      <View
        style={[
          styles.badge,
          styles.chip,
          {
            backgroundColor: chip.bg,
            borderRadius: theme.borderRadius.chip,
          },
          style,
        ]}
      >
        <View style={[styles.dot, { backgroundColor: chip.dot }]} />
        <Text
          style={[
            styles.text,
            {
              color: chip.fg,
              fontSize: theme.typography.fontSize.bodySmall,
              fontWeight: theme.typography.fontWeight.bold,
            },
          ]}
        >
          {config.text}
        </Text>
      </View>
    );
  }

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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    textAlign: 'center',
  },
});

Badge.propTypes = {
  status: PropTypes.oneOf(['pending', 'approved', 'confirmed', 'on-hold', 'rejected', 'completed', 'cancelled', 'archived']).isRequired,
  label: PropTypes.string,
  variant: PropTypes.oneOf(['solid', 'chip']),
  style: PropTypes.object,
};

export default Badge;
