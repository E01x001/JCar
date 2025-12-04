/**
 * JCar Design System - ConsultationCard Component
 *
 * Displays consultation request information with dynamic status badges and action buttons.
 */

import React, { useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';
import { formatPhone } from '../utils/format';
import { AuthContext } from '../context/AuthContext';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import CompleteDealModal from './CompleteDealModal';
import { updateConsultationStatus } from '../services/firebaseService';

/**
 * ConsultationCard Component
 *
 * @param {Object} props
 * @param {Object} props.consultation - Consultation data
 * @param {Function} props.onPress - Handler for card press
 * @param {Function} [props.onStatusChange] - Callback after status change
 */
const ConsultationCard = ({ consultation, onPress, onStatusChange }) => {
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const [modalVisible, setModalVisible] = useState(false);

  /**
   * Get Badge status based on consultationStatus
   * Maps consultationStatus to Badge component status prop
   */
  const getBadgeStatus = (consultationStatus) => {
    switch (consultationStatus) {
      case 'pending':
        return 'pending'; // warning.main (yellow)
      case 'confirmed':
        return 'approved'; // success.main (green)
      case 'on-hold':
        return 'rejected'; // Use rejected for gray color
      case 'rejected':
        return 'rejected'; // danger.main (red)
      case 'completed':
        return 'completed'; // info.main (blue)
      default:
        return 'pending';
    }
  };

  /**
   * Get Badge label based on consultationStatus
   */
  const getStatusLabel = (consultationStatus) => {
    switch (consultationStatus) {
      case 'pending':
        return '대기중';
      case 'confirmed':
        return '채결';
      case 'on-hold':
        return '보류';
      case 'rejected':
        return '거절';
      case 'completed':
        return '거래완료';
      default:
        return consultationStatus;
    }
  };

  /**
   * Handle status update
   */
  const handleStatusUpdate = async (newStatus) => {
    try {
      const result = await updateConsultationStatus(
        consultation.id,
        newStatus,
        null,
        ''
      );

      if (result.success) {
        Alert.alert('완료', `상담 상태가 '${getStatusLabel(newStatus)}'로 변경되었습니다.`);
        if (onStatusChange) {
          onStatusChange(consultation.id, newStatus);
        }
      }
    } catch (error) {
      Alert.alert('오류', '상태 업데이트 중 문제가 발생했습니다.');
    }
  };

  /**
   * Render action buttons based on consultationStatus
   */
  const renderActionButtons = () => {
    const status = consultation.consultationStatus || consultation.status || 'pending';

    switch (status) {
      case 'pending':
        return (
          <View style={[styles.buttonRow, { marginTop: theme.spacing.md }]}>
            <Button
              variant="primary"
              title="채결"
              onPress={() => handleStatusUpdate('confirmed')}
              style={{ flex: 1, marginRight: theme.spacing.xs }}
            />
            <Button
              variant="secondary"
              title="보류"
              onPress={() => handleStatusUpdate('on-hold')}
              style={{ flex: 1, marginHorizontal: theme.spacing.xs }}
            />
            <Button
              variant="danger"
              title="거절"
              onPress={() => handleStatusUpdate('rejected')}
              style={{ flex: 1, marginLeft: theme.spacing.xs }}
            />
          </View>
        );

      case 'confirmed':
        return (
          <View style={{ marginTop: theme.spacing.md }}>
            <Button
              variant="primary"
              title="거래완료"
              onPress={() => setModalVisible(true)}
              style={{ marginBottom: theme.spacing.xs }}
            />
            <View style={styles.buttonRow}>
              <Button
                variant="secondary"
                title="보류"
                onPress={() => handleStatusUpdate('on-hold')}
                style={{ flex: 1, marginRight: theme.spacing.xs }}
              />
              <Button
                variant="danger"
                title="거절"
                onPress={() => handleStatusUpdate('rejected')}
                style={{ flex: 1, marginLeft: theme.spacing.xs }}
              />
            </View>
          </View>
        );

      case 'on-hold':
        return (
          <View style={[styles.buttonRow, { marginTop: theme.spacing.md }]}>
            <Button
              variant="primary"
              title="채결"
              onPress={() => handleStatusUpdate('confirmed')}
              style={{ flex: 1, marginRight: theme.spacing.xs }}
            />
            <Button
              variant="danger"
              title="거절"
              onPress={() => handleStatusUpdate('rejected')}
              style={{ flex: 1, marginLeft: theme.spacing.xs }}
            />
          </View>
        );

      case 'rejected':
        return (
          <View style={[styles.buttonRow, { marginTop: theme.spacing.md }]}>
            <Button
              variant="secondary"
              title="재검토"
              onPress={() => handleStatusUpdate('pending')}
              style={{ flex: 1 }}
            />
          </View>
        );

      default:
        return null;
    }
  };

  const status = consultation.consultationStatus || consultation.status || 'pending';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={{ marginBottom: theme.spacing.sm }}>
        {/* Header with Badge and User Name */}
        <View style={styles.header}>
          <Badge
            status={getBadgeStatus(status)}
            label={getStatusLabel(status)}
          />
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
            {consultation.userName}
          </Text>
        </View>

        {/* Consultation Information */}
        <View style={{ marginTop: theme.spacing.xs }}>
          <Text
            style={[
              styles.infoText,
              {
                fontSize: theme.typography.fontSize.bodySmall,
                color: theme.colors.text.secondary,
              },
            ]}
          >
            전화번호: {formatPhone(consultation.userPhone)}
          </Text>

          <Text
            style={[
              styles.infoText,
              {
                fontSize: theme.typography.fontSize.bodySmall,
                color: theme.colors.text.secondary,
                marginTop: theme.spacing.xxs,
              },
            ]}
          >
            차량명: {consultation.vehicleName}
          </Text>

          <Text
            style={[
              styles.infoText,
              {
                fontSize: theme.typography.fontSize.bodySmall,
                color: theme.colors.text.secondary,
                marginTop: theme.spacing.xxs,
              },
            ]}
          >
            상담 일정: {consultation.preferredDate} {consultation.preferredTime}
          </Text>

          {consultation.adminNotes && (
            <Text
              style={[
                styles.infoText,
                {
                  fontSize: theme.typography.fontSize.bodySmall,
                  color: theme.colors.text.tertiary,
                  marginTop: theme.spacing.xs,
                  fontStyle: 'italic',
                },
              ]}
            >
              메모: {consultation.adminNotes}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        {renderActionButtons()}
      </Card>

      {/* Complete Deal Modal */}
      <CompleteDealModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        consultation={consultation}
        adminId={user?.uid || ''}
        onComplete={() => {
          if (onStatusChange) {
            onStatusChange(consultation.id, 'completed');
          }
        }}
      />
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
});

ConsultationCard.propTypes = {
  consultation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    userName: PropTypes.string.isRequired,
    userPhone: PropTypes.string.isRequired,
    vehicleName: PropTypes.string.isRequired,
    preferredDate: PropTypes.string,
    preferredTime: PropTypes.string,
    consultationStatus: PropTypes.oneOf(['pending', 'confirmed', 'on-hold', 'rejected', 'completed']),
    status: PropTypes.string,
    type: PropTypes.string,
    adminNotes: PropTypes.string,
  }).isRequired,
  onPress: PropTypes.func.isRequired,
  onStatusChange: PropTypes.func,
};

export default ConsultationCard;
