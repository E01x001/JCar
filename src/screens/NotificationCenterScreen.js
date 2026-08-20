/**
 * NotificationCenterScreen — 인앱 알림센터.
 *
 * 존재 이유: notifications 테이블이 이미 푸시 아웃박스로 동작하는데 앱에는 목록이
 * 없었다. 푸시를 놓치거나 알림 권한을 껐다면 확인할 방법이 아예 없었다.
 *
 * 탭하면 트리거가 data에 실어 보낸 screen/id로 이동한다(푸시 딥링크와 같은 규약).
 * 이동 여부와 무관하게 읽음 처리는 한다 — 목록에서 봤으면 읽은 것이다.
 */
import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialIcons';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/spacing';
import { useToast } from '../hooks/useToast';
import StateScreen from '../components/StateScreen';
import { formatRelativeTime } from '../utils/format';
import { iconFor, toneFor, routeFor } from '../constants/notification';
import {
  subscribeNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../services/notification/notificationCenterService';
import { reportCrashlyticsError } from '../services/notification/notificationService';

const NotificationCenterScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const toast = useToast();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) { return () => {}; }

    const unsubscribe = subscribeNotifications(user.uid, (list) => {
      setNotifications(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const onRefresh = useCallback(() => {
    // 구독이 이미 최신을 밀어주므로 표시만 잠깐 — 사용자에게 "반응했다"는 신호는 필요하다
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  }, []);

  const handlePress = useCallback(async (item) => {
    // 낙관적 반영: 탭 즉시 읽음으로 보이고, 실패해도 목록 재조회가 되돌린다
    if (!item.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      markAsRead(item.id).catch((error) => {
        logAndReport(error, '알림 읽음 처리 실패');
      });
    }

    const route = routeFor(item);
    if (!route) { return; }

    try {
      navigation.navigate(route.screen, route.params);
    } catch (error) {
      // 규약이 바뀌어 없는 화면을 가리키는 경우 — 목록은 계속 쓸 수 있어야 한다
      logAndReport(error, `알림 이동 실패: ${route.screen}`);
      toast.showWarning('이동할 수 없음', '해당 화면을 열 수 없습니다.');
    }
  }, [navigation, toast]);

  const handleMarkAll = useCallback(async () => {
    if (unreadCount === 0) { return; }
    const prev = notifications;
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    try {
      await markAllAsRead();
    } catch (error) {
      setNotifications(prev);
      logAndReport(error, '전체 읽음 처리 실패');
      toast.showError('실패', '읽음 처리에 실패했습니다.');
    }
  }, [notifications, unreadCount, toast]);

  const handleDelete = useCallback((item) => {
    Alert.alert('알림 삭제', '이 알림을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const prev = notifications;
          setNotifications((list) => list.filter((n) => n.id !== item.id));
          try {
            await deleteNotification(item.id);
          } catch (error) {
            setNotifications(prev);
            logAndReport(error, '알림 삭제 실패');
            toast.showError('실패', '알림을 삭제하지 못했습니다.');
          }
        },
      },
    ]);
  }, [notifications, toast]);

  const renderItem = ({ item }) => {
    const tone = toneFor(item.type);
    const toneColor = theme.colors[tone]?.main ?? theme.colors.info.main;
    const unread = !item.read;

    return (
      <Pressable
        onPress={() => handlePress(item)}
        onLongPress={() => handleDelete(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${item.body}${unread ? '. 읽지 않음' : ''}`}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: unread
              ? theme.colors.background.card
              : theme.colors.background.secondary,
            borderBottomColor: theme.colors.border.default,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${toneColor}1A` }]}>
          <Icon name={iconFor(item.type)} size={22} color={toneColor} />
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text
              numberOfLines={1}
              style={[styles.title, {
                color: theme.colors.text.primary,
                fontWeight: unread ? '700' : '500',
              }]}
            >
              {item.title}
            </Text>
            {unread && <View style={[styles.dot, { backgroundColor: theme.colors.primary.main }]} />}
          </View>

          <Text
            numberOfLines={2}
            style={[styles.message, { color: theme.colors.text.secondary }]}
          >
            {item.body}
          </Text>

          <Text style={[styles.time, { color: theme.colors.text.tertiary }]}>
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['bottom']}>
        <StateScreen icon="notifications" title="알림을 불러오는 중" message="잠시만 기다려주세요." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}
      edges={['bottom']}
    >
      {notifications.length > 0 && (
        <View style={[styles.header, { borderBottomColor: theme.colors.border.default }]}>
          <Text style={[styles.headerCount, { color: theme.colors.text.secondary }]}>
            {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : '모두 읽음'}
          </Text>
          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAll} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.headerAction, { color: theme.colors.primary.main }]}>
                모두 읽음 처리
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary.main]}
            tintColor={theme.colors.primary.main}
          />
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyWrap : null}
        ListEmptyComponent={
          <StateScreen
            icon="notifications-none"
            title="알림이 없습니다"
            message={'상담 승인·차량 심사 결과 등\n중요한 소식을 여기서 알려드려요.'}
          />
        }
      />
    </SafeAreaView>
  );
};

/** 실패를 사용자 흐름과 분리해 기록만 남긴다 */
const logAndReport = (error, message) => {
   
  const { logger } = require('../utils/logger');
  logger.error(message, error);
  reportCrashlyticsError(error);
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenX,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCount: { fontSize: 13, fontWeight: '600' },
  headerAction: { fontSize: 13, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenX,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 15, flexShrink: 1 },
  dot: { width: 7, height: 7, borderRadius: 4, marginLeft: 6 },
  message: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  time: { fontSize: 12, marginTop: 6 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
});

export default NotificationCenterScreen;
