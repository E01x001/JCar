/**
 * NotificationBell — 알림센터 진입 버튼 (안읽음 배지 포함).
 *
 * 배지 숫자는 알림 테이블을 실시간 구독해 갱신한다. 화면을 열지 않아도
 * "새 소식이 있다"가 보여야 알림센터가 제 역할을 한다.
 *
 * 구독 실패는 조용히 넘긴다 — 배지가 안 보이는 것이 화면이 깨지는 것보다 낫다.
 */
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '@expo/vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { subscribeNotifications } from '../services/notification/notificationCenterService';

const MAX_BADGE = 99;

const NotificationBell = ({ color, size = 24, style }) => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const navigation = useNavigation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) { return () => {}; }

    const unsubscribe = subscribeNotifications(user.uid, (list) => {
      setUnread(list.filter((n) => !n.read).length);
    }, { channelKey: 'notification-bell' });

    return () => unsubscribe();
  }, [user]);

  const iconColor = color ?? theme.colors.text.primary;
  const label = unread > 0 ? `알림, 읽지 않음 ${unread}개` : '알림';

  return (
    <Pressable
      onPress={() => navigation.navigate('NotificationCenter')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.wrap, style]}
    >
      <Icon name="notifications-none" size={size} color={iconColor} />
      {unread > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.colors.error.main }]}>
          <Text style={styles.badgeText}>
            {unread > MAX_BADGE ? `${MAX_BADGE}+` : unread}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

NotificationBell.propTypes = {
  color: PropTypes.string,
  size: PropTypes.number,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

const styles = StyleSheet.create({
  wrap: { padding: 4 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});

export default NotificationBell;
