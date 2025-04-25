import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Calendar } from 'react-native-calendars';

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
          const date = data.preferred_date;
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

  const filteredConsultations = consultations.filter(
    item => item.preferred_date === selectedDate
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>상담 일정 캘린더</Text>

      <Calendar
        markedDates={markedDates}
        markingType="multi-dot"
        onDayPress={(day) => setSelectedDate(day.dateString)}
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
                <Text style={styles.itemText}>시간: {item.preferred_time}</Text>
                <Text style={styles.itemText}>상태: {item.status}</Text>

                <View style={styles.buttonGroup}>
                  <TouchableOpacity onPress={() => updateStatus(item.id, 'approved')} style={styles.approveBtn}>
                    <Text style={styles.btnText}>승인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => updateStatus(item.id, 'rejected')} style={styles.rejectBtn}>
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