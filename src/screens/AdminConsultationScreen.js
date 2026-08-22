/**
 * AdminConsultationScreen — 상담 관리.
 *
 * 예전에는 TabView(구매/판매/완료) 위에 통계 다섯 칸을 얹은 현황판이었다.
 * 두 가지가 문제였다.
 *   * 다섯 숫자가 같은 크기라 어느 것도 눈에 들어오지 않는다. 관리자가 매번
 *     보는 것은 그중 하나뿐이다 — 지금 답을 기다리는 건수.
 *   * TabView가 세 탭을 한꺼번에 마운트한다. 완료 탭 하나가 터지면 화면 전체가
 *     ErrorBoundary로 떨어졌다(2026-08-23 크래시).
 *
 * 지금은 히어로 한 줄 + 상태 필터 + 한 목록이다. 구매/판매/완료는 같은 목록의
 * 다른 조각이므로 탭이 아니라 필터가 맞다.
 *
 * 정렬은 오래 기다린 순 — 목록의 목적이 "무엇을 먼저 처리할까"이기 때문이다.
 */
import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import {
  subscribeToBuyConsultations,
  subscribeToSellConsultations,
  subscribeToCompletedConsultations,
} from '../services/consultation/consultationQueryService';
import AdminHeader from '../components/admin/AdminHeader';
import AdminHero from '../components/admin/AdminHero';
import SegmentFilter from '../components/admin/SegmentFilter';
import ConsultationCard from '../components/ConsultationCard';
import StateScreen from '../components/StateScreen';
import { formatWaiting } from '../utils/format';

/** 아직 관리자의 답을 기다리는 상태 */
const WAITING = ['pending'];
/** 답은 했고 진행 중인 상태 */
const RUNNING = ['approved', 'confirmed', 'on-hold', 'meeting'];

const AdminConsultationScreen = () => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const navigation = useNavigation();

  const [buy, setBuy] = useState([]);
  const [sell, setSell] = useState([]);
  const [done, setDone] = useState([]);
  const [filter, setFilter] = useState('waiting');

  useEffect(() => {
    if (!user) { return () => {}; }
    const unsubBuy = subscribeToBuyConsultations(setBuy);
    const unsubSell = subscribeToSellConsultations(setSell);
    const unsubDone = subscribeToCompletedConsultations(setDone);
    return () => {
      unsubBuy();
      unsubSell();
      unsubDone();
    };
  }, [user]);

  // 구매·판매는 별도 구독이라 합쳐서 하나의 목록으로 본다.
  // 취소된 건은 관리자도 볼 이유가 없다(사용자 화면과 같은 규칙).
  const all = useMemo(() => {
    const merged = [...buy, ...sell, ...done];
    const seen = new Set();
    return merged.filter((c) => {
      if (!c?.id || seen.has(c.id)) { return false; }
      seen.add(c.id);
      return c.consultationStatus !== 'cancelled';
    });
  }, [buy, sell, done]);

  const waiting = useMemo(
    () => all.filter((c) => WAITING.includes(c.consultationStatus)),
    [all],
  );
  const running = useMemo(
    () => all.filter((c) => RUNNING.includes(c.consultationStatus)),
    [all],
  );
  const finished = useMemo(
    () => all.filter((c) => ['completed', 'archived', 'rejected'].includes(c.consultationStatus)),
    [all],
  );

  const list = useMemo(() => {
    const source = filter === 'waiting' ? waiting : filter === 'running' ? running : finished;
    // 오래 기다린 순. created_at이 없으면 뒤로 보낸다.
    return [...source].sort((a, b) => {
      const ta = a?.createdAt ? new Date(a.createdAt).getTime() : Infinity;
      const tb = b?.createdAt ? new Date(b.createdAt).getTime() : Infinity;
      return ta - tb;
    });
  }, [filter, waiting, running, finished]);

  // 히어로 보조 문장 — 가장 오래된 대기 건이 얼마나 지났는지
  const oldestWaiting = useMemo(() => {
    if (waiting.length === 0) { return null; }
    const oldest = [...waiting].sort((a, b) => {
      const ta = a?.createdAt ? new Date(a.createdAt).getTime() : Infinity;
      const tb = b?.createdAt ? new Date(b.createdAt).getTime() : Infinity;
      return ta - tb;
    })[0];
    return formatWaiting(oldest?.createdAt);
  }, [waiting]);

  const handleNavigateToVehicle = useCallback((vehicleId) => {
    navigation.navigate('AdminVehicleDetail', { vehicleId });
  }, [navigation]);

  const renderItem = useCallback(({ item }) => (
    <ConsultationCard
      consultation={item}
      onNavigateToVehicle={handleNavigateToVehicle}
    />
  ), [handleNavigateToVehicle]);

  const empty = filter === 'waiting'
    ? { icon: 'inbox', title: '답을 기다리는 상담이 없습니다', message: '새 상담이 들어오면 여기에 쌓입니다.' }
    : filter === 'running'
      ? { icon: 'event', title: '진행 중인 상담이 없습니다', message: '승인한 상담이 여기에 표시됩니다.' }
      : { icon: 'done-all', title: '완료된 상담이 없습니다', message: '거래가 끝난 상담이 여기에 모입니다.' };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}
      edges={['top']}
    >
      <AdminHeader title="상담" />

      <AdminHero
        value={waiting.length}
        title="건이 답을 기다립니다"
        subtitle={oldestWaiting ? `가장 오래된 건은 ${oldestWaiting.replace(' 대기', '')} 지났습니다` : undefined}
      />

      <SegmentFilter
        value={filter}
        onChange={setFilter}
        items={[
          { key: 'waiting', label: '대기', count: waiting.length },
          { key: 'running', label: '진행', count: running.length },
          { key: 'done', label: '완료', count: finished.length },
        ]}
      />

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          list.length === 0 ? styles.emptyWrap : styles.content
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<StateScreen {...empty} />}
        ListFooterComponent={
          list.length > 1 ? (
            <Text style={[styles.sortNote, { color: theme.colors.text.tertiary }]}>
              오래 기다린 순
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 22, paddingBottom: 20, gap: 12 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22 },
  sortNote: { fontSize: 12, textAlign: 'center', paddingTop: 10 },
});

export default AdminConsultationScreen;
