/**
 * SkeletonLoader Component
 *
 * A skeleton loader that mimics the Card layout with shimmering animation.
 * Used for loading states in lists and grids.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * SkeletonLoader Component
 *
 * @param {object} props - Component props
 * @param {number} [props.count=3] - Number of skeleton items to display
 * @param {object} [props.style] - Additional styles for the container
 * @returns {JSX.Element}
 */
const SkeletonLoader = ({ count = 3, style }) => {
  const theme = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const renderSkeletonItem = (index) => (
    <View
      key={index}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.background.card,
          borderRadius: theme.borderRadius.medium,
          padding: theme.spacing.md,
          marginHorizontal: theme.spacing.md,
          marginBottom: theme.spacing.sm,
          ...theme.shadows.card,
        },
      ]}
    >
      {/* Badge placeholder */}
      <Animated.View
        style={[
          styles.badge,
          {
            backgroundColor: theme.colors.background.tertiary,
            borderRadius: theme.borderRadius.small,
            opacity,
          },
        ]}
      />

      {/* Title placeholder */}
      <Animated.View
        style={[
          styles.title,
          {
            backgroundColor: theme.colors.background.tertiary,
            borderRadius: theme.borderRadius.small,
            marginTop: theme.spacing.sm,
            opacity,
          },
        ]}
      />

      {/* Info placeholder */}
      <Animated.View
        style={[
          styles.info,
          {
            backgroundColor: theme.colors.background.tertiary,
            borderRadius: theme.borderRadius.small,
            marginTop: theme.spacing.xs,
            opacity,
          },
        ]}
      />
    </View>
  );

  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => renderSkeletonItem(index))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 100,
  },
  badge: {
    width: 60,
    height: 20,
  },
  title: {
    width: '70%',
    height: 24,
  },
  info: {
    width: '90%',
    height: 16,
  },
});

export default SkeletonLoader;
