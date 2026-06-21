/**
 * JCar Design System - Section Header Component
 *
 * 시안: 섹션 제목 + 우측 "더보기 ›" 액션.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';

/**
 * SectionHeader Component
 *
 * @param {Object} props
 * @param {string} props.title - 섹션 제목
 * @param {string} [props.actionLabel] - 우측 액션 라벨(예: "더보기")
 * @param {Function} [props.onActionPress] - 액션 클릭 핸들러
 * @param {Object} [props.style] - Additional styles
 */
const SectionHeader = ({ title, actionLabel, onActionPress, style }) => {
  const theme = useTheme();

  return (
    <View style={[styles.row, style]}>
      <Text
        style={{
          fontSize: theme.typography.fontSize.bodyLarge,
          fontWeight: theme.typography.fontWeight.extraBold,
          color: theme.colors.text.primary,
        }}
      >
        {title}
      </Text>
      {actionLabel ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text style={{ fontSize: 13, color: theme.colors.text.tertiary }}>
            {actionLabel} ›
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

SectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  actionLabel: PropTypes.string,
  onActionPress: PropTypes.func,
  style: PropTypes.object,
};

export default SectionHeader;
