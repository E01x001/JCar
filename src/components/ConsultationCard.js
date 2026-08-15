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
import { formatPhone } from '../utils/format';
import { updateConsultationStatus, completeConsultation, updateAdminMemo, updateSuggestedSlots } from '../services/consultation/consultationService';
import { useToast } from '../hooks/useToast';
import { CONSULTATION_STATUS } from '../constants';
import { AuthContext } from '../context/AuthContext';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
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
    alternativeSlots = [],
  } = consultation;

  // Task 61: Use optimistic status if available, otherwise use actual status
  const displayStatus = optimisticStatus || consultationStatus;

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

  // Render action buttons based on consultationStatus
  // Task 61: Use displayStatus to show optimistic UI updates
  const renderActionButtons = () => {
    // Show loading indicator if updating (during server transaction)
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

    if (displayStatus === CONSULTATION_STATUS.PENDING) {
      return (
        <View style={[styles.buttonRow, { marginTop: theme.spacing.md }]}>
          <Button
            variant="success"
            title="채결"
            onPress={handleCompleteButtonPress}
            disabled={isUpdating}
            style={{ flex: 1, marginRight: theme.spacing.xs }}
          />
          <Button
            variant="secondary"
            title="보류"
            onPress={() => handleStatusUpdate(CONSULTATION_STATUS.ON_HOLD)}
            disabled={isUpdating}
            style={{ flex: 1, marginHorizontal: theme.spacing.xs }}
          />
          <Button
            variant="danger"
            title="거절"
            onPress={handleRejectButtonPress}
            disabled={isUpdating}
            style={{ flex: 1, marginLeft: theme.spacing.xs }}
          />
        </View>
      );
    }

    if (displayStatus === CONSULTATION_STATUS.ON_HOLD) {
      return (
        <View style={[styles.buttonRow, { marginTop: theme.spacing.md }]}>
          <Button
            variant="success"
            title="채결"
            onPress={handleCompleteButtonPress}
            disabled={isUpdating}
            style={{ flex: 1, marginRight: theme.spacing.xs }}
          />
          <Button
            variant="danger"
            title="거절"
            onPress={handleRejectButtonPress}
            disabled={isUpdating}
            style={{ flex: 1, marginLeft: theme.spacing.xs }}
          />
        </View>
      );
    }

    // No buttons for 'confirmed', 'rejected', 'completed'
    // Task 61: When optimistic status is 'completed', hide action buttons immediately
    return null;
  };

  const handleCardPress = () => {
    if (onNavigateToVehicle && vehicleId) {
      onNavigateToVehicle(vehicleId);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleCardPress}
        activeOpacity={onNavigateToVehicle ? 0.7 : 1}
        disabled={!onNavigateToVehicle}
      >
        <Card elevated style={[{ marginBottom: theme.spacing.sm }, style]}>
          {/* Header: Badge + User Name + Memo Icon */}
          <View style={styles.header}>
            <Badge variant="chip" status={displayStatus} />
            <Text
              style={[
                styles.userName,
                {
                  fontSize: theme.typography.fontSize.body,
                  fontWeight: theme.typography.fontWeight.semiBold,
                  color: theme.colors.text.primary,
                  flex: 1,
                },
              ]}
            >
              {userName}
            </Text>
            {/* Admin Memo Icon Button */}
            <TouchableOpacity
              onPress={handleMemoButtonPress}
              disabled={isUpdating}
              activeOpacity={0.6}
              style={{
                padding: theme.spacing.xs,
                marginLeft: theme.spacing.sm,
              }}
            >
              <MaterialIcons
                name={adminMemo ? 'note' : 'note-add'}
                size={24}
                color={adminMemo ? theme.colors.primary.main : theme.colors.text.tertiary}
              />
            </TouchableOpacity>

            {/* Suggest Alternative Times Icon Button */}
            <TouchableOpacity
              onPress={handleSuggestTimesButtonPress}
              disabled={isUpdating}
              activeOpacity={0.6}
              style={{
                padding: theme.spacing.xs,
              }}
            >
              <MaterialIcons
                name={alternativeSlots.length > 0 ? 'schedule' : 'schedule-send'}
                size={24}
                color={alternativeSlots.length > 0 ? theme.colors.primary.main : theme.colors.text.tertiary}
              />
            </TouchableOpacity>
          </View>

          {/* Consultation Details */}
          <Text
            style={[
              styles.infoText,
              {
                fontSize: theme.typography.fontSize.bodySmall,
                color: theme.colors.text.secondary,
                marginTop: theme.spacing.xs,
              },
            ]}
          >
            전화번호: {formatPhone(userPhone)}
          </Text>

          <Text
            style={[
              styles.infoText,
              {
                fontSize: theme.typography.fontSize.bodySmall,
                color: theme.colors.text.secondary,
              },
            ]}
          >
            차량명: {vehicleName}
          </Text>

          <Text
            style={[
              styles.infoText,
              {
                fontSize: theme.typography.fontSize.bodySmall,
                color: theme.colors.text.secondary,
              },
            ]}
          >
            상담 일정: {preferredDate} {preferredTime}
          </Text>

          {/* Action Buttons */}
          {renderActionButtons()}
        </Card>
      </TouchableOpacity>

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
