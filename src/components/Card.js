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
 * @param {Object} [props.style] - Additional styles
 */
const Card = ({ children, style }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.background.card,
          borderRadius: theme.borderRadius.large,
          padding: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.border.light,
        },
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
  style: PropTypes.object,
};

export default Card;
