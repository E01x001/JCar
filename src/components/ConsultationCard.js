/**
 * JCar Design System - ConsultationCard Component
 *
 * Reusable consultation request card with dynamic status and action buttons.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';
import { formatPhone } from '../utils/format';
import { updateConsultationStatus } from '../services/firebaseService';
import { useToast } from '../hooks/useToast';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';

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
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    id,
    consultationStatus,
    userName,
    userPhone,
    vehicleName,
    vehicleId,
    preferredDate,
    preferredTime,
  } = consultation;

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
      console.error('상태 업데이트 실패:', error);
      toast.showError('업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Render action buttons based on consultationStatus
  const renderActionButtons = () => {
    // Show loading indicator if updating
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

    if (consultationStatus === 'pending') {
      return (
        <View style={[styles.buttonRow, { marginTop: theme.spacing.md }]}>
          <Button
            variant="success"
            title="채결"
            onPress={() => handleStatusUpdate('completed')}
            disabled={isUpdating}
            style={{ flex: 1, marginRight: theme.spacing.xs }}
          />
          <Button
            variant="secondary"
            title="보류"
            onPress={() => handleStatusUpdate('on-hold')}
            disabled={isUpdating}
            style={{ flex: 1, marginHorizontal: theme.spacing.xs }}
          />
          <Button
            variant="danger"
            title="거절"
            onPress={() => handleStatusUpdate('rejected')}
            disabled={isUpdating}
            style={{ flex: 1, marginLeft: theme.spacing.xs }}
          />
        </View>
      );
    }

    if (consultationStatus === 'on-hold') {
      return (
        <View style={[styles.buttonRow, { marginTop: theme.spacing.md }]}>
          <Button
            variant="success"
            title="채결"
            onPress={() => handleStatusUpdate('completed')}
            disabled={isUpdating}
            style={{ flex: 1, marginRight: theme.spacing.xs }}
          />
          <Button
            variant="danger"
            title="거절"
            onPress={() => handleStatusUpdate('rejected')}
            disabled={isUpdating}
            style={{ flex: 1, marginLeft: theme.spacing.xs }}
          />
        </View>
      );
    }

    // No buttons for 'confirmed', 'rejected', 'completed'
    return null;
  };

  const handleCardPress = () => {
    if (onNavigateToVehicle && vehicleId) {
      onNavigateToVehicle(vehicleId);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleCardPress}
      activeOpacity={onNavigateToVehicle ? 0.7 : 1}
      disabled={!onNavigateToVehicle}
    >
      <Card style={[{ marginBottom: theme.spacing.sm }, style]}>
        {/* Header: Badge + User Name */}
        <View style={styles.header}>
          <Badge status={consultationStatus} />
          <Text
            style={[
              styles.userName,
              {
                fontSize: theme.typography.fontSize.body,
                fontWeight: theme.typography.fontWeight.semiBold,
                color: theme.colors.text.primary,
              },
            ]}
          >
            {userName}
          </Text>
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
  }).isRequired,
  onNavigateToVehicle: PropTypes.func,
  onUpdateSuccess: PropTypes.func,
  style: PropTypes.object,
};

export default ConsultationCard;
