import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import Card from '../../../components/Card';
import Badge from '../../../components/Badge';
import EmptyState from '../../../components/EmptyState';

const BuyConsultationsTab = ({ consultations, onNavigateToConsultation }) => {
  const theme = useTheme();

  // Filter buy consultations and exclude cancelled ones (user shouldn't see cancelled consultations)
  const buyConsultations = consultations.filter(c => {
    const isBuyType = c.type === 'buy' || !c.type;
    const isNotCancelled = c.consultationStatus !== 'cancelled';
    return isBuyType && isNotCancelled;
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
    <TouchableOpacity onPress={() => onNavigateToConsultation(item.id)} activeOpacity={0.8}>
      <Card elevated style={{ marginBottom: theme.spacing.sm }}>
        <View style={styles.consultRow}>
          <View style={[styles.thumb, { backgroundColor: theme.colors.background.tertiary }]} />
          <View style={styles.consultInfo}>
            <Text style={[styles.consultName, { color: theme.colors.text.primary }]} numberOfLines={1}>
              {item?.vehicleName ?? '차량명 없음'}
            </Text>
            <Text style={[styles.consultDate, { color: theme.colors.text.secondary }]} numberOfLines={1}>
              {[item?.preferredDate, item?.preferredTime].filter(Boolean).join(' · ') || '일정 미정'}
            </Text>
          </View>
          {getStatusBadge(item.consultationStatus)}
        </View>

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
      data={buyConsultations}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        padding: theme.spacing.md,
        flexGrow: 1,
      }}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="shopping-cart"
            title="아직 구매 상담 내역이 없어요"
            message={'마음에 드는 차량을 찾아\n상담을 신청해 보세요'}
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
  consultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  thumb: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  consultInfo: { flex: 1, minWidth: 0 },
  consultName: { fontSize: 15, fontWeight: '800' },
  consultDate: { fontSize: 12, marginTop: 3 },
  rejectionPreview: {
    fontStyle: 'italic',
  },
  alternativePreview: {},
});

export default BuyConsultationsTab;
