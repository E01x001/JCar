/**
 * JCar Design System - CompleteDealModal Component
 *
 * Modal for completing a consultation deal with deal amount and admin notes.
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
 * CompleteDealModal Component
 *
 * @param {Object} props
 * @param {boolean} props.isVisible - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSubmit - Submit handler (dealAmount, adminNotes)
 * @param {string} [props.consultationId] - Consultation ID for reference
 */
const CompleteDealModal = ({ isVisible, onClose, onSubmit, consultationId }) => {
  const theme = useTheme();
  const [dealAmount, setDealAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isVisible) {
      setDealAmount('');
      setAdminNotes('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isVisible]);

  const validateForm = () => {
    // Check if dealAmount is provided
    if (!dealAmount.trim()) {
      setError('거래금액을 입력해주세요.');
      return false;
    }

    // Check if dealAmount is a valid positive number
    const amount = Number(dealAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('유효한 거래금액을 입력해주세요.');
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
      await onSubmit({
        dealAmount: Number(dealAmount),
        adminNotes: adminNotes.trim(),
      });
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
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleCancel}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <TouchableOpacity activeOpacity={1}>
            <Card
              style={[
                styles.modalCard,
                {
                  maxWidth: 400,
                  backgroundColor: theme.colors.background.paper,
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
                  거래 완료
                </Text>

                {/* Deal Amount Input */}
                <InputField
                  label="거래금액 (원) *"
                  value={dealAmount}
                  onChangeText={(text) => {
                    setDealAmount(text);
                    setError('');
                  }}
                  placeholder="예: 15000000"
                  keyboardType="numeric"
                  error={error}
                  style={{ marginBottom: theme.spacing.md }}
                  editable={!isSubmitting}
                />

                {/* Admin Notes Input */}
                <InputField
                  label="관리자 메모 (선택)"
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  placeholder="거래 관련 메모를 입력하세요"
                  multiline
                  numberOfLines={4}
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
                    variant="success"
                    title={isSubmitting ? '처리 중...' : '완료'}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    style={{ flex: 1, marginLeft: theme.spacing.sm }}
                  />
                </View>
              </ScrollView>
            </Card>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
  },
  title: {},
  buttonRow: {
    flexDirection: 'row',
  },
});

CompleteDealModal.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  consultationId: PropTypes.string,
};

export default CompleteDealModal;
