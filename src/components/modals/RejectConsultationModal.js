/**
 * JCar Design System - RejectConsultationModal Component
 *
 * Modal for rejecting a consultation with a reason.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../../theme/ThemeProvider';
import Card from '../Card';
import InputField from '../InputField';
import Button from '../Button';

/**
 * RejectConsultationModal Component
 *
 * @param {Object} props
 * @param {boolean} props.isVisible - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSubmit - Submit handler (rejectionReason)
 * @param {string} [props.consultationId] - Consultation ID for reference
 */
const RejectConsultationModal = ({ isVisible, onClose, onSubmit, consultationId }) => {
  const theme = useTheme();
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isVisible) {
      setRejectionReason('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isVisible]);

  const validateForm = () => {
    // Check if rejection reason is provided
    if (!rejectionReason.trim()) {
      setError('거절 사유를 입력해주세요.');
      return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(rejectionReason.trim());
      // onSubmit should handle closing the modal
    } catch (err) {
      // Error handling is done by parent component
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.75)' }]}
          activeOpacity={1}
          onPress={handleCancel}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalContainer}>
            <Card
              style={[
                styles.modalCard,
                {
                  backgroundColor: theme.colors.background.paper,
                  borderRadius: theme.borderRadius.lg,
                },
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Header */}
                <Text
                  style={[
                    styles.title,
                    {
                      fontSize: theme.typography.fontSize.h3,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.text.primary,
                      marginBottom: theme.spacing.md,
                    },
                  ]}
                >
                  상담 거절
                </Text>

                {/* Rejection Reason Input */}
                <InputField
                  label="거절 사유 *"
                  value={rejectionReason}
                  onChangeText={(text) => {
                    setRejectionReason(text);
                    setError('');
                  }}
                  placeholder="거절 사유를 입력하세요"
                  multiline
                  numberOfLines={4}
                  error={error}
                  style={{ marginBottom: theme.spacing.lg }}
                  editable={!isSubmitting}
                />

                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                  <Button
                    variant="secondary"
                    title="취소"
                    onPress={handleCancel}
                    disabled={isSubmitting}
                    style={{ flex: 1, marginRight: theme.spacing.sm }}
                  />
                  <Button
                    variant="danger"
                    title={isSubmitting ? '처리 중...' : '거절'}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    style={{ flex: 1, marginLeft: theme.spacing.sm }}
                  />
                </View>
              </ScrollView>
            </Card>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalCard: {
    width: '100%',
  },
  title: {},
  buttonRow: {
    flexDirection: 'row',
  },
});

RejectConsultationModal.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  consultationId: PropTypes.string,
};

export default RejectConsultationModal;
