/**
 * AdminScheduleScreen — 일정.
 *
 * 월과 주를 모두 둔다. 답하는 질문이 달라서 하나로 합칠 수가 없다.
 *   월 — 이번 달 어디가 비었나, 언제 몰려 있나 (날짜 밑 상태 점)
 *   주 — 그 시간에 누가 오나 (시간 축 + 연락처)
 *
 * 예전에는 월 격자 하나뿐이었고, 점 색이 무슨 뜻인지 알려주는 것이 없어
 * 점이 사실상 장식이었다. 범례를 붙이고 색을 statusChip 팔레트로 맞춘다.
 */
import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabase';
import { consultationRowToApp } from '../lib/mappers';
import { updateConsultationStatus } from '../services/consultation/consultationService';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { formatPhone } from '../utils/format';
import AdminHeader from '../components/admin/AdminHeader';
import SpineCard from '../components/admin/SpineCard';
import StateScreen from '../components/StateScreen';
import RejectConsultationModal from '../components/modals/RejectConsultationModal';

LocaleConfig.locales.ko = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** Date → 'YYYY-MM-DD' (로컬 기준. toISOString은 UTC로 밀려 하루가 어긋난다) */
const toKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const AdminScheduleScreen = () => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();

  const [view, setView] = useState('month');
  const [consultations, setConsultations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(toKey(new Date()));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);

  useEffect(() => {
    if (!user) { return () => {}; }

    let disposed = false;
    let timer = null;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('consultation_requests')
          .select('*')
          .limit(1000);
        if (error) { throw error; }
        if (disposed) { return; }
        setConsultations(data.map(consultationRowToApp));
      } catch (error) {
        logger.error('AdminScheduleScreen: 상담 조회 실패', error);
      }
    };

    const scheduleReload = () => {
      if (timer) { clearTimeout(timer); }
      timer = setTimeout(load, 300);
    };

    load();

    const channel = supabase
      .channel(`admin-schedule-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultation_requests' }, scheduleReload)
      .subscribe();

    return () => {
      disposed = true;
      if (timer) { clearTimeout(timer); }
      supabase.removeChannel(channel);
    };
     
  }, [user]);

  /** 상태 → 칩 팔레트 갈래 (점·척추·글자색이 모두 여기서 나온다) */
  const chipKeyFor = useCallback((status) => {
    if (status === 'approved' || status === 'confirmed') { return 'approved'; }
    if (status === 'rejected') { return 'rejected'; }
    if (status === 'completed') { return 'completed'; }
    if (status === 'cancelled' || status === 'archived') { return 'neutral'; }
    return 'pending';
  }, []);

  const markedDates = useMemo(() => {
    const marks = {};
    consultations.forEach((item) => {
      const date = item.preferredDate;
      if (!date) { return; }
      const dot = { color: theme.colors.statusChip[chipKeyFor(item.consultationStatus)].dot };
      if (!marks[date]) {
        marks[date] = { marked: true, dots: [dot] };
      } else if (marks[date].dots.length < 4) {
        // 점 네 개를 넘기면 날짜 칸이 뭉갠다 — 그 이상은 세지 않는다
        marks[date].dots.push(dot);
      }
    });
    if (selectedDate) {
      marks[selectedDate] = { ...(marks[selectedDate] || {}), selected: true };
    }
    return marks;
  }, [consultations, selectedDate, theme, chipKeyFor]);

  /** 선택한 날의 상담 — 시간 순 */
  const dayList = useMemo(() => consultations
    .filter((c) => c.preferredDate === selectedDate)
    .sort((a, b) => String(a.preferredTime).localeCompare(String(b.preferredTime))),
  [consultations, selectedDate]);

  /** 주 스트립 — 선택한 날이 포함된 일요일~토요일 */
  const week = useMemo(() => {
    const base = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
    const sunday = new Date(base.getTime() - base.getDay() * DAY_MS);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday.getTime() + i * DAY_MS);
      const key = toKey(d);
      const items = consultations.filter((c) => c.preferredDate === key);
      return { key, date: d.getDate(), weekday: WEEKDAYS[i], items };
    });
  }, [selectedDate, consultations]);

  const updateStatus = async (id, status) => {
    try {
      await updateConsultationStatus(id, status);
      Alert.alert('완료', `상담 요청이 ${status === 'approved' ? '승인' : '거절'}되었습니다.`);
    } catch (error) {
      Alert.alert('오류', '상태 변경 중 문제가 발생했습니다.');
      logger.error('AdminScheduleScreen: Failed to update status', error);
    }
  };

  /**
   * 거절은 사유를 받아 신청자에게 보낸다.
   * 예전에는 이 화면만 사유 없이 Alert로 끝냈다 — 상담관리에서 거절하면 사유가
   * 가고 일정에서 거절하면 안 가는 상태였다. 같은 결정을 두 경로가 다르게
   * 처리할 이유가 없다.
   */
  const confirmReject = (id) => setRejectTarget(id);

  const submitReject = async (rejectionReason) => {
    try {
      await updateConsultationStatus(rejectTarget, 'rejected', null, '', rejectionReason);
      setRejectTarget(null);
      Alert.alert('완료', '상담 요청이 거절되었습니다.');
    } catch (error) {
      Alert.alert('오류', '거절 처리 중 문제가 발생했습니다.');
      logger.error('AdminScheduleScreen: reject failed', error);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const renderConsultation = (item) => {
    const chip = theme.colors.statusChip[chipKeyFor(item.consultationStatus)];
    const label = item.consultationStatus === 'approved' ? '승인됨'
      : item.consultationStatus === 'rejected' ? '거절됨'
        : item.consultationStatus === 'completed' ? '완료' : '대기중';

    return (
      <SpineCard key={item.id} status={item.consultationStatus} style={styles.item}>
        <View style={styles.itemHead}>
          <Text style={[styles.time, { color: theme.colors.primary.main }]}>
            {item.preferredTime}
          </Text>
          <View style={styles.itemIdentity}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: theme.colors.text.primary }]} numberOfLines={1}>
                {item.userName}
              </Text>
              <View style={[styles.typeTag, { backgroundColor: theme.colors.tag.neutral.bg }]}>
                <Text style={[styles.typeTagText, { color: theme.colors.tag.neutral.fg }]}>
                  {item.type === 'sell' ? '판매' : '구매'}
                </Text>
              </View>
            </View>
            <Text style={[styles.vehicle, { color: theme.colors.text.secondary }]} numberOfLines={1}>
              {item.vehicleName}
            </Text>
          </View>
          <Text style={[styles.status, { color: chip.fg }]}>{label}</Text>
        </View>

        <Text style={[styles.phone, { color: theme.colors.text.secondary }]}>
          {formatPhone(item.userPhone)}
        </Text>

        {item.consultationStatus === 'pending' ? (
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => updateStatus(item.id, 'approved')}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={[styles.approve, { backgroundColor: theme.colors.primary.main }]}
            >
              <Text style={[styles.actionText, { color: theme.colors.text.white }]}>승인</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => confirmReject(item.id)}
              activeOpacity={0.85}
              accessibilityRole="button"
              style={[styles.reject, { backgroundColor: theme.colors.statusChip.rejected.bg }]}
            >
              <Text style={[styles.actionText, { color: theme.colors.statusChip.rejected.fg }]}>
                거절
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </SpineCard>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}
      edges={['top']}
    >
      <AdminHeader
        title="일정"
        right={
          <View style={[styles.switcher, { backgroundColor: theme.colors.background.tertiary }]}>
            {['month', 'week'].map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setView(v)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: view === v }}
                style={[
                  styles.switchItem,
                  view === v && {
                    backgroundColor: theme.colors.background.card,
                    ...theme.shadows.header,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.switchText,
                    {
                      color: view === v ? theme.colors.text.primary : theme.colors.text.secondary,
                      fontWeight: view === v ? '700' : '600',
                    },
                  ]}
                >
                  {v === 'month' ? '월' : '주'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary.main]}
            tintColor={theme.colors.primary.main}
          />
        }
      >
        {view === 'month' ? (
          <View style={[styles.calendarShadow, theme.shadows.soft]}>
            <View style={[styles.calendarCard, { backgroundColor: theme.colors.background.card }]}>
              <Calendar
                markedDates={markedDates}
                markingType="multi-dot"
                onDayPress={(day) => setSelectedDate(day.dateString)}
                monthFormat={'yyyy년 M월'}
                firstDay={0}
                theme={{
                  calendarBackground: theme.colors.background.card,
                  textSectionTitleColor: theme.colors.text.tertiary,
                  selectedDayBackgroundColor: theme.colors.primary.main,
                  selectedDayTextColor: theme.colors.neutral.white,
                  todayTextColor: theme.colors.primary.main,
                  dayTextColor: theme.colors.text.primary,
                  textDisabledColor: theme.colors.border.default,
                  arrowColor: theme.colors.text.secondary,
                  monthTextColor: theme.colors.text.primary,
                  textDayFontWeight: '500',
                  textMonthFontWeight: '700',
                  textDayHeaderFontWeight: '600',
                  textDayHeaderFontSize: 11,
                  textMonthFontSize: 19,
                  textDayFontSize: 14,
                }}
              />

              {/* 범례 — 색만 있고 뜻이 없으면 점은 장식이다 */}
              <View style={[styles.legend, { borderTopColor: theme.colors.border.light }]}>
                {[
                  ['pending', '대기'],
                  ['approved', '승인'],
                  ['completed', '완료'],
                  ['rejected', '거절'],
                ].map(([key, label]) => (
                  <View key={key} style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: theme.colors.statusChip[key].dot }]} />
                    <Text style={[styles.legendText, { color: theme.colors.text.secondary }]}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.weekStrip}>
            {week.map((d) => {
              const selected = d.key === selectedDate;
              return (
                <TouchableOpacity
                  key={d.key}
                  onPress={() => setSelectedDate(d.key)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.weekDay,
                    selected && { backgroundColor: theme.colors.primary.main },
                  ]}
                >
                  <Text
                    style={[styles.weekLabel, {
                      color: selected ? theme.colors.text.white : theme.colors.text.tertiary,
                    }]}
                  >
                    {d.weekday}
                  </Text>
                  <Text
                    style={[styles.weekDate, {
                      color: selected ? theme.colors.text.white : theme.colors.text.primary,
                      fontWeight: selected ? '700' : '600',
                    }]}
                  >
                    {d.date}
                  </Text>
                  <View style={styles.weekDots}>
                    {d.items.slice(0, 3).map((c) => (
                      <View
                        key={c.id}
                        style={[styles.dot, {
                          backgroundColor: selected
                            ? theme.colors.neutral.white
                            : theme.colors.statusChip[chipKeyFor(c.consultationStatus)].dot,
                        }]}
                      />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.listHead}>
          <Text style={[styles.listTitle, { color: theme.colors.text.primary }]}>
            {selectedDate}
          </Text>
          <Text style={[styles.listCount, { color: theme.colors.text.tertiary }]}>
            {dayList.length}건
          </Text>
        </View>

        {dayList.length > 0 ? (
          <View style={styles.list}>{dayList.map(renderConsultation)}</View>
        ) : (
          <StateScreen
            icon="event-available"
            title="이 날은 비어 있습니다"
            message="다른 날짜를 선택해보세요."
          />
        )}
      </ScrollView>

      <RejectConsultationModal
        isVisible={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        onSubmit={submitReject}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 16, paddingBottom: 24 },

  switcher: { flexDirection: 'row', borderRadius: 999, padding: 3 },
  switchItem: { paddingVertical: 6, paddingHorizontal: 15, borderRadius: 999 },
  switchText: { fontSize: 12 },

  // 그림자와 클리핑 분리 — 안드로이드에서 elevation이 잘리지 않게
  calendarShadow: { marginHorizontal: 22, borderRadius: 18 },
  calendarCard: { borderRadius: 18, overflow: 'hidden', paddingBottom: 4 },
  legend: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 11 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  weekStrip: { flexDirection: 'row', gap: 6, paddingHorizontal: 22 },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 14,
  },
  weekLabel: { fontSize: 11, fontWeight: '500' },
  weekDate: { fontSize: 15 },
  weekDots: { flexDirection: 'row', gap: 3, height: 5, alignItems: 'center' },

  listHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 10,
  },
  listTitle: { fontSize: 15, fontWeight: '700' },
  listCount: { fontSize: 12 },
  list: { paddingHorizontal: 22, gap: 12 },

  item: {},
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  time: { fontSize: 15, fontWeight: '700' },
  itemIdentity: { flex: 1, minWidth: 0, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  typeTag: { borderRadius: 5, paddingVertical: 2, paddingHorizontal: 6 },
  typeTagText: { fontSize: 10, fontWeight: '700' },
  vehicle: { fontSize: 12 },
  status: { fontSize: 11, fontWeight: '600' },
  phone: { fontSize: 13, marginTop: 10 },

  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  approve: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reject: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 14, fontWeight: '600' },
});

export default AdminScheduleScreen;
