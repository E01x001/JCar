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
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import analytics from '@react-native-firebase/analytics';
import { useTheme } from '../../theme/ThemeProvider';
import Card from '../Card';
import InputField from '../InputField';
import Button from '../Button';
import OwnershipTransferConfirmModal from './OwnershipTransferConfirmModal';

/**
 * CompleteDealModal Component
 *
 * @param {Object} props
 * @param {boolean} props.isVisible - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSubmit - Submit handler (dealAmount, adminNotes, addToOwnedVehicles, transferOwnership)
 * @param {string} [props.consultationId] - Consultation ID for reference
 * @param {string} [props.vehicleId] - Vehicle ID for ownership transfer
 * @param {string} [props.sellerId] - Seller ID for ownership transfer validation
 * @param {string} [props.buyerId] - Buyer ID for ownership transfer (buy consultations)
 * @param {boolean} [props.isSellType] - Whether this is a sell-type consultation
 */
const CompleteDealModal = ({
  isVisible,
  onClose,
  onSubmit,
  consultationId,
  vehicleId,
  sellerId,
  buyerId,
  isSellType = false,
  vehicleDetails,
  sellerDetails,
  buyerDetails,
}) => {
  const theme = useTheme();
  const [dealAmount, setDealAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [addToOwnedVehicles, setAddToOwnedVehicles] = useState(false);
  const [transferOwnership, setTransferOwnership] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ownership Transfer Confirmation Modal states
  const [showOwnershipConfirmModal, setShowOwnershipConfirmModal] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [transferError, setTransferError] = useState(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isVisible) {
      setDealAmount('');
      setAdminNotes('');
      setAddToOwnedVehicles(false);
      setTransferOwnership(false);
      setError('');
      setIsSubmitting(false);
      setShowOwnershipConfirmModal(false);
      setTransferLoading(false);
      setTransferSuccess(false);
      setTransferError(null);
    } else {
      // Task 60: Log Analytics event when modal opens
      analytics().logEvent('complete_deal_modal_opened', {
        consultation_id: consultationId,
        vehicle_id: vehicleId,
        is_sell_type: isSellType,
      });
    }
  }, [isVisible, consultationId, vehicleId, isSellType]);

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
      // Task 60: Log validation failure
      analytics().logEvent('complete_deal_validation_failed', {
        consultation_id: consultationId,
        vehicle_id: vehicleId,
        error: error,
      });
      return;
    }

    // If ownership transfer is requested, show confirmation modal
    if (transferOwnership) {
      // Task 60: Log ownership transfer initiation
      analytics().logEvent('ownership_transfer_modal_opened', {
        consultation_id: consultationId,
        vehicle_id: vehicleId,
        is_sell_type: isSellType,
        deal_amount: Number(dealAmount),
      });
      setShowOwnershipConfirmModal(true);
    } else {
      // Proceed with normal submission (no ownership transfer)
      setIsSubmitting(true);
      try {
        // Task 60: Log deal completion attempt
        analytics().logEvent('complete_deal_submitted', {
          consultation_id: consultationId,
          vehicle_id: vehicleId,
          is_sell_type: isSellType,
          deal_amount: Number(dealAmount),
          add_to_owned_vehicles: addToOwnedVehicles,
          transfer_ownership: false,
        });

        await onSubmit({
          dealAmount: Number(dealAmount),
          adminNotes: adminNotes.trim(),
          addToOwnedVehicles: addToOwnedVehicles,
          transferOwnership: false,
          vehicleId,
          sellerId,
          buyerId,
          consultationId,
        });
        // onSubmit should handle closing the modal
      } catch (err) {
        // Task 60: Log submission error
        analytics().logEvent('complete_deal_submission_failed', {
          consultation_id: consultationId,
          vehicle_id: vehicleId,
          error_message: err.message,
        });
        // Error handling is done by parent component
        setIsSubmitting(false);
      }
    }
  };

  const handleOwnershipTransferConfirm = async () => {
    setTransferLoading(true);
    setTransferError(null);

    try {
      // Task 60: Log ownership transfer confirmation
      analytics().logEvent('ownership_transfer_confirmed', {
        consultation_id: consultationId,
        vehicle_id: vehicleId,
        is_sell_type: isSellType,
        deal_amount: Number(dealAmount),
      });

      await onSubmit({
        dealAmount: Number(dealAmount),
        adminNotes: adminNotes.trim(),
        addToOwnedVehicles: addToOwnedVehicles,
        transferOwnership: true,
        vehicleId,
        sellerId,
        buyerId,
        consultationId,
      });

      // Task 60: Log ownership transfer success
      analytics().logEvent('ownership_transfer_success', {
        consultation_id: consultationId,
        vehicle_id: vehicleId,
        is_sell_type: isSellType,
        deal_amount: Number(dealAmount),
      });

      // Show success state
      setTransferSuccess(true);

      // Close confirmation modal after 2 seconds
      setTimeout(() => {
        setShowOwnershipConfirmModal(false);
        setTransferSuccess(false);
        // onSubmit should handle closing the main modal
      }, 2000);
    } catch (err) {
      // Task 60: Log ownership transfer failure
      analytics().logEvent('ownership_transfer_failed_ui', {
        consultation_id: consultationId,
        vehicle_id: vehicleId,
        is_sell_type: isSellType,
        error_message: err.message,
      });

      setTransferError(err.message || '소유권 이전 중 오류가 발생했습니다.');
      setTransferLoading(false);
    }
  };

  const handleOwnershipTransferCancel = () => {
    // Task 60: Log ownership transfer cancellation
    analytics().logEvent('ownership_transfer_cancelled', {
      consultation_id: consultationId,
      vehicle_id: vehicleId,
      is_sell_type: isSellType,
    });

    setShowOwnershipConfirmModal(false);
    setTransferError(null);
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      // Task 60: Log modal cancellation
      analytics().logEvent('complete_deal_modal_cancelled', {
        consultation_id: consultationId,
        vehicle_id: vehicleId,
        had_deal_amount: dealAmount !== '',
      });

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
                  style={{ marginBottom: theme.spacing.md }}
                  editable={!isSubmitting}
                />

                {/* Checkbox for Sell Type Consultations */}
                {isSellType && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.checkboxContainer,
                        { marginBottom: theme.spacing.sm },
                      ]}
                      onPress={() => setAddToOwnedVehicles(!addToOwnedVehicles)}
                      disabled={isSubmitting}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={addToOwnedVehicles ? 'check-box' : 'check-box-outline-blank'}
                        size={24}
                        color={addToOwnedVehicles ? theme.colors.primary.main : theme.colors.text.secondary}
                      />
                      <Text
                        style={[
                          styles.checkboxLabel,
                          {
                            fontSize: theme.typography.fontSize.body,
                            color: theme.colors.text.primary,
                            marginLeft: theme.spacing.sm,
                          },
                        ]}
                      >
                        관리자 소유 차량으로 등록
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.checkboxContainer,
                        { marginBottom: theme.spacing.lg },
                      ]}
                      onPress={() => setTransferOwnership(!transferOwnership)}
                      disabled={isSubmitting}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={transferOwnership ? 'check-box' : 'check-box-outline-blank'}
                        size={24}
                        color={transferOwnership ? theme.colors.primary.main : theme.colors.text.secondary}
                      />
                      <Text
                        style={[
                          styles.checkboxLabel,
                          {
                            fontSize: theme.typography.fontSize.body,
                            color: theme.colors.text.primary,
                            marginLeft: theme.spacing.sm,
                          },
                        ]}
                      >
                        차량 소유권 이전 (판매자 → 관리자)
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Checkbox for Buy Type Consultations */}
                {!isSellType && (
                  <TouchableOpacity
                    style={[
                      styles.checkboxContainer,
                      { marginBottom: theme.spacing.lg },
                    ]}
                    onPress={() => setTransferOwnership(!transferOwnership)}
                    disabled={isSubmitting}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={transferOwnership ? 'check-box' : 'check-box-outline-blank'}
                      size={24}
                      color={transferOwnership ? theme.colors.primary.main : theme.colors.text.secondary}
                    />
                    <Text
                      style={[
                        styles.checkboxLabel,
                        {
                          fontSize: theme.typography.fontSize.body,
                          color: theme.colors.text.primary,
                          marginLeft: theme.spacing.sm,
                        },
                      ]}
                    >
                      차량 소유권 이전 (관리자 → 구매자)
                    </Text>
                  </TouchableOpacity>
                )}

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
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Ownership Transfer Confirmation Modal */}
      <OwnershipTransferConfirmModal
        isVisible={showOwnershipConfirmModal}
        onClose={handleOwnershipTransferCancel}
        onConfirm={handleOwnershipTransferConfirm}
        vehicleDetails={vehicleDetails}
        sellerDetails={sellerDetails}
        buyerDetails={buyerDetails}
        transferType={isSellType ? 'sell_to_admin' : 'admin_to_buyer'}
        dealAmount={Number(dealAmount)}
        isLoading={transferLoading}
        showSuccess={transferSuccess}
        error={transferError}
      />
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {},
  buttonRow: {
    flexDirection: 'row',
  },
});

CompleteDealModal.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  consultationId: PropTypes.string,
  vehicleId: PropTypes.string,
  sellerId: PropTypes.string,
  buyerId: PropTypes.string,
  isSellType: PropTypes.bool,
  vehicleDetails: PropTypes.shape({
    vehicleName: PropTypes.string,
    manufacturer: PropTypes.string,
    year: PropTypes.number,
    vehicleNumber: PropTypes.string,
  }),
  sellerDetails: PropTypes.shape({
    name: PropTypes.string,
    phoneNumber: PropTypes.string,
  }),
  buyerDetails: PropTypes.shape({
    name: PropTypes.string,
    phoneNumber: PropTypes.string,
  }),
};

export default CompleteDealModal;
