import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import Card from '../../../components/Card';
import Badge from '../../../components/Badge';
import StateScreen from '../../../components/StateScreen';

const SellConsultationsTab = ({ consultations, onNavigateToVehicle }) => {
  const theme = useTheme();

  const sellConsultations = consultations.filter(c => c.type === 'sell');

  const getStatusBadge = (status) => {
    if (status === 'approved') {
      return <Badge status="completed" label="승인됨" />;
    } else if (status === 'rejected') {
      return <Badge status="rejected" label="거절됨" />;
    }
    return <Badge status="pending" label="대기중" />;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => onNavigateToVehicle(item.vehicleId)}>
      <Card style={{ marginBottom: theme.spacing.sm }}>
        <View style={styles.consultHeader}>
          <Text style={[styles.consultText, {
            fontSize: theme.typography.fontSize.body,
            fontWeight: theme.typography.fontWeight.semiBold,
            color: theme.colors.text.primary,
          }]}>{item?.vehicleName ?? '차량명 없음'}</Text>
          {getStatusBadge(item.status)}
        </View>
        <Text style={[styles.consultDetail, {
          fontSize: theme.typography.fontSize.bodySmall,
          color: theme.colors.text.secondary,
          marginTop: theme.spacing.xs,
        }]}>일정: {item?.preferredDate ?? ''} {item?.preferredTime ?? ''}</Text>
      </Card>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={sellConsultations}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        padding: theme.spacing.md,
        flexGrow: 1,
      }}
      ListEmptyComponent={
        <StateScreen
          icon="sell"
          title="판매 상담 내역이 없습니다"
          message="차량 판매 상담을 신청하면 여기에 표시됩니다."
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  consultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  consultText: {},
  consultDetail: {},
});

export default SellConsultationsTab;
