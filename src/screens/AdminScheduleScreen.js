import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Calendar, LocaleConfig } from 'react-native-calendars';

// ✅ Calendar 한글 설정
LocaleConfig.locales['ko'] = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘'
};
LocaleConfig.defaultLocale = 'ko';

const AdminScheduleScreen = () => {
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [consultations, setConsultations] = useState([]);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('consultation_requests')
      .onSnapshot(snapshot => {
        const all = [];
        const marks = {};

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const date = data.preferredDate; // ✅ camelCase 사용
          const color =
            data.status === 'approved' ? '#28a745'
              : data.status === 'rejected' ? '#dc3545'
                : '#6c757d';

          all.push({ id: doc.id, ...data });

          if (!marks[date]) {
            marks[date] = { marked: true, dots: [{ color }] };
          } else {
            marks[date].dots.push({ color });
          }
        });

        setConsultations(all);
        setMarkedDates(marks);
      });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await firestore().collection('consultation_requests').doc(id).update({ status });
    } catch (error) {
      Alert.alert('오류', '상태 변경 실패');
      console.error(error);
    }
  };

  const confirmReject = (id) => {
    Alert.alert(
      '거절 확인',
      '정말 거절하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '거절', style: 'destructive', onPress: () => updateStatus(id, 'rejected') }
      ]
    );
  };

  const translateStatus = (status) => {
    if (status === 'approved') return '승인됨';
    if (status === 'rejected') return '거절됨';
    return '대기중';
  };

  const filteredConsultations = consultations.filter(
    item => item.preferredDate === selectedDate
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>상담 일정 캘린더</Text>

      <Calendar
        markedDates={markedDates}
        markingType="multi-dot"
        onDayPress={(day) => setSelectedDate(day.dateString)}
        monthFormat={'yyyy년 MM월'} // ✅ 월 표시도 더 예쁘게
        firstDay={0} // ✅ 일요일부터 시작
        theme={{
          textDayFontWeight: '600',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayHeaderFontSize: 14,
        }}
        dayNames={['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']} // ✅ 수동 요일
        dayNamesShort={['일', '월', '화', '수', '목', '금', '토']} // ✅ 수동 요일 축약형
      />

      {selectedDate && (
        <>
          <Text style={styles.listTitle}>{selectedDate} 상담 내역</Text>
          <FlatList
            data={filteredConsultations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.itemText}>차량명: {item.vehicleName}</Text>
                <Text style={styles.itemText}>시간: {item.preferredTime}</Text>
                <Text style={styles.itemText}>상태: {translateStatus(item.status)}</Text>

                <View style={styles.buttonGroup}>
                  <TouchableOpacity onPress={() => updateStatus(item.id, 'approved')} style={styles.approveBtn}>
                    <Text style={styles.btnText}>승인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmReject(item.id)} style={styles.rejectBtn}>
                    <Text style={styles.btnText}>거절</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  listTitle: { fontSize: 16, fontWeight: '600', marginTop: 15, marginBottom: 5 },
  card: {
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  itemText: { fontSize: 14, color: '#333', marginBottom: 3 },
  buttonGroup: { flexDirection: 'row', gap: 10, marginTop: 10 },
  approveBtn: { backgroundColor: '#28a745', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 },
  rejectBtn: { backgroundColor: '#dc3545', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 },
  btnText: { color: '#fff', fontWeight: 'bold' },
});

export default AdminScheduleScreen;
