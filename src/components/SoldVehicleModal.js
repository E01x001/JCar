/**
 * JCar Design System - SoldVehicleModal Component
 *
 * Modal for marking an admin-owned vehicle as sold with sold price input.
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
import { useTheme } from '../theme/ThemeProvider';
import Card from './Card';
import InputField from './InputField';
import Button from './Button';

/**
 * SoldVehicleModal Component
 *
 * @param {Object} props
 * @param {boolean} props.isVisible - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSubmit - Submit handler (soldPrice)
 * @param {string} [props.vehicleId] - Vehicle ID for reference
 */
const SoldVehicleModal = ({ isVisible, onClose, onSubmit, vehicleId }) => {
  const theme = useTheme();
  const [soldPrice, setSoldPrice] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isVisible) {
      setSoldPrice('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isVisible]);

  const validateForm = () => {
    // Check if soldPrice is provided
    if (!soldPrice.trim()) {
      setError('판매금액을 입력해주세요.');
      return false;
    }

    // Check if soldPrice is a valid positive number
    const amount = Number(soldPrice);
    if (isNaN(amount) || amount <= 0) {
      setError('유효한 판매금액을 입력해주세요.');
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
      await onSubmit(Number(soldPrice));
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
                  판매완료 처리
                </Text>

                <Text
                  style={[
                    styles.description,
                    {
                      fontSize: theme.typography.fontSize.body,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.lg,
                    },
                  ]}
                >
                  차량의 최종 판매금액을 입력해주세요.
                </Text>

                {/* Sold Price Input */}
                <InputField
                  label="판매금액 (원) *"
                  value={soldPrice}
                  onChangeText={(text) => {
                    setSoldPrice(text);
                    setError('');
                  }}
                  placeholder="예: 18000000"
                  keyboardType="numeric"
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
  description: {},
  buttonRow: {
    flexDirection: 'row',
  },
});

SoldVehicleModal.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  vehicleId: PropTypes.string,
};

export default SoldVehicleModal;
