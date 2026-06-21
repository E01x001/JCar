/**
 * JCar Design System - Category Chip Component
 *
 * 시안: 메인 홈 카테고리 필터 칩. 선택 시 블루 솔리드, 미선택 시 흰 배경 + 테두리.
 * NOTE: 차량 상세 필터의 `FilterChip`과 별개 — 이쪽은 홈 카테고리 가로 스크롤용.
 */

import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';

/**
 * CategoryChip Component
 *
 * @param {Object} props
 * @param {string} props.label - 칩 라벨
 * @param {boolean} [props.selected=false] - 선택 상태
 * @param {Function} props.onPress - 클릭 핸들러
 * @param {Object} [props.style] - Additional styles
 */
const CategoryChip = ({ label, selected = false, onPress, style }) => {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.primary.main
            : theme.colors.background.primary,
          borderColor: selected ? theme.colors.primary.main : theme.colors.border.light,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: selected
            ? theme.typography.fontWeight.bold
            : theme.typography.fontWeight.semiBold,
          color: selected ? theme.colors.text.white : theme.colors.text.secondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
});

CategoryChip.propTypes = {
  label: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  onPress: PropTypes.func.isRequired,
  style: PropTypes.object,
};

export default CategoryChip;
