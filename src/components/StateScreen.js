/**
 * StateScreen — 풀스크린 빈/에러 상태.
 *
 * 아이콘 표현은 `EmptyState`(섹션 내 인라인 빈 상태)와 **같은 파란 뱃지**를 쓴다.
 * 예전에는 여기만 회색 민아이콘이라, 같은 앱 안에서 탭마다 빈 화면 생김새가
 * 달라 보였다. 레이아웃(풀스크린 중앙정렬 + 재시도 버튼)만 다르고
 * 시각 언어는 하나로 맞춘다.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeProvider';
import Button from './Button';

/**
 * StateScreen Component
 *
 * @param {object} props - Component props
 * @param {string} props.icon - Material icon name
 * @param {string} props.title - Main title text
 * @param {string} props.message - Descriptive message text
 * @param {Function} [props.onRetry] - Optional retry callback
 * @param {string} [props.retryButtonText='다시 시도'] - Retry button text
 * @param {object} [props.style] - Additional container styles
 * @returns {JSX.Element}
 */
const StateScreen = ({
  icon,
  title,
  message,
  onRetry,
  retryButtonText = '다시 시도',
  style,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.iconBadge,
          {
            backgroundColor: theme.colors.statusChip.completed.bg,
            marginBottom: theme.spacing.lg,
          },
        ]}
      >
        <Icon name={icon} size={40} color={theme.colors.primary.light} />
      </View>

      <Text
        style={[
          styles.title,
          {
            fontSize: theme.typography.fontSize.h3,
            fontWeight: theme.typography.fontWeight.semiBold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.sm,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.message,
          {
            fontSize: theme.typography.fontSize.body,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.xl,
          },
        ]}
      >
        {message}
      </Text>

      {onRetry && (
        <Button
          variant="secondary"
          title={retryButtonText}
          onPress={onRetry}
          style={{ minWidth: 150 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  // EmptyState의 뱃지(72x72 / radius 22)와 같은 비율을 풀스크린 크기로 확대
  iconBadge: {
    width: 88,
    height: 88,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    maxWidth: 300,
  },
});

export default StateScreen;
