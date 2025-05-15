import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';

const ConsultationDetailScreen = ({ route }) => {
  const { id } = route.params; // 상담 ID
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConsultation = async () => {
      try {
        const doc = await firestore().collection('consultation_requests').doc(id).get();
        if (doc.exists) {
          setConsultation(doc.data());
        }
      } catch (error) {
        console.error('상담 데이터 가져오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultation();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!consultation) {
    return (
      <View style={styles.container}>
        <Text>상담 데이터를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>상담 상세 정보</Text>
      <Text>이름: {consultation.userName}</Text>
      <Text>전화번호: {consultation.userPhone}</Text>
      <Text>차량명: {consultation.vehicleName}</Text>
      <Text>상담 일정: {consultation.preferredDate} {consultation.preferredTime}</Text>
      <Text>상태: {consultation.status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
});

export default ConsultationDetailScreen;