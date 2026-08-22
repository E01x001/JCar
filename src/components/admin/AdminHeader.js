/**
 * AdminHeader — 관리자 탭 화면 상단 바.
 *
 * 사용자 화면의 ScreenHeader(제목 가운데 정렬)와 의도적으로 다르다.
 * 사용자는 "여기가 어디인가"를 알아야 하지만, 관리자는 자기가 어느 탭에 있는지
 * 이미 안다. 그래서 제목은 작게 왼쪽에 두고, 남은 폭을 동작(검색·필터·추가)에 준다.
 *
 * 관리자 화면 넷이 각자 제목줄을 그리다 여백과 크기가 어긋난 것을 여기로 모은다.
 *
 * @param {string} props.title
 * @param {Array<{icon: string, onPress: Function, accessibilityLabel: string}>} [props.actions]
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';

const AdminHeader = ({ title, actions = [], right }) => {
  const theme = useTheme();

  return (
    <View style={styles.bar}>
      <Text style={[styles.title, { color: theme.colors.text.secondary }]} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.actions}>
        {right}
        {actions.map((a) => (
          <TouchableOpacity
            key={a.icon}
            onPress={a.onPress}
            accessibilityRole="button"
            accessibilityLabel={a.accessibilityLabel}
            activeOpacity={0.7}
            style={[
              styles.iconButton,
              {
                backgroundColor: theme.colors.background.card,
                borderColor: theme.colors.border.light,
              },
            ]}
          >
            <Icon name={a.icon} size={17} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

AdminHeader.propTypes = {
  title: PropTypes.string.isRequired,
  actions: PropTypes.arrayOf(PropTypes.shape({
    icon: PropTypes.string.isRequired,
    onPress: PropTypes.func,
    accessibilityLabel: PropTypes.string,
  })),
  /** 아이콘 버튼 대신 넣을 임의 요소(월/주 전환 등) */
  right: PropTypes.node,
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  title: { fontSize: 15, fontWeight: '600', letterSpacing: 0.3, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AdminHeader;
