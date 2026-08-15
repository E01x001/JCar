/**
 * JCar Design System - Empty State Component
 *
 * 시안: 섹션 내 카드형 빈 상태 (둥근 블루 아이콘 뱃지 + 타이틀 + 보조문구).
 * NOTE: 풀스크린 빈/에러 상태는 `StateScreen`을 사용. 이 컴포넌트는 섹션/탭 내부의
 *       컨테이너형(인라인) 빈 상태 전용이다. (중복 아님 — 레이아웃/용도 상이)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';

/**
 * EmptyState Component
 *
 * @param {Object} props
 * @param {string} [props.icon='inbox'] - Material icon 이름
 * @param {string} props.title - 빈 상태 제목
 * @param {string} [props.message] - 보조 설명(줄바꿈 \n 허용)
 * @param {Object} [props.style] - Additional styles
 */
const EmptyState = ({ icon = 'inbox', title, message, style }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background.secondary,
          borderRadius: theme.borderRadius.card,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconBadge,
          { backgroundColor: theme.colors.statusChip.completed.bg },
        ]}
      >
        <Icon name={icon} size={32} color={theme.colors.primary.light} />
      </View>
      <Text
        style={{
          fontSize: theme.typography.fontSize.bodyLarge,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text.primary,
          marginTop: theme.spacing.md,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {message ? (
        <Text
          style={{
            fontSize: 13,
            color: theme.colors.text.secondary,
            marginTop: 6,
            lineHeight: 20,
            textAlign: 'center',
          }}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 34,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

EmptyState.propTypes = {
  icon: PropTypes.string,
  title: PropTypes.string.isRequired,
  message: PropTypes.string,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default EmptyState;
