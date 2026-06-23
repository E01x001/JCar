/**
 * JCar Design System - Avatar Component
 *
 * 시안: 이니셜 원형 아바타. 그라데이션(채움) 또는 연블루(보조).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Avatar Component
 *
 * @param {Object} props
 * @param {string} props.name - 표시할 이름(첫 글자를 이니셜로 사용)
 * @param {number} [props.size=46] - 지름(px)
 * @param {'solid' | 'soft'} [props.variant='solid'] - solid=그라데이션 느낌(네이비), soft=연블루
 * @param {Object} [props.style] - Additional styles
 */
const Avatar = ({ name, size = 46, variant = 'solid', style }) => {
  const theme = useTheme();
  const initial = (name || '').trim().charAt(0) || '?';

  const isSolid = variant === 'solid';
  const bg = isSolid ? theme.colors.primary.main : theme.colors.tag.accent.bg;
  const fg = isSolid ? theme.colors.text.white : theme.colors.primary.main;

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        style,
      ]}
    >
      <Text
        style={{
          color: fg,
          fontSize: size * 0.34,
          fontWeight: theme.typography.fontWeight.bold,
        }}
      >
        {initial}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

Avatar.propTypes = {
  name: PropTypes.string,
  size: PropTypes.number,
  variant: PropTypes.oneOf(['solid', 'soft']),
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default Avatar;
