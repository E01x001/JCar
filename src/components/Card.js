/**
 * JCar Design System - Card Component
 *
 * Container component with consistent styling.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Card Component
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {boolean} [props.elevated=false] - 시안 소프트 그림자 카드(테두리 제거)
 * @param {Object} [props.style] - Additional styles
 */
const Card = ({ children, elevated = false, style }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.background.card,
          borderRadius: elevated ? theme.borderRadius.card : theme.borderRadius.large,
          padding: theme.spacing.md,
        },
        elevated
          ? theme.shadows.soft
          : { borderWidth: 1, borderColor: theme.colors.border.light },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
});

Card.propTypes = {
  children: PropTypes.node.isRequired,
  elevated: PropTypes.bool,
  style: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array,
  ]),
};

export default Card;
