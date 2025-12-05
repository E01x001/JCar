/**
 * JCar Design System - FilterChip Component
 *
 * Interactive chip for filtering lists with active/inactive states.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';

/**
 * FilterChip Component
 *
 * @param {Object} props
 * @param {string} props.label - Chip label text
 * @param {boolean} props.active - Active state
 * @param {Function} props.onPress - Press handler
 * @param {Object} [props.style] - Additional styles
 */
const FilterChip = ({ label, active, onPress, style }) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: active
            ? theme.colors.primary.main
            : theme.colors.background.primary,
          borderColor: active
            ? theme.colors.primary.main
            : theme.colors.border.default,
          borderWidth: 1,
          borderRadius: theme.borderRadius.large,
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          marginRight: theme.spacing.xs,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: active
              ? theme.colors.text.white
              : theme.colors.text.secondary,
            fontSize: theme.typography.fontSize.bodySmall,
            fontWeight: theme.typography.fontWeight.medium,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
  },
  label: {
    textAlign: 'center',
  },
});

FilterChip.propTypes = {
  label: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  onPress: PropTypes.func.isRequired,
  style: PropTypes.object,
};

export default FilterChip;
