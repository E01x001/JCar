/**
 * JCar Design System - ConsultationCard Component
 *
 * Reusable consultation request card with dynamic status and action buttons.
 */

import React, { useState, useContext } from 'react';
import { logger } from '../utils/logger';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeProvider';
import { formatPhone, formatWaiting } from '../utils/format';
import { updateConsultationStatus, completeConsultation, updateAdminMemo, updateSuggestedSlots } from '../services/consultation/consultationService';
import { useToast } from '../hooks/useToast';
import { CONSULTATION_STATUS } from '../constants';
import { AuthContext } from '../context/AuthContext';
import SpineCard from './admin/SpineCard';
import CompleteDealModal from './modals/CompleteDealModal';
import RejectConsultationModal from './modals/RejectConsultationModal';
import AdminMemoModal from './modals/AdminMemoModal';
import SuggestAlternativeTimesModal from './modals/SuggestAlternativeTimesModal';

/**
 * ConsultationCard Component
 *
 * @param {Object} props
 * @param {Object} props.consultation - Consultation request data
 * @param {string} props.consultation.id - Consultation ID
 * @param {string} props.consultation.consultationStatus - Status: 'pending' | 'confirmed' | 'on-hold' | 'rejected' | 'completed'
 * @param {string} props.consultation.userName - Customer name
 * @param {string} props.consultation.userPhone - Customer phone number
 * @param {string} props.consultation.vehicleName - Vehicle name
 * @param {string} props.consultation.vehicleId - Vehicle ID
 * @param {string} props.consultation.preferredDate - Preferred consultation date
 * @param {string} props.consultation.preferredTime - Preferred consultation time
 * @param {Function} [props.onNavigateToVehicle] - Navigate to vehicle detail
 * @param {Function} [props.onUpdateSuccess] - Callback after successful status update
 * @param {Object} [props.style] - Additional styles
 */
