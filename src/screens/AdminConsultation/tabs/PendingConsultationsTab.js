import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { formatPhone } from '../../../utils/format';
import Card from '../../../components/Card';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import StateScreen from '../../../components/StateScreen';
import firestore, { doc, updateDoc, getDoc } from '@react-native-firebase/firestore';

const PendingConsultationsTab = ({ consultations, onNavigateToVehicle }) => {
  const theme = useTheme();

  const buyConsultations = consultations.filter(c => c.type !== 'sell');
  const sellConsultations = consultations.filter(c => c.type === 'sell');

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const docRef = doc(firestore(), 'consultation_requests', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await updateDoc(docRef, { status: newStatus });
        Alert.alert('완료', `요청이 '${newStatus}'로 변경되었습니다.`);
      }
    } catch (error) {
      Alert.alert('오류', '상태 업데이트 중 문제가 발생했습니다.');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => onNavigateToVehicle(item.vehicleId)}>
      <Card style={{ marginBottom: theme.spacing.sm }}>
        <View style={styles.header}>
          <Badge
            status="pending"
            label={item.type === 'sell' ? '판매' : '구매'}
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
            onPress={() => handleStatusUpdate(item.id, 'rejected')}
            style={{ flex: 1, marginLeft: theme.spacing.xs }}
          />
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderSection = (title, data) => (
    <View>
      <Text style={[styles.sectionTitle, {
        fontSize: theme.typography.fontSize.h3,
        fontWeight: theme.typography.fontWeight.semiBold,
        color: theme.colors.text.primary,
        marginVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
      }]}>{title}</Text>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingBottom: theme.spacing.sm,
        }}
        ListEmptyComponent={
          <StateScreen
            icon="event"
            title="대기중인 상담이 없습니다"
            message={`${title} 요청이 없습니다.`}
          />
        }
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {renderSection('구매 상담', buyConsultations)}
      {renderSection('판매 상담', sellConsultations)}
    </View>
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
  sectionTitle: {},
  buttonRow: {
    flexDirection: 'row',
  },
});

export default PendingConsultationsTab;
