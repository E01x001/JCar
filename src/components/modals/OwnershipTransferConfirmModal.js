/**
 * JCar Design System - OwnershipTransferConfirmModal Component
 *
 * Final confirmation modal for vehicle ownership transfer with detailed information display.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import PropTypes from 'prop-types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';
import Button from '../Button';
import BaseModal from './BaseModal';

/**
 * OwnershipTransferConfirmModal Component
 *
 * @param {Object} props
 * @param {boolean} props.isVisible - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onConfirm - Confirm handler (executes transfer)
 * @param {Object} props.vehicleDetails - Vehicle information
 * @param {Object} props.sellerDetails - Seller user information (null for admin)
 * @param {Object} props.buyerDetails - Buyer user information (null for admin)
 * @param {string} props.transferType - 'sell_to_admin' or 'admin_to_buyer'
 * @param {number} props.dealAmount - Deal amount in KRW
 * @param {boolean} [props.isLoading] - Loading state during transaction
 * @param {boolean} [props.showSuccess] - Show success animation
 * @param {string} [props.error] - Error message to display
 */
const OwnershipTransferConfirmModal = ({
  isVisible,
  onClose,
  onConfirm,
  vehicleDetails,
  sellerDetails,
  buyerDetails,
  transferType,
  dealAmount,
  isLoading = false,
  showSuccess = false,
  error = null,
}) => {
  const theme = useTheme();
  const [finalConfirmChecked, setFinalConfirmChecked] = useState(false);

  // Reset checkbox when modal opens/closes
  useEffect(() => {
    if (!isVisible) {
      setFinalConfirmChecked(false);
    }
  }, [isVisible]);

  const handleConfirm = () => {
    if (finalConfirmChecked && !isLoading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  // Format price for display
  const formatPrice = (price) => {
    if (!price) {return '0원';}
    const million = Math.floor(price / 10000);
    return `${million.toLocaleString()}만원`;
  };

  // Determine transfer direction text
  const getTransferDirectionText = () => {
    if (transferType === 'sell_to_admin') {
      return '판매자 → 관리자';
    } else if (transferType === 'admin_to_buyer') {
      return '관리자 → 구매자';
    }
    return '';
  };

  return (
    <BaseModal
      variant="sheet"
      visible={isVisible}
      onClose={handleCancel}
      avoidKeyboard={false}
      backdropDisabled={isLoading}
    >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.background.paper,
              borderTopLeftRadius: theme.borderRadius.cardLg,
              borderTopRightRadius: theme.borderRadius.cardLg,
            },
          ]}
        >
          <View style={[styles.grabHandle, { backgroundColor: theme.colors.border.subtle }]} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
              {/* Header */}
              <View style={styles.header}>
                <MaterialIcons
                  name="swap-horiz"
                  size={32}
                  color={theme.colors.primary.main}
                />
                <Text
                  style={[
                    styles.title,
                    {
                      fontSize: theme.typography.fontSize.h3,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.text.primary,
                      marginLeft: theme.spacing.sm,
                    },
                  ]}
                >
                  소유권 이전 확인
                </Text>
              </View>

              {/* Success Animation */}
              {showSuccess && (
                <View style={[styles.successContainer, { marginBottom: theme.spacing.md }]}>
                  <MaterialIcons
                    name="check-circle"
                    size={64}
                    color={theme.colors.success.main}
                  />
                  <Text
                    style={[
                      styles.successText,
                      {
                        fontSize: theme.typography.fontSize.h4,
                        fontWeight: theme.typography.fontWeight.semiBold,
                        color: theme.colors.success.main,
                        marginTop: theme.spacing.sm,
                      },
                    ]}
                  >
                    소유권 이전이 완료되었습니다!
                  </Text>
                </View>
              )}

              {/* Error Message */}
              {error && (
                <View
                  style={[
                    styles.errorContainer,
                    {
                      backgroundColor: theme.colors.danger.light + '20',
                      borderRadius: theme.borderRadius.md,
                      padding: theme.spacing.md,
                      marginBottom: theme.spacing.md,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="error-outline"
                    size={24}
                    color={theme.colors.danger.main}
                  />
                  <Text
                    style={[
                      styles.errorText,
                      {
                        fontSize: theme.typography.fontSize.body,
                        color: theme.colors.danger.main,
                        marginLeft: theme.spacing.sm,
                      },
                    ]}
                  >
                    {error}
                  </Text>
                </View>
              )}

              {/* Transfer Direction */}
              <View style={[styles.section, { marginBottom: theme.spacing.md }]}>
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      fontSize: theme.typography.fontSize.caption,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.xs,
                    },
                  ]}
                >
                  이전 방향
                </Text>
                <Text
                  style={[
                    styles.sectionValue,
                    {
                      fontSize: theme.typography.fontSize.h4,
                      fontWeight: theme.typography.fontWeight.semiBold,
                      color: theme.colors.primary.main,
                    },
                  ]}
                >
                  {getTransferDirectionText()}
                </Text>
              </View>

              {/* Vehicle Details */}
              <View style={[styles.section, { marginBottom: theme.spacing.md }]}>
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      fontSize: theme.typography.fontSize.caption,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.xs,
                    },
                  ]}
                >
                  차량 정보
                </Text>
                <View
                  style={[
                    styles.detailsBox,
                    {
                      backgroundColor: theme.colors.background.secondary,
                      borderRadius: theme.borderRadius.md,
                      padding: theme.spacing.md,
                    },
                  ]}
                >
                  <Text style={[styles.detailRow, { fontSize: theme.typography.fontSize.body, color: theme.colors.text.primary }]}>
                    차량명: {vehicleDetails?.vehicleName || 'N/A'}
                  </Text>
                  <Text style={[styles.detailRow, { fontSize: theme.typography.fontSize.body, color: theme.colors.text.primary }]}>
                    제조사: {vehicleDetails?.manufacturer || 'N/A'}
                  </Text>
                  <Text style={[styles.detailRow, { fontSize: theme.typography.fontSize.body, color: theme.colors.text.primary }]}>
                    연식: {vehicleDetails?.year || 'N/A'}
                  </Text>
                  {vehicleDetails?.vehicleNumber && (
                    <Text style={[styles.detailRow, { fontSize: theme.typography.fontSize.body, color: theme.colors.text.primary }]}>
                      차량번호: {vehicleDetails.vehicleNumber}
                    </Text>
                  )}
                </View>
              </View>

              {/* Seller Details */}
              {sellerDetails && (
                <View style={[styles.section, { marginBottom: theme.spacing.md }]}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      {
                        fontSize: theme.typography.fontSize.caption,
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.xs,
                      },
                    ]}
                  >
                    판매자 정보
                  </Text>
                  <View
                    style={[
                      styles.detailsBox,
                      {
                        backgroundColor: theme.colors.background.secondary,
                        borderRadius: theme.borderRadius.md,
                        padding: theme.spacing.md,
                      },
                    ]}
                  >
                    <Text style={[styles.detailRow, { fontSize: theme.typography.fontSize.body, color: theme.colors.text.primary }]}>
                      이름: {sellerDetails.name || 'N/A'}
                    </Text>
                    <Text style={[styles.detailRow, { fontSize: theme.typography.fontSize.body, color: theme.colors.text.primary }]}>
                      전화번호: {sellerDetails.phoneNumber || 'N/A'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Buyer Details */}
              {buyerDetails && (
                <View style={[styles.section, { marginBottom: theme.spacing.md }]}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      {
                        fontSize: theme.typography.fontSize.caption,
                        color: theme.colors.text.secondary,
                        marginBottom: theme.spacing.xs,
                      },
                    ]}
                  >
                    구매자 정보
                  </Text>
                  <View
                    style={[
                      styles.detailsBox,
                      {
                        backgroundColor: theme.colors.background.secondary,
                        borderRadius: theme.borderRadius.md,
                        padding: theme.spacing.md,
                      },
                    ]}
                  >
                    <Text style={[styles.detailRow, { fontSize: theme.typography.fontSize.body, color: theme.colors.text.primary }]}>
                      이름: {buyerDetails.name || 'N/A'}
                    </Text>
                    <Text style={[styles.detailRow, { fontSize: theme.typography.fontSize.body, color: theme.colors.text.primary }]}>
                      전화번호: {buyerDetails.phoneNumber || 'N/A'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Deal Amount */}
              <View style={[styles.section, { marginBottom: theme.spacing.lg }]}>
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      fontSize: theme.typography.fontSize.caption,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.xs,
                    },
                  ]}
                >
                  거래 금액
                </Text>
                <Text
                  style={[
                    styles.sectionValue,
                    {
                      fontSize: theme.typography.fontSize.h4,
                      fontWeight: theme.typography.fontWeight.bold,
                      color: theme.colors.text.primary,
                    },
                  ]}
                >
                  {formatPrice(dealAmount)}
                </Text>
              </View>

              {/* Final Confirmation Checkbox */}
              {!showSuccess && (
                <TouchableOpacity
                  style={[
                    styles.checkboxContainer,
                    { marginBottom: theme.spacing.lg },
                  ]}
                  onPress={() => setFinalConfirmChecked(!finalConfirmChecked)}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name={finalConfirmChecked ? 'check-box' : 'check-box-outline-blank'}
                    size={24}
                    color={finalConfirmChecked ? theme.colors.primary.main : theme.colors.text.secondary}
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
                    위 내용을 확인했으며, 소유권 이전을 진행합니다.
                  </Text>
                </TouchableOpacity>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <Button
                  variant="secondary"
                  title="취소"
                  onPress={handleCancel}
                  disabled={isLoading || showSuccess}
                  style={{ flex: 1, marginRight: theme.spacing.sm }}
                />
                <Button
                  variant="primary"
                  title={
                    isLoading
                      ? '처리 중...'
                      : showSuccess
                      ? '완료'
                      : '확인'
                  }
                  onPress={showSuccess ? handleCancel : handleConfirm}
                  disabled={(!finalConfirmChecked && !showSuccess) || isLoading}
                  style={{ flex: 1, marginLeft: theme.spacing.sm }}
                  icon={
                    isLoading ? (
                      <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                    ) : null
                  }
                />
              </View>
          </ScrollView>
        </View>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    width: '100%',
    maxHeight: '90%',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 30,
  },
  grabHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {},
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {},
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
  },
  section: {},
  sectionLabel: {},
  sectionValue: {},
  detailsBox: {},
  detailRow: {
    marginBottom: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
  },
});

OwnershipTransferConfirmModal.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
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
  transferType: PropTypes.oneOf(['sell_to_admin', 'admin_to_buyer']).isRequired,
  dealAmount: PropTypes.number.isRequired,
  isLoading: PropTypes.bool,
  showSuccess: PropTypes.bool,
  error: PropTypes.string,
};

export default OwnershipTransferConfirmModal;
