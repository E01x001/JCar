/**
 * JCar Design System - CompleteDealModal Component
 *
 * Modal for completing consultation deals with deal amount and admin notes.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';
import Card from './Card';
import Button from './Button';
import { completeConsultationDeal } from '../services/firebaseService';

/**
 * CompleteDealModal Component
 *
 * @param {Object} props
 * @param {boolean} props.visible - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.consultation - Consultation data
 * @param {string} props.adminId - Admin user ID
 * @param {Function} [props.onComplete] - Callback after successful completion
 */
const CompleteDealModal = ({ visible, onClose, consultation, adminId, onComplete }) => {
  const theme = useTheme();
  const [dealAmount, setDealAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [addToOwnedVehicles, setAddToOwnedVehicles] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSellConsultation = consultation?.type === 'sell';

  /**
   * Reset form
   */
  const resetForm = () => {
    setDealAmount('');
    setAdminNotes('');
    setAddToOwnedVehicles(false);
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  /**
   * Validate form
   */
  const validateForm = () => {
    if (!dealAmount || dealAmount.trim() === '') {
      Alert.alert('입력 오류', '거래 금액을 입력해주세요.');
      return false;
    }

    const amount = parseInt(dealAmount.replace(/[^0-9]/g, ''), 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('입력 오류', '올바른 거래 금액을 입력해주세요.');
      return false;
    }

    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const amount = parseInt(dealAmount.replace(/[^0-9]/g, ''), 10);

      const result = await completeConsultationDeal({
        consultationId: consultation.id,
        dealAmount: amount,
        adminId: adminId,
        adminNotes: adminNotes.trim(),
        shouldAddToOwnedVehicles: isSellConsultation && addToOwnedVehicles,
        vehicleData: isSellConsultation && addToOwnedVehicles ? {
          // Additional vehicle data can be passed here if needed
        } : null,
      });

      if (result.success) {
        resetForm();
        if (onComplete) {
          onComplete();
        }
        onClose();
      }
    } catch (error) {
      console.error('거래완료 처리 오류:', error);
      Alert.alert('오류', '거래완료 처리 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format currency input
   */
  const handleAmountChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setDealAmount(cleaned);
  };

  /**
   * Format display amount
   */
  const formatDisplayAmount = (value) => {
    if (!value) {return '';}
    return parseInt(value, 10).toLocaleString('ko-KR');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={[styles.modalContainer, { maxHeight: '80%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Card style={{ margin: 0 }}>
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
                거래완료 처리
              </Text>

              {/* Consultation Info */}
              <View style={{ marginBottom: theme.spacing.md }}>
                <Text
                  style={{
                    fontSize: theme.typography.fontSize.body,
                    color: theme.colors.text.secondary,
                  }}
                >
                  차량명: {consultation?.vehicleName}
                </Text>
                <Text
                  style={{
                    fontSize: theme.typography.fontSize.body,
                    color: theme.colors.text.secondary,
                    marginTop: theme.spacing.xxs,
                  }}
                >
                  고객명: {consultation?.userName}
                </Text>
              </View>

              {/* Deal Amount Input */}
              <View style={{ marginBottom: theme.spacing.md }}>
                <Text
                  style={{
                    fontSize: theme.typography.fontSize.body,
                    fontWeight: theme.typography.fontWeight.semiBold,
                    color: theme.colors.text.primary,
                    marginBottom: theme.spacing.xs,
                  }}
                >
                  거래 금액 (필수) *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.background.secondary,
                      borderColor: theme.colors.border.light,
                      borderRadius: theme.borderRadius.md,
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: theme.spacing.sm,
                      fontSize: theme.typography.fontSize.body,
                      color: theme.colors.text.primary,
                    },
                  ]}
                  placeholder="예: 25000000"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={formatDisplayAmount(dealAmount)}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                  editable={!loading}
                />
                {dealAmount && (
                  <Text
                    style={{
                      fontSize: theme.typography.fontSize.bodySmall,
                      color: theme.colors.text.secondary,
                      marginTop: theme.spacing.xs,
                    }}
                  >
                    {formatDisplayAmount(dealAmount)}원
                  </Text>
                )}
              </View>

              {/* Admin Notes Input */}
              <View style={{ marginBottom: theme.spacing.md }}>
                <Text
                  style={{
                    fontSize: theme.typography.fontSize.body,
                    fontWeight: theme.typography.fontWeight.semiBold,
                    color: theme.colors.text.primary,
                    marginBottom: theme.spacing.xs,
                  }}
                >
                  관리자 메모 (선택)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    {
                      backgroundColor: theme.colors.background.secondary,
                      borderColor: theme.colors.border.light,
                      borderRadius: theme.borderRadius.md,
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: theme.spacing.sm,
                      fontSize: theme.typography.fontSize.body,
                      color: theme.colors.text.primary,
                      minHeight: 80,
                    },
                  ]}
                  placeholder="거래 관련 메모를 입력하세요"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>

              {/* Checkbox for Sell Consultation */}
              {isSellConsultation && (
                <TouchableOpacity
                  style={[
                    styles.checkboxContainer,
                    {
                      marginBottom: theme.spacing.md,
                      padding: theme.spacing.sm,
                      backgroundColor: theme.colors.background.secondary,
                      borderRadius: theme.borderRadius.md,
                    },
                  ]}
                  onPress={() => !loading && setAddToOwnedVehicles(!addToOwnedVehicles)}
                  disabled={loading}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        width: 20,
                        height: 20,
                        borderWidth: 2,
                        borderColor: addToOwnedVehicles
                          ? theme.colors.primary.main
                          : theme.colors.border.main,
                        backgroundColor: addToOwnedVehicles
                          ? theme.colors.primary.main
                          : 'transparent',
                        borderRadius: 4,
                        marginRight: theme.spacing.sm,
                      },
                    ]}
                  >
                    {addToOwnedVehicles && (
                      <Text style={{ color: theme.colors.text.white, fontSize: 14 }}>✓</Text>
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: theme.typography.fontSize.body,
                      color: theme.colors.text.primary,
                      flex: 1,
                    }}
                  >
                    이 차량을 관리자 소유 차량으로 등록
                  </Text>
                </TouchableOpacity>
              )}

              {/* Action Buttons */}
              <View style={[styles.buttonRow, { marginTop: theme.spacing.sm }]}>
                <Button
                  variant="secondary"
                  title="취소"
                  onPress={handleClose}
                  disabled={loading}
                  style={{ flex: 1, marginRight: theme.spacing.xs }}
                />
                <Button
                  variant="primary"
                  title={loading ? '처리 중...' : '확인'}
                  onPress={handleSubmit}
                  disabled={loading}
                  style={{ flex: 1, marginLeft: theme.spacing.xs }}
                />
              </View>
            </Card>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
  },
  title: {},
  input: {
    borderWidth: 1,
  },
  textArea: {},
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
  },
});

CompleteDealModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  consultation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    vehicleName: PropTypes.string.isRequired,
    userName: PropTypes.string.isRequired,
    type: PropTypes.string,
  }).isRequired,
  adminId: PropTypes.string.isRequired,
  onComplete: PropTypes.func,
};

export default CompleteDealModal;
