/**
 * JCar Design System - Tag Component
 *
 * 시안: 분류용 태그 칩(차종/거래 타입 등). 상태(Badge)와 의미를 구분 —
 * Tag는 "분류", Badge(chip)는 "상태"를 나타낸다.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Tag Component
 *
 * @param {Object} props
 * @param {string} props.label - 태그 텍스트
 * @param {'info' | 'neutral' | 'accent'} [props.variant='neutral'] - colors.tag 키
 * @param {Object} [props.style] - Additional styles
 */
const Tag = ({ label, variant = 'neutral', style }) => {
  const theme = useTheme();
  const palette = theme.colors.tag[variant] || theme.colors.tag.neutral;

  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: palette.bg, borderRadius: theme.borderRadius.chip },
        style,
      ]}
    >
      <Text
        style={{
          color: palette.fg,
          fontSize: theme.typography.fontSize.bodySmall,
          fontWeight: theme.typography.fontWeight.bold,
        }}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
});

Tag.propTypes = {
  label: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['info', 'neutral', 'accent']),
  style: PropTypes.object,
};

export default Tag;
