import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import DatePicker from 'react-native-date-picker';
import { AuthContext } from '../context/AuthContext';
import { getFirestore, collection, query, where, getDocs } from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { saveConsultationRequest, resubmitConsultation, checkConsultationRateLimit } from '../services/consultation/consultationService';
import useConsultationStore from '../stores/consultationStore';
import { generateTempId, executeOptimisticUpdate } from '../utils/optimisticHelpers';

const ConsultationRequestScreen = ({ route }) => {
  const { user, sellerName, sellerPhone } = useContext(AuthContext);
  const navigation = useNavigation();
  const { addOptimisticConsultation, removeOptimisticConsultation, invalidateUserConsultationsCache } = useConsultationStore();
  const [selectedDate, setSelectedDate] = useState('');
  const [time, setTime] = useState(new Date());
  const [open, setOpen] = useState(false);
  const { vehicle, isSell, consultationId, existingDate, existingTime } = route.params;

  // Detect resubmission mode
  const isResubmitMode = !!consultationId;

  // Pre-populate form when resubmitting
  useEffect(() => {
    if (isResubmitMode && existingDate && existingTime) {
      setSelectedDate(existingDate);

      // Parse existing time and set it
      const [hours, minutes] = existingTime.split(':').map(Number);
      const newTime = new Date();
      newTime.setHours(hours, minutes, 0, 0);
      setTime(newTime);
    }
  }, [isResubmitMode, existingDate, existingTime]);

  const adjustToNearestTenMinutes = (date) => {
    const minutes = date.getMinutes();
    const remainder = minutes % 10;
    if (remainder !== 0) {
      date.setMinutes(minutes + (10 - remainder), 0, 0);
    }
    return date;
  };

  const checkDuplicateConsultation = async (userId, vehicleId) => {
    const db = getFirestore();
    const consultationsRef = collection(db, 'consultation_requests');
    const q = query(
      consultationsRef,
      where('userId', '==', userId),
      where('vehicleId', '==', vehicleId)
    );
    const snapshot = await getDocs(q);

    // Debug: Log all consultations to see their status
    console.log('🔍 중복 검사 - 총 상담 개수:', snapshot.docs.length);
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  [${index + 1}] ID: ${doc.id}`);
      console.log(`      consultationStatus: "${data.consultationStatus}"`);
      console.log(`      status: "${data.status}"`);
      console.log(`      type: "${data.type}"`);
    });

    // Filter out cancelled consultations - they should not count as duplicates
    // Check both consultationStatus and status for backward compatibility
    const activeConsultations = snapshot.docs.filter(doc => {
      const data = doc.data();
      const status = data.consultationStatus || data.status;
      const isCancelled = status === 'cancelled';
      console.log(`  - Filtering doc ${doc.id}: status="${status}", isCancelled=${isCancelled}`);
      return !isCancelled;
    });

    console.log('✅ 활성 상담 개수 (취소 제외):', activeConsultations.length);
    return activeConsultations.length > 0;
  };

  // Time conflict checking removed - handled server-side via Firestore rules
  // Server will reject requests with duplicate vehicleId/date/time combinations

  const handleSubmit = async () => {
    console.log(isResubmitMode ? '🟡 상담 재신청 버튼 클릭됨' : '🟡 상담 요청 버튼 클릭됨');

    if (!user) {
      console.warn('⛔ 사용자 정보 없음');
      Alert.alert('로그인이 필요합니다.');
      return;
    }

    if (!selectedDate) {
      console.warn('⛔ 날짜 미선택');
      Alert.alert('날짜를 선택해주세요.');
      return;
    }

    if (!time) {
      console.warn('⛔ 시간 미선택');
      Alert.alert('시간을 선택해주세요.');
      return;
    }

    const formattedDate = selectedDate;
    const formattedTime = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    console.log('📅 선택된 날짜:', formattedDate);
    console.log('⏰ 선택된 시간:', formattedTime);

    // Handle resubmission mode
    if (isResubmitMode) {
      try {
        await resubmitConsultation(consultationId, formattedDate, formattedTime);
        console.log('✅ 재신청 성공');

        Alert.alert('상담 재신청 완료', '새로운 일정으로 재신청되었습니다.', [
          {
            text: '확인',
            onPress: () => navigation.goBack(),
          },
        ]);
      } catch (error) {
        console.error('❌ 재신청 실패:', error);
        Alert.alert('재신청 실패', '상담 재신청 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
      return;
    }

    // Handle new consultation request mode
    const isDuplicate = await checkDuplicateConsultation(user.uid, vehicle.vehicleId);
    console.log('🔁 중복 상담 여부:', isDuplicate);

    if (isDuplicate) {
      Alert.alert('중복 요청', '이미 이 차량에 대한 상담을 신청하셨습니다.');
      return;
    }

    // Rate limit must be checked BEFORE the optimistic success below, otherwise
    // the user is told "접수 완료" and only afterwards rejected. (Task 82)
    const rateLimit = await checkConsultationRateLimit();
    if (!rateLimit.allowed) {
      Alert.alert('요청 제한', rateLimit.message || '잠시 후 다시 시도해주세요.');
      return;
    }

    // Task 106.2: Optimistic UI - Generate temp ID for optimistic update
    const tempId = generateTempId('temp_consultation');

    // Time conflict checking removed - server-side validation will handle duplicates

    const consultationData = {
      userId: user.uid,
      userName: sellerName || '익명',
      userPhone: sellerPhone || '미등록',
      vehicleId: vehicle.vehicleId,
      vehicleName: vehicle.vehicleName,
      preferredDate: formattedDate,
      preferredTime: formattedTime,
      consultationStatus: 'pending',
      type: isSell ? 'sell' : 'buy',
      createdAt: new Date(), // Use local time for optimistic data
    };

    console.log('🚀 저장할 상담 요청 데이터:', consultationData);

    // Task 106.2: Optimistic UI - Add consultation immediately
    addOptimisticConsultation(consultationData, tempId);

    // Invalidate cache to show new consultation
    invalidateUserConsultationsCache(user.uid);

    // Show success and navigate immediately (optimistic)
    Alert.alert('상담 요청 완료', '정상적으로 접수되었습니다.', [
      {
        text: '확인',
        onPress: () => navigation.goBack(),
      },
    ]);

    // Fire Firestore write in background (non-blocking)
    executeOptimisticUpdate({
      optimisticFn: null, // Already done above
      serverFn: async () => {
        const result = await saveConsultationRequest(consultationData);
        if (!result.success) {
          throw result.error || new Error('Failed to save consultation');
        }
        return result;
      },
      onSuccess: () => {
        console.log('✅ Consultation saved successfully');
        // Firestore listener will automatically update the store
      },
      onError: (error) => {
        console.error('❌ Consultation write failed:', error);
        // Remove optimistic consultation
        removeOptimisticConsultation(tempId);
        // Show error alert (user may have already navigated away)
        Alert.alert('오류', '상담 요청 저장 중 문제가 발생했습니다. 다시 시도해주세요.');
      },
      revertFn: () => {
        removeOptimisticConsultation(tempId);
      },
    });
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isResubmitMode ? '상담 일정 재선택' : '구매 상담 일정 선택'}
      </Text>

      <Calendar
        onDayPress={(day) => {
          setSelectedDate(day.dateString);
        }}
        markedDates={{
          [selectedDate]: {
            selected: true,
            selectedColor: '#28a745',
            selectedTextColor: '#fff',
          },
        }}
      />

      <Text style={styles.selectedText}>
        {selectedDate ? `선택된 날짜: ${selectedDate}` : '날짜를 선택하세요'}
      </Text>

      <TouchableOpacity onPress={() => setOpen(true)} style={styles.dateButton}>
        <Text>{`${time.getHours()}시 ${time.getMinutes()}분`}</Text>
      </TouchableOpacity>

      <DatePicker
        modal
        open={open}
        date={time}
        mode="time"
        minuteInterval={10}
        onConfirm={(newTime) => {
          const adjustedTime = adjustToNearestTenMinutes(newTime);
          setTime(adjustedTime);
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>
          {isResubmitMode ? '상담 재신청' : '상담 요청'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  selectedText: { fontSize: 16, marginVertical: 10 },
  dateButton: { padding: 10, backgroundColor: '#eee', marginTop: 10, alignItems: 'center' },
  submitButton: { backgroundColor: '#28a745', padding: 12, marginTop: 20 },
  submitButtonText: { color: '#fff', fontSize: 16, textAlign: 'center' },
});

export default ConsultationRequestScreen;