const ConsultationCard = ({
  consultation,
  onNavigateToVehicle,
  onUpdateSuccess,
  style,
}) => {
  const theme = useTheme();
  const toast = useToast();
  const { user } = useContext(AuthContext);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [isMemoModalVisible, setIsMemoModalVisible] = useState(false);
  const [isSuggestTimesModalVisible, setIsSuggestTimesModalVisible] = useState(false);

  // Task 61: Optimistic UI state
  const [optimisticStatus, setOptimisticStatus] = useState(null);
  const [originalConsultation, setOriginalConsultation] = useState(null);

  const {
    id,
    consultationStatus,
    userName,
    userPhone,
    vehicleName,
    vehicleId,
    preferredDate,
    preferredTime,
    type,
    adminMemo = '',
    createdAt,
  } = consultation;

  // null 방어: 매퍼가 정규화하지만, 매퍼를 거치지 않고 들어오는 경로도 있다.
  // 구조분해 기본값은 undefined에만 적용돼 null을 막지 못한다.
  const alternativeSlots = Array.isArray(consultation.alternativeSlots)
    ? consultation.alternativeSlots
    : [];

  // Task 61: Use optimistic status if available, otherwise use actual status
  const displayStatus = optimisticStatus || consultationStatus;

  // 접수 후 경과 — 하루 미만이면 null이라 아무것도 그리지 않는다
  const waiting = formatWaiting(createdAt);

  const STATUS_LABEL = {
    pending: '대기중',
    'on-hold': '보류',
    approved: '승인됨',
    confirmed: '승인됨',
    meeting: '상담중',
    rejected: '거절됨',
    completed: '완료',
    archived: '보관됨',
    cancelled: '취소됨',
  };
  const CHIP_FOR = {
    pending: 'pending',
    'on-hold': 'pending',
    approved: 'approved',
    confirmed: 'approved',
    meeting: 'approved',
    rejected: 'rejected',
    completed: 'completed',
  };
  const statusLabel = STATUS_LABEL[displayStatus] || displayStatus;
  const statusTone = theme.colors.statusChip[CHIP_FOR[displayStatus] || 'neutral'].fg;

  /**
   * Handle status update with loading state and error handling
   * @param {string} newStatus - New consultation status
   */
  const handleStatusUpdate = async (newStatus) => {
    setIsUpdating(true);
    try {
      await updateConsultationStatus(id, newStatus);
      toast.showSuccess('상태가 성공적으로 변경되었습니다.');

      // Notify parent to refresh data
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch (error) {
      logger.error('상태 업데이트 실패:', error);
      toast.showError('업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle complete deal button - opens modal
   */
  const handleCompleteButtonPress = () => {
    setIsModalVisible(true);
  };

  /**
   * Handle complete deal submission from modal
   * Task 61: Implements optimistic UI with rollback on failure
   * @param {Object} formData - { dealAmount, adminNotes, addToOwnedVehicles, transferOwnership }
   */
  const handleCompleteDeal = async (formData) => {
    // Task 61: Save original state for potential rollback
    setOriginalConsultation(consultation);

    // Task 61: Optimistic UI update - immediately show 'completed' status
    setOptimisticStatus(CONSULTATION_STATUS.COMPLETED);
    setIsModalVisible(false);

    // Show optimistic success feedback
    toast.showInfo('거래를 처리하는 중입니다...');

    setIsUpdating(true);
    try {
      await completeConsultation({
        docId: id,
        dealAmount: formData.dealAmount,
        adminNotes: formData.adminNotes,
        completedBy: user?.uid || null,
        isSell: formData.addToOwnedVehicles, // Use transaction for sell-type with checkbox checked
      });

      // Task 61: Server confirmation successful - clear optimistic state
      setOptimisticStatus(null);
      setOriginalConsultation(null);
      toast.showSuccess('거래가 완료되었습니다.');

      // Notify parent to refresh data
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch (error) {
      // Task 61: Rollback optimistic UI update on failure
      logger.error('거래완료 처리 실패:', error);
      setOptimisticStatus(null);
      setOriginalConsultation(null);

      toast.showError('거래완료 처리 중 오류가 발생했습니다. 다시 시도해주세요.');

      // Refresh data from server to ensure consistency
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }

      throw error; // Re-throw for modal to handle
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle reject button - opens rejection modal
   */
  const handleRejectButtonPress = () => {
    setIsRejectModalVisible(true);
  };

  /**
   * Handle rejection submission from modal
   * @param {string} rejectionReason - Reason for rejection
   */
  const handleRejectConsultation = async (rejectionReason) => {
    setIsUpdating(true);
    try {
      await updateConsultationStatus(id, CONSULTATION_STATUS.REJECTED, null, '', rejectionReason);
      toast.showSuccess('상담이 거절되었습니다.');
      setIsRejectModalVisible(false);

      // Notify parent to refresh data
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch (error) {
      logger.error('상담 거절 처리 실패:', error);
      toast.showError('거절 처리 중 오류가 발생했습니다.');
      throw error; // Re-throw for modal to handle
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle memo button - opens admin memo modal
   */
  const handleMemoButtonPress = () => {
    setIsMemoModalVisible(true);
  };

  /**
   * Handle admin memo submission from modal
   * @param {string} memo - Admin memo content
   */
  const handleUpdateMemo = async (memo) => {
    setIsUpdating(true);
    try {
      await updateAdminMemo(id, memo);
      toast.showSuccess('메모가 저장되었습니다.');
      setIsMemoModalVisible(false);

      // Notify parent to refresh data
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch (error) {
      logger.error('메모 저장 실패:', error);
      toast.showError('메모 저장 중 오류가 발생했습니다.');
      throw error; // Re-throw for modal to handle
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle suggest times button - opens alternative times modal
   */
  const handleSuggestTimesButtonPress = () => {
    setIsSuggestTimesModalVisible(true);
  };

  /**
   * Handle suggested slots submission from modal
   * @param {Array<Date>} slots - Array of suggested time slots
   */
  const handleUpdateSuggestedSlots = async (slots) => {
    setIsUpdating(true);
    try {
      await updateSuggestedSlots(id, slots);
      toast.showSuccess('대체 시간이 저장되었습니다.');
      setIsSuggestTimesModalVisible(false);

      // Notify parent to refresh data
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch (error) {
      logger.error('대체 시간 저장 실패:', error);
      toast.showError('대체 시간 저장 중 오류가 발생했습니다.');
      throw error; // Re-throw for modal to handle
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * 액션 — 주 동작 하나만 채우고 나머지는 아이콘으로 뺀다.
   *
   * 예전에는 채결·보류·거절 셋이 flex:1에 좌우 margin까지 붙어 같은 무게로
   * 나란히 있었다. 폭 계산이 어긋나 카드 밖으로 넘쳤고("거절"이 잘렸다),
   * 무엇을 눌러야 하는지도 알 수 없었다. gap 기반 배치로 바꾸고 위계를 준다.
   */
  const renderActionButtons = () => {
    if (isUpdating) {
      return (
        <View style={[styles.loadingContainer, { marginTop: theme.spacing.md }]}>
          <ActivityIndicator size="small" color={theme.colors.primary.main} />
          <Text
            style={[
              styles.loadingText,
              {
                color: theme.colors.text.secondary,
                fontSize: theme.typography.fontSize.bodySmall,
                marginLeft: theme.spacing.sm,
              },
            ]}
          >
            업데이트 중...
          </Text>
        </View>
      );
    }

    const isPending = displayStatus === CONSULTATION_STATUS.PENDING;
    const isOnHold = displayStatus === CONSULTATION_STATUS.ON_HOLD;
    if (!isPending && !isOnHold) { return null; }

    return (
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={handleCompleteButtonPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="채결"
          style={[styles.primaryAction, { backgroundColor: theme.colors.primary.main }]}
        >
          <Text style={[styles.primaryActionText, { color: theme.colors.text.white }]}>채결</Text>
        </TouchableOpacity>

        {/* 보류는 pending에서만 의미가 있다 — 이미 보류 중이면 숨긴다 */}
        {isPending ? (
          <TouchableOpacity
            onPress={() => handleStatusUpdate(CONSULTATION_STATUS.ON_HOLD)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="보류"
            style={[styles.iconAction, { borderColor: theme.colors.border.subtle }]}
          >
            <MaterialIcons name="schedule" size={19} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          onPress={handleMemoButtonPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={adminMemo ? '관리자 메모 보기' : '관리자 메모 추가'}
          style={[styles.iconAction, { borderColor: theme.colors.border.subtle }]}
        >
          <MaterialIcons
            name={adminMemo ? 'note' : 'note-add'}
            size={19}
            color={adminMemo ? theme.colors.primary.main : theme.colors.text.secondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSuggestTimesButtonPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="대체 일정 제안"
          style={[styles.iconAction, { borderColor: theme.colors.border.subtle }]}
        >
          <MaterialIcons
            name="event-repeat"
            size={19}
            color={alternativeSlots.length > 0 ? theme.colors.primary.main : theme.colors.text.secondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRejectButtonPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="거절"
          style={[styles.iconAction, { backgroundColor: theme.colors.statusChip.rejected.bg }]}
        >
          <MaterialIcons name="close" size={19} color={theme.colors.danger.main} />
        </TouchableOpacity>
      </View>
    );
  };

  const handleCardPress = () => {
    if (onNavigateToVehicle && vehicleId) {
      onNavigateToVehicle(vehicleId);
    }
  };

  return (
    <>
      <SpineCard
        status={displayStatus}
        onPress={onNavigateToVehicle && vehicleId ? handleCardPress : undefined}
        style={[{ marginBottom: theme.spacing.sm }, style]}
      >
        {/* 이름 · 유형 · 차량 / 오른쪽에 일정과 대기 기간 */}
        <View style={styles.topRow}>
          <View style={styles.identity}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.userName, { color: theme.colors.text.primary }]}
                numberOfLines={1}
              >
                {userName}
              </Text>
              {type ? (
                <View style={[styles.typeTag, { backgroundColor: theme.colors.tag.neutral.bg }]}>
                  <Text style={[styles.typeTagText, { color: theme.colors.tag.neutral.fg }]}>
                    {type === 'sell' ? '판매' : '구매'}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.vehicleName, { color: theme.colors.text.secondary }]} numberOfLines={1}>
              {vehicleName}
            </Text>
          </View>

          <View style={styles.meta}>
            <Text style={[styles.schedule, { color: theme.colors.text.primary }]}>
              {preferredDate} {preferredTime}
            </Text>
            {/* 대기 기간이 있으면 그것을, 없으면 상태를 말한다.
                "무엇이 급한가"가 목록을 훑는 유일한 이유다. */}
            {waiting && displayStatus === CONSULTATION_STATUS.PENDING ? (
              <Text style={[styles.waiting, { color: theme.colors.statusChip.pending.fg }]}>
                {waiting}
              </Text>
            ) : (
              <Text style={[styles.waiting, { color: statusTone }]}>{statusLabel}</Text>
            )}
          </View>
        </View>

        <Text style={[styles.phone, { color: theme.colors.text.secondary }]}>
          {formatPhone(userPhone)}
        </Text>

        {renderActionButtons()}
      </SpineCard>

      {/* Complete Deal Modal */}
      <CompleteDealModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleCompleteDeal}
        consultationId={id}
        isSellType={type === 'sell'}
      />

      {/* Reject Consultation Modal */}
      <RejectConsultationModal
        isVisible={isRejectModalVisible}
        onClose={() => setIsRejectModalVisible(false)}
        onSubmit={handleRejectConsultation}
        consultationId={id}
      />

      {/* Admin Memo Modal */}
      <AdminMemoModal
        isVisible={isMemoModalVisible}
        onClose={() => setIsMemoModalVisible(false)}
        onSubmit={handleUpdateMemo}
        initialMemo={adminMemo}
        consultationId={id}
      />

      {/* Suggest Alternative Times Modal */}
      <SuggestAlternativeTimesModal
        isVisible={isSuggestTimesModalVisible}
        onClose={() => setIsSuggestTimesModalVisible(false)}
        onSubmit={handleUpdateSuggestedSlots}
        initialSlots={alternativeSlots}
        consultationId={id}
      />
    </>
  );
};

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  identity: { flex: 1, minWidth: 0, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  typeTag: { borderRadius: 5, paddingVertical: 2, paddingHorizontal: 6 },
  typeTagText: { fontSize: 11, fontWeight: '600' },
  vehicleName: { fontSize: 13 },
  meta: { alignItems: 'flex-end', gap: 3 },
  schedule: { fontSize: 14, fontWeight: '700' },
  waiting: { fontSize: 11, fontWeight: '600' },
  phone: { fontSize: 13, marginTop: 10 },

  // 액션 — margin이 아니라 gap으로 띄운다. margin은 flex:1과 합쳐지면
  // 폭 계산이 어긋나 카드 밖으로 넘친다(예전 버그).
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  primaryAction: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: { fontSize: 14, fontWeight: '600' },
  iconAction: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {},
});

ConsultationCard.propTypes = {
  consultation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    consultationStatus: PropTypes.oneOf(['pending', 'confirmed', 'on-hold', 'rejected', 'completed']).isRequired,
    userName: PropTypes.string.isRequired,
    userPhone: PropTypes.string.isRequired,
    vehicleName: PropTypes.string.isRequired,
    vehicleId: PropTypes.string.isRequired,
    preferredDate: PropTypes.string.isRequired,
    preferredTime: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['buy', 'sell']),
  }).isRequired,
  onNavigateToVehicle: PropTypes.func,
  onUpdateSuccess: PropTypes.func,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default ConsultationCard;
