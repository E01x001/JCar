import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import Card from '../../../components/Card';
import Badge from '../../../components/Badge';
import EmptyState from '../../../components/EmptyState';

const SellConsultationsTab = ({ consultations, onNavigateToConsultation }) => {
  const theme = useTheme();

  // Filter sell consultations and exclude cancelled ones (user shouldn't see cancelled consultations)
  const sellConsultations = consultations.filter(c => {
    const isSellType = c.type === 'sell';
    const isNotCancelled = c.consultationStatus !== 'cancelled';
    return isSellType && isNotCancelled;
  });

  const getStatusBadge = (status) => {
    if (status === 'approved') {
      return <Badge variant="chip" status="approved" label="승인됨" />;
    } else if (status === 'rejected') {
      return <Badge variant="chip" status="rejected" label="거절됨" />;
    } else if (status === 'completed') {
      return <Badge variant="chip" status="completed" label="완료됨" />;
    } else if (status === 'cancelled') {
      return <Badge variant="chip" status="cancelled" label="취소됨" />;
    } else if (status === 'meeting') {
      return <Badge variant="chip" status="approved" label="상담중" />;
    }
    return <Badge variant="chip" status="pending" label="대기중" />;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => onNavigateToConsultation(item.id)}>
      <Card elevated style={{ marginBottom: theme.spacing.sm }}>
        <View style={styles.consultHeader}>
          <Text style={[styles.consultText, {
            fontSize: theme.typography.fontSize.body,
            fontWeight: theme.typography.fontWeight.semiBold,
            color: theme.colors.text.primary,
          }]}>{item?.vehicleName ?? '차량명 없음'}</Text>
          {getStatusBadge(item.consultationStatus)}
        </View>
        <Text style={[styles.consultDetail, {
          fontSize: theme.typography.fontSize.bodySmall,
          color: theme.colors.text.secondary,
          marginTop: theme.spacing.xs,
        }]}>일정: {item?.preferredDate ?? ''} {item?.preferredTime ?? ''}</Text>

        {/* Show rejection reason preview if rejected */}
        {item.consultationStatus === 'rejected' && item.rejectionReason && (
          <Text style={[styles.rejectionPreview, {
            fontSize: theme.typography.fontSize.bodySmall,
            color: theme.colors.status.rejected,
            marginTop: theme.spacing.xs,
          }]} numberOfLines={2}>
            거절 사유: {item.rejectionReason}
          </Text>
        )}

        {/* Show alternative slots preview if available */}
        {item.consultationStatus === 'rejected' && item.alternativeSlots && item.alternativeSlots.length > 0 && (
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
      data={sellConsultations}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        padding: theme.spacing.md,
        flexGrow: 1,
      }}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="sell"
            title="아직 판매 상담 내역이 없어요"
            message={'내 차량을 등록하고\n판매 상담을 받아보세요'}
          />
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
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

export default SellConsultationsTab;
