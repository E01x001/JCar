import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import Card from '../../../components/Card';
import Badge from '../../../components/Badge';
import StateScreen from '../../../components/StateScreen';

const BuyConsultationsTab = ({ consultations, onNavigateToConsultation }) => {
  const theme = useTheme();

  const buyConsultations = consultations.filter(c => c.type === 'buy' || !c.type);

  const getStatusBadge = (status) => {
    if (status === 'approved') {
      return <Badge status="completed" label="승인됨" />;
    } else if (status === 'rejected') {
      return <Badge status="rejected" label="거절됨" />;
    } else if (status === 'completed') {
      return <Badge status="completed" label="완료됨" />;
    } else if (status === 'cancelled') {
      return <Badge status="cancelled" label="취소됨" />;
    } else if (status === 'meeting') {
      return <Badge status="approved" label="상담중" />;
    }
    return <Badge status="pending" label="대기중" />;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => onNavigateToConsultation(item.id)}>
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

        {/* Show rejection reason preview if rejected */}
        {item.status === 'rejected' && item.rejectionReason && (
          <Text style={[styles.rejectionPreview, {
            fontSize: theme.typography.fontSize.bodySmall,
            color: theme.colors.status.rejected,
            marginTop: theme.spacing.xs,
          }]} numberOfLines={2}>
            거절 사유: {item.rejectionReason}
          </Text>
        )}

        {/* Show alternative slots preview if available */}
        {item.status === 'rejected' && item.alternativeSlots && item.alternativeSlots.length > 0 && (
          <Text style={[styles.alternativePreview, {
            fontSize: theme.typography.fontSize.bodySmall,
            color: theme.colors.text.tertiary,
            marginTop: theme.spacing.xs,
          }]}>
            대체 일정 {item.alternativeSlots.length}개 제안됨
          </Text>
        )}
      </Card>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={buyConsultations}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        padding: theme.spacing.md,
        flexGrow: 1,
      }}
      ListEmptyComponent={
        <StateScreen
          icon="shopping-cart"
          title="구매 상담 내역이 없습니다"
          message="차량 구매 상담을 신청하면 여기에 표시됩니다."
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
  rejectionPreview: {
    fontStyle: 'italic',
  },
  alternativePreview: {},
});

export default BuyConsultationsTab;
