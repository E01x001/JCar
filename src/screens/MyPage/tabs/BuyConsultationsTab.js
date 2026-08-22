import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import Badge from '../../../components/Badge';
import EmptyState from '../../../components/EmptyState';
import MyPageListRow from '../../../components/MyPageListRow';

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

  const renderFooter = (item) => {
    const showRejection = item.consultationStatus === 'rejected' && item.rejectionReason;
    const showAlternatives = item.consultationStatus === 'rejected'
      && item.alternativeSlots && item.alternativeSlots.length > 0;
    if (!showRejection && !showAlternatives) { return null; }

    return (
      <>
        {/* Show rejection reason preview if rejected */}
        {showRejection && (
          <Text style={[styles.rejectionPreview, {
            fontSize: theme.typography.fontSize.bodySmall,
            color: theme.colors.status.rejected,
            marginTop: theme.spacing.xs,
          }]} numberOfLines={2}>
            거절 사유: {item.rejectionReason}
          </Text>
        )}

        {/* Show alternative slots preview if available */}
        {showAlternatives && (
          <Text style={[styles.alternativePreview, {
            fontSize: theme.typography.fontSize.bodySmall,
            color: theme.colors.text.tertiary,
            marginTop: theme.spacing.xs,
          }]}>
            대체 일정 {item.alternativeSlots.length}개 제안됨
          </Text>
        )}
      </>
    );
  };

  const renderItem = ({ item }) => (
    <MyPageListRow
      imageUrl={item.vehicleImageUrl}
      title={item?.vehicleName ?? '차량명 없음'}
      subtitle={[item?.preferredDate, item?.preferredTime].filter(Boolean).join(' · ') || '일정 미정'}
      right={getStatusBadge(item.consultationStatus)}
      footer={renderFooter(item)}
      onPress={() => onNavigateToConsultation(item.id)}
    />
  );

  return (
    <FlatList
      data={buyConsultations}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  rejectionPreview: {
    fontStyle: 'italic',
  },
  alternativePreview: {},
});

export default BuyConsultationsTab;
