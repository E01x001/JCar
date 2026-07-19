import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { AuthContext } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { saveConsultationRequest, resubmitConsultation, checkConsultationRateLimit, isSlotTaken, hasActiveConsultation } from '../services/consultation/consultationService';
import useConsultationStore from '../stores/consultationStore';
import { generateTempId, executeOptimisticUpdate } from '../utils/optimisticHelpers';
import { logger } from '../utils/logger';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../theme/ThemeProvider';
import { canViewVehiclePrice, PRICE_HIDDEN_LABEL } from '../utils/vehiclePrice';

// Generate time slots 09:00–18:00 in 10-min steps
const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 9; h <= 17; h++) {
    for (let m = 0; m < 60; m += 30) {
      const label = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      slots.push(label);
    }
  }
  slots.push('18:00');
  return slots;
})();

const ConsultationRequestScreen = ({ route }) => {
  const { user, role, sellerName, sellerPhone } = useContext(AuthContext);
  const navigation = useNavigation();
  const toast = useToast();
  const theme = useTheme();
  const { addOptimisticConsultation, removeOptimisticConsultation, invalidateUserConsultationsCache } = useConsultationStore();

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { vehicle, isSell, consultationId, existingDate, existingTime } = route.params;
  const isResubmitMode = !!consultationId;

  useEffect(() => {
    if (isResubmitMode && existingDate && existingTime) {
      setSelectedDate(existingDate);
      setSelectedTime(existingTime);
    }
  }, [isResubmitMode, existingDate, existingTime]);

  // 차량 DB PK(uuid). Supabase 이전 후 vehicle.vehicleId는 차량번호 별칭이므로
  // 데이터 작업에는 반드시 id를 쓴다.
  const vehicleDbId = vehicle?.id;

  const handleSubmit = async () => {
    if (submitting) { return; }
    if (!user) { toast.showWarning('로그인이 필요합니다.'); return; }
    if (!selectedDate) { toast.showWarning('날짜를 선택해주세요.'); return; }
    if (!selectedTime) { toast.showWarning('시간을 선택해주세요.'); return; }

    setSubmitting(true);

    // 이미 다른 상담이 점유한 시간인지 사전 확인(빠른 피드백 — 최종 방어는 DB UNIQUE)
    if (await isSlotTaken(vehicleDbId, selectedDate, selectedTime)) {
      toast.showWarning('예약 불가', '이미 예약된 시간입니다. 다른 시간을 선택해주세요.');
      setSubmitting(false);
      return;
    }

    if (isResubmitMode) {
      try {
        await resubmitConsultation(consultationId, selectedDate, selectedTime);
        toast.showSuccess('상담 재신청 완료', '새로운 일정으로 재신청되었습니다.');
        navigation.goBack();
      } catch (error) {
        logger.error('재신청 실패:', error);
        toast.showError('재신청 실패', '상담 재신청 중 오류가 발생했습니다.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const isDuplicate = await hasActiveConsultation(user.uid, vehicleDbId);
    if (isDuplicate) {
      toast.showWarning('중복 요청', '이미 이 차량에 대한 상담을 신청하셨습니다.');
      setSubmitting(false);
      return;
    }

    const rateLimit = await checkConsultationRateLimit();
    if (!rateLimit.allowed) {
      toast.showWarning('요청 제한', rateLimit.message || '잠시 후 다시 시도해주세요.');
      setSubmitting(false);
      return;
    }

    const tempId = generateTempId('temp_consultation');
    const consultationData = {
      userId: user.uid,
      userName: sellerName || '익명',
      userPhone: sellerPhone || '미등록',
      vehicleId: vehicleDbId,
      vehicleName: vehicle.vehicleName,
      preferredDate: selectedDate,
      preferredTime: selectedTime,
      consultationStatus: 'pending',
      type: isSell ? 'sell' : 'buy',
      createdAt: new Date(),
    };

    addOptimisticConsultation(consultationData, tempId);
    invalidateUserConsultationsCache(user.uid);
    toast.showSuccess('상담 요청 완료', '정상적으로 접수되었습니다.');
    navigation.goBack();

    executeOptimisticUpdate({
      optimisticFn: null,
      serverFn: async () => {
        const result = await saveConsultationRequest(consultationData);
        if (!result.success) {
          const err = result.error || new Error('Failed to save');
          err.slotConflict = result.slotConflict;
          throw err;
        }
        return result;
      },
      onSuccess: () => logger.debug('Consultation saved'),
      onError: (error) => {
        logger.error('Consultation write failed:', error);
        removeOptimisticConsultation(tempId);
        if (error?.slotConflict) {
          toast.showWarning('예약 불가', '방금 다른 사용자가 해당 시간을 예약했습니다. 다른 시간을 선택해주세요.');
        } else {
          toast.showError('오류', '상담 요청 저장 중 문제가 발생했습니다.');
        }
      },
      revertFn: () => removeOptimisticConsultation(tempId),
    });

    setSubmitting(false);
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const PRIMARY = '#2B4593';
  const BG      = '#F8F9FA';

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={[styles.headerBack, { color: PRIMARY }]}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isResubmitMode ? '일정 재선택' : isSell ? '판매 상담 일정 선택' : '구매 상담 일정 선택'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: BG }}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Vehicle mini-card */}
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleImg} />
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleName}>{vehicle?.vehicleName}</Text>
            <Text style={[styles.vehiclePrice, { color: PRIMARY }]}>
              {canViewVehiclePrice(vehicle, { uid: user?.uid, role })
                ? (vehicle?.price ? `${vehicle.price.toLocaleString()}원` : '-')
                : PRICE_HIDDEN_LABEL}
            </Text>
          </View>
          <View style={[styles.vehicleBadge, { backgroundColor: '#EAF4FF' }]}>
            <Text style={[styles.vehicleBadgeText, { color: '#1A6FB5' }]}>
              {isSell ? '판매' : '구매'}
            </Text>
          </View>
        </View>

        {/* Calendar */}
        <Text style={styles.sectionTitle}>날짜 선택</Text>
        <View style={styles.calendarCard}>
          <Calendar
            minDate={todayStr}
            disableAllTouchEventsForDisabledDays
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: PRIMARY,
                selectedTextColor: '#fff',
              },
            }}
            theme={{
              backgroundColor: '#fff',
              calendarBackground: '#fff',
              selectedDayBackgroundColor: PRIMARY,
              selectedDayTextColor: '#fff',
              todayTextColor: PRIMARY,
              dayTextColor: '#212529',
              textDisabledColor: '#CED4DA',
              arrowColor: PRIMARY,
              monthTextColor: '#212529',
              textDayFontWeight: '600',
              textMonthFontWeight: '800',
              textDayHeaderFontSize: 12,
              textDayFontSize: 14,
            }}
          />
        </View>

        {/* Time grid */}
        <Text style={styles.sectionTitle}>시간 선택</Text>
        <View style={styles.timeGrid}>
          {TIME_SLOTS.map((slot) => {
            const active = selectedTime === slot;
            return (
              <TouchableOpacity
                key={slot}
                style={[
                  styles.timeChip,
                  active
                    ? { backgroundColor: PRIMARY, borderColor: PRIMARY }
                    : { backgroundColor: '#fff', borderColor: '#E1E5EA' },
                ]}
                onPress={() => setSelectedTime(slot)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.timeChipText,
                  { color: active ? '#fff' : '#495057' },
                ]}>
                  {slot}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Summary card */}
        {(selectedDate || selectedTime) ? (
          <View style={[styles.summaryCard, { backgroundColor: '#EEF1FA' }]}>
            <Text style={[styles.summaryLabel, { color: PRIMARY }]}>선택된 일정</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryValue}>{selectedDate || '날짜 미선택'}</Text>
              <Text style={[styles.summaryTime, { color: PRIMARY }]}>{selectedTime || '-'}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky submit button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: PRIMARY }, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? '처리 중...' : isResubmitMode ? '상담 재신청' : '상담 요청하기'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FA' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingTop: 50,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  headerBack:  { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#212529' },

  // Vehicle card
  vehicleCard: {
    marginHorizontal: 22,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    shadowColor: '#1A2B5C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  vehicleImg: {
    width: 54, height: 54, borderRadius: 12,
    backgroundColor: '#E8ECF3',
  },
  vehicleName:  { fontSize: 16, fontWeight: '800', color: '#212529', marginBottom: 4 },
  vehiclePrice: { fontSize: 14, fontWeight: '800' },
  vehicleBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  vehicleBadgeText: { fontSize: 12, fontWeight: '700' },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#212529',
    marginHorizontal: 22,
    marginTop: 22,
    marginBottom: 12,
  },

  calendarCard: {
    marginHorizontal: 22,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#1A2B5C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },

  timeGrid: {
    marginHorizontal: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeChip: {
    width: '30%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  timeChipText: { fontSize: 14, fontWeight: '700' },

  summaryCard: {
    marginHorizontal: 22,
    marginTop: 20,
    borderRadius: 16,
    padding: 18,
  },
  summaryLabel: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryValue: { fontSize: 15, fontWeight: '700', color: '#212529' },
  summaryTime:  { fontSize: 15, fontWeight: '800' },

  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    padding: 14,
    paddingBottom: 26,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
    shadowColor: '#1A2B5C',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 8,
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#2B4593',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 20,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ConsultationRequestScreen;
