/**
 * SpineCard — 왼쪽에 상태 색 띠(척추)를 두른 카드.
 *
 * 상태를 카드 안의 칩으로 띄우면 시선이 매번 그것부터 찾아야 하고, 칩이 제목·
 * 아이콘과 자리를 다툰다. 띠는 목록을 훑을 때 눈이 세로로 지나가는 자리에 있어
 * 읽지 않아도 구분된다.
 *
 * 색은 statusChip의 **글자색(fg)** 을 쓴다. 점 색(dot)은 채도가 높아 4px 면으로
 * 칠하면 브랜드 네이비와 부딪힌다 — 앱의 Badge chip도 그 색을 6px 점에만 쓴다.
 *
 * @param {string} props.status - pending·approved·rejected·completed·cancelled 등
 * @param {Function} [props.onPress] - 없으면 눌리지 않는 카드로 그린다
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../../theme/ThemeProvider';

/** 상담·차량의 여러 상태 이름을 칩 팔레트 다섯 갈래로 모은다 */
const SPINE_KEY = {
  pending: 'pending',
  'on-hold': 'pending',
  approved: 'approved',
  confirmed: 'approved',
  meeting: 'approved',
  rejected: 'rejected',
  completed: 'completed',
  cancelled: 'neutral',
  archived: 'neutral',
};

const SpineCard = ({ status, onPress, children, style }) => {
  const theme = useTheme();
  const chip = theme.colors.statusChip[SPINE_KEY[status] || 'neutral'];

  // 그림자와 클리핑을 한 View에 같이 두면 안드로이드에서 elevation 그림자가
  // overflow: hidden에 잘린다. 바깥은 그림자만, 안쪽은 클리핑만 맡는다.
  const body = (
    <View style={[styles.shadow, { ...theme.shadows.soft }, style]}>
      <View style={[styles.card, { backgroundColor: theme.colors.background.card }]}>
        <View style={[styles.spine, { backgroundColor: chip.fg }]} />
        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );

  if (!onPress) { return body; }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      {body}
    </TouchableOpacity>
  );
};

SpineCard.propTypes = {
  status: PropTypes.string,
  onPress: PropTypes.func,
  children: PropTypes.node,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

const styles = StyleSheet.create({
  // 그림자 담당 — overflow를 걸지 않는다
  shadow: {
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  // 클리핑 담당 — 척추가 둥근 모서리를 넘지 않게 한다
  card: {
    flexDirection: 'row',
    borderRadius: 18,
    overflow: 'hidden',
  },
  spine: { width: 4 },
  body: { flex: 1, minWidth: 0, paddingVertical: 16, paddingLeft: 16, paddingRight: 18 },
});

export default SpineCard;
