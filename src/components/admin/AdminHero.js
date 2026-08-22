/**
 * AdminHero — 화면 최상단의 "지금 나를 필요로 하는 것" 한 줄.
 *
 * 관리자 화면은 통계 다섯 칸(전체·대기·승인·거절·완료)을 나란히 놓고 있었다.
 * 다섯 숫자가 같은 크기로 있으면 어느 것도 눈에 들어오지 않고, 실제로 관리자가
 * 매번 보는 것은 그중 하나뿐이다 — 지금 답을 기다리는 건수.
 *
 * 그래서 하나만 크게 말하고 나머지는 세그먼트 필터의 작은 숫자로 내린다.
 *
 * @param {number|string} props.value - 크게 보여줄 숫자
 * @param {string} props.title - 숫자에 이어지는 문장 ('건이 답을 기다립니다')
 * @param {string} [props.subtitle] - 보조 문장. 없으면 그리지 않는다
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../../theme/ThemeProvider';

const AdminHero = ({ value, title, subtitle }) => {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.value, { color: theme.colors.text.primary }]}>{value}</Text>
      <View style={styles.text}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
};

AdminHero.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 20,
  },
  // 64px / lineHeight 55 — 숫자 아래 여백을 없애 문장과 밑선을 맞춘다
  value: { fontSize: 64, fontWeight: '700', lineHeight: 55 },
  text: { paddingBottom: 6, gap: 2, flexShrink: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 13 },
});

export default AdminHero;
