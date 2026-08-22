/**
 * AdminUserManagementScreen — 사용자 관리.
 *
 * 가입 승인제(20260822140000)가 들어오면서 이 화면의 성격이 바뀌었다. 예전에는
 * "정지시킬 사람을 찾는" 화면이었지만, 지금은 승인하지 않으면 아무도 못 들어온다.
 * 승인 대기를 목록 한가운데 섞어두면 방치되고, 방치되면 정상 사용자가 들어오지
 * 못한 채 남는다.
 *
 * 그래서 세 덩어리로 나눈다:
 *   승인 대기 — 결정이 필요한 것. 맨 위, 카드마다 승인/차단 두 버튼.
 *   이용 중   — 결정이 끝난 사람들. 조용한 한 장짜리 목록.
 *   차단됨    — 접어둔다. 봇 정리로 21개가 쌓였는데 목록을 잡아먹을 이유가 없다.
 */
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, Switch, Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialIcons';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabase';
import { rowToApp } from '../lib/mappers';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { formatPhone, formatWaiting } from '../utils/format';
import AdminHeader from '../components/admin/AdminHeader';
import AdminHero from '../components/admin/AdminHero';
import SpineCard from '../components/admin/SpineCard';
import Avatar from '../components/Avatar';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';

const AdminUserManagementScreen = () => {
  const theme = useTheme();
  const { user: currentUser } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [showBlocked, setShowBlocked] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { throw error; }
      setUsers(data.map(rowToApp));
    } catch (error) {
      logger.error('사용자 목록 불러오기 오류:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const matchesSearch = useCallback((u) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) { return true; }
    return (u.name?.toLowerCase() || '').includes(q)
      || (u.email?.toLowerCase() || '').includes(q)
      || (u.phoneNumber?.toLowerCase() || '').includes(q);
  }, [searchQuery]);

  const pending = useMemo(
    () => users.filter((u) => u.status === 'pending' && matchesSearch(u)),
    [users, matchesSearch],
  );
  const active = useMemo(
    () => users.filter((u) => u.status === 'active' && matchesSearch(u)),
    [users, matchesSearch],
  );
  const blocked = useMemo(
    () => users.filter((u) => u.status === 'suspended' && matchesSearch(u)),
    [users, matchesSearch],
  );

  /**
   * status 변경 — active 또는 suspended로만 간다.
   * pending은 가입 트리거만 만든다(관리자가 되돌릴 일이 없다).
   */
  const changeStatus = async (userId, nextStatus, userName, previousStatus) => {
    const target = users.find((u) => u.id === userId);
    if (target?.role === 'admin') {
      Alert.alert('권한 오류', '관리자 계정은 변경할 수 없습니다.');
      return;
    }

    const actionText = nextStatus === 'suspended'
      ? '차단'
      : previousStatus === 'pending' ? '승인' : '활성화';

    Alert.alert(
      `계정 ${actionText} 확인`,
      `정말로 "${userName}" 계정을 ${actionText}하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: actionText,
          style: nextStatus === 'suspended' ? 'destructive' : 'default',
          onPress: async () => {
            setUpdatingUserId(userId);
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ status: nextStatus, status_updated_at: new Date().toISOString() })
                .eq('id', userId);
              if (error) { throw error; }

              // 활동 로그는 남기되, 실패해도 상태 변경을 되돌리지 않는다
              const { error: logError } = await supabase
                .from('admin_activity_log')
                .insert({
                  admin_id: currentUser?.uid,
                  action: nextStatus === 'suspended'
                    ? 'suspend_user'
                    : previousStatus === 'pending' ? 'approve_signup' : 'activate_user',
                  target_user_id: userId,
                  target_user_name: userName,
                  previous_status: previousStatus || 'active',
                  new_status: nextStatus,
                });
              if (logError) { logger.error('관리자 활동 로그 기록 실패:', logError); }

              setUsers((prev) => prev.map((u) => (
                u.id === userId ? { ...u, status: nextStatus } : u
              )));
              Alert.alert('완료', `계정이 ${actionText}되었습니다.`);
            } catch (error) {
              logger.error('사용자 상태 변경 오류:', error);
              Alert.alert('오류', `계정 ${actionText} 중 문제가 발생했습니다.`);
            } finally {
              setUpdatingUserId(null);
            }
          },
        },
      ],
    );
  };

  /** 승인 대기 — 결정을 요구하는 카드 */
  const renderPending = (item) => {
    const waiting = formatWaiting(item.createdAt);
    const isUpdating = updatingUserId === item.id;

    return (
      <SpineCard key={item.id} status="pending" style={styles.pendingCard}>
        <View style={styles.identityRow}>
          <Avatar name={item.name} size={42} />
          <View style={styles.identityCol}>
            <Text style={[styles.name, { color: theme.colors.text.primary }]} numberOfLines={1}>
              {item.name || '이름 없음'}
            </Text>
            <Text style={[styles.contact, { color: theme.colors.text.secondary }]} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
          {waiting ? (
            <Text style={[styles.waiting, { color: theme.colors.statusChip.pending.fg }]}>
              {waiting}
            </Text>
          ) : null}
        </View>

        {isUpdating ? (
          <View style={styles.updating}>
            <ActivityIndicator size="small" color={theme.colors.primary.main} />
          </View>
        ) : (
          <View style={styles.decisionRow}>
            <TouchableOpacity
              onPress={() => changeStatus(item.id, 'active', item.name, 'pending')}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={[styles.decision, { backgroundColor: theme.colors.primary.main }]}
            >
              <Text style={[styles.decisionText, { color: theme.colors.text.white }]}>승인</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => changeStatus(item.id, 'suspended', item.name, 'pending')}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={[styles.decision, { backgroundColor: theme.colors.statusChip.rejected.bg }]}
            >
              <Text style={[styles.decisionText, { color: theme.colors.statusChip.rejected.fg }]}>
                차단
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SpineCard>
    );
  };

  /** 이용 중 / 차단됨 — 조용한 행 */
  const renderRow = (item, isLast) => {
    const isAdmin = item.role === 'admin';
    const isUpdating = updatingUserId === item.id;
    const isActive = item.status === 'active';

    return (
      <View
        key={item.id}
        style={[
          styles.row,
          !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.border.light },
        ]}
      >
        <Avatar name={item.name} size={38} />
        <View style={styles.identityCol}>
          <View style={styles.nameRow}>
            <Text style={[styles.rowName, { color: theme.colors.text.primary }]} numberOfLines={1}>
              {item.name || '이름 없음'}
            </Text>
            {isAdmin ? (
              <View style={[styles.adminTag, { backgroundColor: theme.colors.tag.accent.bg }]}>
                <Text style={[styles.adminTagText, { color: theme.colors.tag.accent.fg }]}>
                  관리자
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.contact, { color: theme.colors.text.secondary }]} numberOfLines={1}>
            {item.phoneNumber ? formatPhone(item.phoneNumber) : item.email}
          </Text>
        </View>

        {isUpdating ? (
          <ActivityIndicator size="small" color={theme.colors.primary.main} />
        ) : (
          <Switch
            value={isActive}
            onValueChange={() => changeStatus(
              item.id,
              isActive ? 'suspended' : 'active',
              item.name,
              item.status,
            )}
            trackColor={{ false: theme.colors.border.default, true: theme.colors.primary.main }}
            thumbColor={theme.colors.neutral.white}
            disabled={isAdmin}
          />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}
        edges={['top']}
      >
        <AdminHeader title="사용자" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}
      edges={['top']}
    >
      <AdminHeader title="사용자" />

      <AdminHero
        value={pending.length}
        title="명이 승인을 기다립니다"
        subtitle={pending.length > 0 ? '승인 전에는 아무것도 할 수 없습니다' : undefined}
      />

      {/* 세 덩어리의 모양이 서로 달라 하나의 renderItem으로 묶으면 분기가 더
          복잡해진다. 목록 자체를 ListHeaderComponent에서 그린다. */}
      <FlatList
        data={[]}
        renderItem={null}
        keyExtractor={() => 'none'}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.sections}>
            <SearchBar
              placeholder="이름, 이메일 또는 전화번호로 검색"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {pending.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
                  승인 대기
                </Text>
                {pending.map(renderPending)}
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
                  이용 중
                </Text>
                <Text style={[styles.sectionCount, { color: theme.colors.text.tertiary }]}>
                  {active.length}명
                </Text>
              </View>

              {active.length > 0 ? (
                <View style={[styles.listShadow, theme.shadows.soft]}>
                  <View style={[styles.listCard, { backgroundColor: theme.colors.background.card }]}>
                    {active.map((u, i) => renderRow(u, i === active.length - 1))}
                  </View>
                </View>
              ) : (
                <EmptyState
                  icon="people-outline"
                  title={searchQuery ? '검색 결과가 없어요' : '이용 중인 사용자가 없어요'}
                  message={searchQuery ? '다른 검색어로 시도해 보세요' : undefined}
                />
              )}
            </View>

            {blocked.length > 0 ? (
              <View style={styles.section}>
                <TouchableOpacity
                  onPress={() => setShowBlocked((v) => !v)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showBlocked }}
                  style={[styles.blockedToggle, { borderColor: theme.colors.border.subtle }]}
                >
                  <Icon name="block" size={17} color={theme.colors.text.tertiary} />
                  <Text style={[styles.blockedLabel, { color: theme.colors.text.secondary }]}>
                    차단된 계정 {blocked.length}
                  </Text>
                  <Icon
                    name={showBlocked ? 'expand-less' : 'chevron-right'}
                    size={18}
                    color={theme.colors.text.tertiary}
                  />
                </TouchableOpacity>

                {showBlocked ? (
                  <View style={[styles.listShadow, theme.shadows.soft, styles.blockedList]}>
                    <View style={[styles.listCard, { backgroundColor: theme.colors.background.card }]}>
                      {blocked.map((u, i) => renderRow(u, i === blocked.length - 1))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 24 },
  sections: { paddingHorizontal: 22, gap: 18 },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  sectionCount: { fontSize: 12 },

  pendingCard: { marginBottom: 10 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  identityCol: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 16, fontWeight: '700' },
  contact: { fontSize: 12 },
  waiting: { fontSize: 11, fontWeight: '600' },
  updating: { marginTop: 14, alignItems: 'center' },
  decisionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  decision: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  decisionText: { fontSize: 14, fontWeight: '600' },

  // 그림자와 클리핑 분리 — 안드로이드에서 elevation이 잘리지 않게
  listShadow: { borderRadius: 18 },
  listCard: { borderRadius: 18, overflow: 'hidden' },
  blockedList: { marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 18, paddingVertical: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rowName: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  adminTag: { borderRadius: 5, paddingVertical: 2, paddingHorizontal: 6 },
  adminTagText: { fontSize: 10, fontWeight: '700' },

  blockedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  blockedLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
});

export default AdminUserManagementScreen;
