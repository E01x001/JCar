import React from 'react';
import { logger } from '../../../utils/logger';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { formatPhone } from '../../../utils/format';
import Card from '../../../components/Card';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import StateScreen from '../../../components/StateScreen';
import { getFirestore, doc, updateDoc, getDoc } from '@react-native-firebase/firestore';

const MeetingConsultationsTab = ({ consultations, onNavigateToVehicle }) => {
  const theme = useTheme();

  const meetingConsultations = consultations.filter(c => c.type === 'meeting');

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const db = getFirestore();
      const docRef = doc(db, 'consultation_requests', id);

      // Check if document exists before updating
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        Alert.alert('오류', '상담 요청을 찾을 수 없습니다.');
        return;
      }

      await updateDoc(docRef, { consultationStatus: newStatus });

      // Provide user feedback with Korean status text
      const statusText = newStatus === 'approved' ? '승인' : newStatus === 'rejected' ? '거절' : newStatus;
      Alert.alert('완료', `상담 요청이 ${statusText}되었습니다.`);
    } catch (error) {
      Alert.alert('오류', '상태 업데이트 중 문제가 발생했습니다.');
      logger.error('MeetingConsultationsTab: Failed to update status', error);
    }
  };

  const confirmReject = (id) => {
    Alert.alert(
      '거절 확인',
      '정말 거절하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '거절', style: 'destructive', onPress: () => handleStatusUpdate(id, 'rejected') },
      ]
    );
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'approved': return '승인됨';
      case 'rejected': return '거절됨';
      default: return status;
    }
  };

  const renderItem = (item) => (
    <TouchableOpacity key={item.id} onPress={() => onNavigateToVehicle(item.vehicleId)}>
      <Card style={{ marginBottom: theme.spacing.sm }}>
        <View style={styles.header}>
          <Badge
            status={item.consultationStatus}
            label={getStatusLabel(item.consultationStatus)}
          />
          <Text style={[styles.userName, {
            fontSize: theme.typography.fontSize.body,
            fontWeight: theme.typography.fontWeight.semiBold,
            color: theme.colors.text.primary,
          }]}>{item.userName}</Text>
        </View>

        <Text style={[styles.infoText, {
          fontSize: theme.typography.fontSize.bodySmall,
          color: theme.colors.text.secondary,
          marginTop: theme.spacing.xs,
        }]}>전화번호: {formatPhone(item.userPhone)}</Text>

        <Text style={[styles.infoText, {
          fontSize: theme.typography.fontSize.bodySmall,
          color: theme.colors.text.secondary,
        }]}>차량명: {item.vehicleName}</Text>

        <Text style={[styles.infoText, {
          fontSize: theme.typography.fontSize.bodySmall,
          color: theme.colors.text.secondary,
        }]}>상담 일정: {item.preferredDate} {item.preferredTime}</Text>

        {item.consultationStatus === 'pending' && (
          <View style={[styles.buttonRow, { marginTop: theme.spacing.md }]}>
            <Button
              variant="primary"
              title="승인"
              onPress={() => handleStatusUpdate(item.id, 'approved')}
              style={{ flex: 1, marginRight: theme.spacing.xs }}
            />
            <Button
              variant="danger"
              title="거절"
              onPress={() => confirmReject(item.id)}
              style={{ flex: 1, marginLeft: theme.spacing.xs }}
            />
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  if (meetingConsultations.length === 0) {
    return (
      <StateScreen
        icon="event"
        title="미팅이 없습니다"
        message="미팅 요청이 없습니다."
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
      {meetingConsultations.map(item => renderItem(item))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {},
  infoText: {},
  buttonRow: {
    flexDirection: 'row',
  },
});

export default MeetingConsultationsTab;
