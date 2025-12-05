import React from 'react';
import { ScrollView, Alert } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import ConsultationCard from '../../../components/ConsultationCard';
import StateScreen from '../../../components/StateScreen';
import firestore, { doc, updateDoc, getDoc, serverTimestamp } from '@react-native-firebase/firestore';

const SellConsultationsTab = ({ consultations, onNavigateToVehicle }) => {
  const theme = useTheme();

  // Handle '채결' (Complete) - Mark consultation as completed
  const handleComplete = async (id) => {
    try {
      const docRef = doc(firestore(), 'consultation_requests', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          consultationStatus: 'completed',
          completedAt: serverTimestamp(),
          // completedBy and dealAmount should be set via CompleteDealModal (Task #39)
        });
        Alert.alert('완료', '상담이 채결 완료로 변경되었습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '상태 업데이트 중 문제가 발생했습니다.');
    }
  };

  // Handle '보류' (Hold) - Mark consultation as on-hold
  const handleHold = async (id) => {
    try {
      const docRef = doc(firestore(), 'consultation_requests', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          consultationStatus: 'on-hold',
        });
        Alert.alert('완료', '상담이 보류되었습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '상태 업데이트 중 문제가 발생했습니다.');
    }
  };

  // Handle '거절' (Reject) - Mark consultation as rejected
  const handleReject = async (id) => {
    try {
      const docRef = doc(firestore(), 'consultation_requests', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          consultationStatus: 'rejected',
        });
        Alert.alert('완료', '상담이 거절되었습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '상태 업데이트 중 문제가 발생했습니다.');
    }
  };

  // Transform consultation data to ensure consultationStatus field exists
  const normalizeConsultation = (item) => {
    return {
      ...item,
      // Use consultationStatus if available, fallback to status (for backward compatibility)
      consultationStatus: item.consultationStatus || item.status || 'pending',
    };
  };

  if (consultations.length === 0) {
    return (
      <StateScreen
        icon="event"
        title="판매 상담이 없습니다"
        message="판매 상담 요청이 없습니다."
      />
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
      }}
    >
      {consultations.map(item => (
        <ConsultationCard
          key={item.id}
          consultation={normalizeConsultation(item)}
          onNavigateToVehicle={onNavigateToVehicle}
          onComplete={handleComplete}
          onHold={handleHold}
          onReject={handleReject}
        />
      ))}
    </ScrollView>
  );
};

export default SellConsultationsTab;
