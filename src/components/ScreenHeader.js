/**
 * ScreenHeader — 탭 화면 상단 제목 바.
 *
 * 존재 이유: 화면마다 titleBar/titleText 스타일을 각자 복사해 쓰다가 어긋났다.
 * 실제로 상담 내역 화면만 왼쪽 정렬에 폰트 20, 하단 보더 없음이었고
 * 나머지는 가운데 정렬·폰트 17·보더였다. 값을 세 곳에 복사해두면 언젠가 갈라진다.
 *
 * 네비게이션 헤더(headerShown)를 쓰는 스택 화면에는 필요 없다. 탭 화면 전용이다.
 *
 * @param {string} title - 화면 제목
 * @param {React.ReactNode} [right] - 우측 액션 영역(알림 종 등)
 * @param {Object} [style] - 추가 스타일
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';

const ScreenHeader = ({ title, right, style }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.background.card,
          borderBottomColor: theme.colors.border.light,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            fontSize: theme.typography.fontSize.screenTitle,
            fontWeight: theme.typography.fontWeight.extraBold,
            color: theme.colors.text.primary,
          },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>

      {/* 우측 액션은 절대배치 — 제목이 화면 정중앙에 오도록(액션 폭에 밀리지 않게) */}
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
};

ScreenHeader.propTypes = {
  title: PropTypes.string.isRequired,
  right: PropTypes.node,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

const styles = StyleSheet.create({
  bar: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  title: { letterSpacing: -0.2 },
  right: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
});

export default ScreenHeader;
