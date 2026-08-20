/**
 * JCar Design System - Search Bar Component
 *
 * 시안: 메인 홈 검색바. 회색 면(#F1F3F5) + 돋보기 아이콘 + placeholder.
 * 입력형(onChangeText)과 버튼형(onPress, 누르면 검색화면 이동)을 모두 지원.
 */

import React from 'react';
import { View, TextInput, Text, Pressable, StyleSheet } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

/**
 * SearchBar Component
 *
 * @param {Object} props
 * @param {string} [props.placeholder='차량명, 제조사를 검색하세요']
 * @param {string} [props.value] - 입력형일 때 값
 * @param {Function} [props.onChangeText] - 입력형 핸들러(있으면 입력형)
 * @param {Function} [props.onPress] - 버튼형 핸들러(onChangeText 없을 때 사용)
 * @param {Object} [props.style] - Additional styles
 */
const SearchBar = ({
  placeholder = '차량명, 제조사를 검색하세요',
  value,
  onChangeText,
  onPress,
  style,
}) => {
  const theme = useTheme();
  const isInput = typeof onChangeText === 'function';

  const inner = (
    <>
      <Icon name="search" size={20} color={theme.colors.text.tertiary} />
      {isInput ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.tertiary}
          style={[styles.input, { color: theme.colors.text.primary }]}
        />
      ) : (
        <Text style={[styles.placeholder, { color: theme.colors.text.tertiary }]}>
          {placeholder}
        </Text>
      )}
    </>
  );

  const containerStyle = [
    styles.bar,
    { backgroundColor: theme.colors.background.tertiary, borderRadius: theme.borderRadius.button },
    style,
  ];

  if (isInput) {
    return <View style={containerStyle}>{inner}</View>;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [...containerStyle, pressed && { opacity: 0.85 }]}>
      {inner}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.label,
    padding: 0,
  },
  placeholder: {
    fontSize: 14,
  },
});

SearchBar.propTypes = {
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChangeText: PropTypes.func,
  onPress: PropTypes.func,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default SearchBar;
