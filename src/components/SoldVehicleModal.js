/**
 * JCar Design System - SoldVehicleModal Component
 *
 * Modal for marking an admin-owned vehicle as sold with sold price.
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
import { updateAdminOwnedVehicle } from '../services/firebaseService';
import firestore from '@react-native-firebase/firestore';

/**
 * SoldVehicleModal Component
 *
 * @param {Object} props
 * @param {boolean} props.visible - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.vehicle - Vehicle data
 * @param {Function} [props.onComplete] - Callback after successful completion
 */
const SoldVehicleModal = ({ visible, onClose, vehicle, onComplete }) => {
  const theme = useTheme();
  const [soldPrice, setSoldPrice] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Reset form
   */
  const resetForm = () => {
    setSoldPrice('');
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
    if (!soldPrice || soldPrice.trim() === '') {
      Alert.alert('입력 오류', '판매 금액을 입력해주세요.');
      return false;
    }

    const price = parseInt(soldPrice.replace(/[^0-9]/g, ''), 10);
    if (isNaN(price) || price <= 0) {
      Alert.alert('입력 오류', '올바른 판매 금액을 입력해주세요.');
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
      const price = parseInt(soldPrice.replace(/[^0-9]/g, ''), 10);

      const result = await updateAdminOwnedVehicle(vehicle.id, {
        status: 'sold',
        soldPrice: price,
        soldDate: firestore.FieldValue.serverTimestamp(),
      });

      if (result.success) {
        Alert.alert('완료', '차량이 판매 완료 처리되었습니다.');
        resetForm();
        if (onComplete) {
          onComplete();
        }
        onClose();
      }
    } catch (error) {
      console.error('판매완료 처리 오류:', error);
      Alert.alert('오류', '판매완료 처리 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format currency input
   */
  const handlePriceChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setSoldPrice(cleaned);
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
                판매완료 처리
              </Text>

              {/* Vehicle Info */}
              <View style={{ marginBottom: theme.spacing.md }}>
                <Text
                  style={{
                    fontSize: theme.typography.fontSize.body,
                    color: theme.colors.text.secondary,
                  }}
                >
                  차량명: {vehicle?.vehicleName}
                </Text>
                <Text
                  style={{
                    fontSize: theme.typography.fontSize.body,
                    color: theme.colors.text.secondary,
                    marginTop: theme.spacing.xxs,
                  }}
                >
                  구매 금액: {formatDisplayAmount(vehicle?.purchasePrice?.toString())}원
                </Text>
              </View>

              {/* Sold Price Input */}
              <View style={{ marginBottom: theme.spacing.md }}>
                <Text
                  style={{
                    fontSize: theme.typography.fontSize.body,
                    fontWeight: theme.typography.fontWeight.semiBold,
                    color: theme.colors.text.primary,
                    marginBottom: theme.spacing.xs,
                  }}
                >
                  판매 금액 (필수) *
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
                  placeholder="예: 28000000"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={formatDisplayAmount(soldPrice)}
                  onChangeText={handlePriceChange}
                  keyboardType="numeric"
                  editable={!loading}
                />
                {soldPrice && (
                  <Text
                    style={{
                      fontSize: theme.typography.fontSize.bodySmall,
                      color: theme.colors.text.secondary,
                      marginTop: theme.spacing.xs,
                    }}
                  >
                    {formatDisplayAmount(soldPrice)}원
                  </Text>
                )}
              </View>

              {/* Profit Display */}
              {soldPrice && vehicle?.purchasePrice && (
                <View
                  style={{
                    marginBottom: theme.spacing.md,
                    padding: theme.spacing.sm,
                    backgroundColor: theme.colors.background.secondary,
                    borderRadius: theme.borderRadius.md,
                  }}
                >
                  <Text
                    style={{
                      fontSize: theme.typography.fontSize.bodySmall,
                      color: theme.colors.text.secondary,
                    }}
                  >
                    수익:
                  </Text>
                  <Text
                    style={{
                      fontSize: theme.typography.fontSize.h4,
                      fontWeight: theme.typography.fontWeight.bold,
                      color:
                        parseInt(soldPrice) - vehicle.purchasePrice >= 0
                          ? theme.colors.success.main
                          : theme.colors.danger.main,
                      marginTop: theme.spacing.xxs,
                    }}
                  >
                    {formatDisplayAmount(
                      (parseInt(soldPrice || 0) - vehicle.purchasePrice).toString()
                    )}
                    원
                  </Text>
                </View>
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
  buttonRow: {
    flexDirection: 'row',
  },
});

SoldVehicleModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  vehicle: PropTypes.shape({
    id: PropTypes.string.isRequired,
    vehicleName: PropTypes.string.isRequired,
    purchasePrice: PropTypes.number,
  }).isRequired,
  onComplete: PropTypes.func,
};

export default SoldVehicleModal;
