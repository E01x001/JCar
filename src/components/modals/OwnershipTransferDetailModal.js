/**
 * JCar Design System - OwnershipTransferDetailModal Component
 *
 * Modal for displaying detailed information about a vehicle ownership transfer.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import PropTypes from 'prop-types';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../theme/ThemeProvider';
import Card from '../Card';
import Button from '../Button';

/**
 * OwnershipTransferDetailModal Component
 *
 * @param {Object} props
 * @param {boolean} props.isVisible - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.transferData - Complete ownership transfer record
 */
const OwnershipTransferDetailModal = ({ isVisible, onClose, transferData }) => {
  const theme = useTheme();

  if (!transferData) {
    return null;
  }

  // Format price for display
  const formatPrice = (price) => {
    if (!price) {return '0원';}
    const million = Math.floor(price / 10000);
    return `${million.toLocaleString()}만원`;
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) {return 'N/A';}
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (err) {
      return 'N/A';
    }
  };

  // Get transfer type display text
  const getTransferTypeText = (type) => {
    switch (type) {
      case 'sell_to_admin':
        return '판매자 → 관리자';
      case 'admin_to_buyer':
        return '관리자 → 구매자';
      default:
        return type || 'N/A';
    }
  };

  // Get transfer type color
  const getTransferTypeColor = (type) => {
    switch (type) {
      case 'sell_to_admin':
        return theme.colors.primary.main;
      case 'admin_to_buyer':
        return theme.colors.success.main;
      default:
        return theme.colors.text.secondary;
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.75)' }]}
          activeOpacity={1}
          onPress={onClose}
        />
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
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={[styles.header, { marginBottom: theme.spacing.lg }]}>
                <MaterialIcons
                  name="description"
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
                  소유권 이전 상세
                </Text>
              </View>

              {/* Transfer ID */}
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
                  이전 ID
                </Text>
                <Text
                  style={[
                    styles.sectionValue,
                    {
                      fontSize: theme.typography.fontSize.body,
                      color: theme.colors.text.primary,
                    },
                  ]}
                >
                  {transferData.transferId || 'N/A'}
                </Text>
              </View>

              {/* Transfer Type */}
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
                  이전 유형
                </Text>
                <Text
                  style={[
                    styles.sectionValue,
                    {
                      fontSize: theme.typography.fontSize.h4,
                      fontWeight: theme.typography.fontWeight.semiBold,
                      color: getTransferTypeColor(transferData.transferType),
                    },
                  ]}
                >
                  {getTransferTypeText(transferData.transferType)}
                </Text>
              </View>

              {/* Transfer Date */}
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
                  이전 날짜
                </Text>
                <Text
                  style={[
                    styles.sectionValue,
                    {
                      fontSize: theme.typography.fontSize.body,
                      color: theme.colors.text.primary,
                    },
                  ]}
                >
                  {formatDate(transferData.transferredAt)}
                </Text>
              </View>

              {/* Vehicle ID */}
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
                  차량 ID
                </Text>
                <Text
                  style={[
                    styles.sectionValue,
                    {
                      fontSize: theme.typography.fontSize.body,
                      color: theme.colors.text.primary,
                    },
                  ]}
                >
                  {transferData.vehicleId || 'N/A'}
                </Text>
              </View>

              {/* Consultation ID */}
              {transferData.consultationId && (
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
                    상담 ID
                  </Text>
                  <Text
                    style={[
                      styles.sectionValue,
                      {
                        fontSize: theme.typography.fontSize.body,
                        color: theme.colors.text.primary,
                      },
                    ]}
                  >
                    {transferData.consultationId}
                  </Text>
                </View>
              )}

              {/* From User */}
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
                  판매자
                </Text>
                <Text
                  style={[
                    styles.sectionValue,
                    {
                      fontSize: theme.typography.fontSize.body,
                      color: theme.colors.text.primary,
                    },
                  ]}
                >
                  {transferData.fromUserId || '관리자'}
                </Text>
              </View>

              {/* To User */}
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
                  구매자
                </Text>
                <Text
                  style={[
                    styles.sectionValue,
                    {
                      fontSize: theme.typography.fontSize.body,
                      color: theme.colors.text.primary,
                    },
                  ]}
                >
                  {transferData.toUserId || '관리자'}
                </Text>
              </View>

              {/* Price */}
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
                  {formatPrice(transferData.price)}
                </Text>
              </View>

              {/* Notes */}
              {transferData.notes && (
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
                    메모
                  </Text>
                  <View
                    style={[
                      styles.notesBox,
                      {
                        backgroundColor: theme.colors.background.secondary,
                        borderRadius: theme.borderRadius.md,
                        padding: theme.spacing.md,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.notesText,
                        {
                          fontSize: theme.typography.fontSize.body,
                          color: theme.colors.text.primary,
                          lineHeight: 20,
                        },
                      ]}
                    >
                      {transferData.notes}
                    </Text>
                  </View>
                </View>
              )}

              {/* Close Button */}
              <Button variant="secondary" title="닫기" onPress={onClose} />
            </ScrollView>
          </Card>
        </View>
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
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalCard: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {},
  section: {},
  sectionLabel: {},
  sectionValue: {},
  notesBox: {},
  notesText: {},
});

OwnershipTransferDetailModal.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  transferData: PropTypes.shape({
    transferId: PropTypes.string,
    vehicleId: PropTypes.string,
    consultationId: PropTypes.string,
    fromUserId: PropTypes.string,
    toUserId: PropTypes.string,
    transferType: PropTypes.string,
    transferredAt: PropTypes.object,
    price: PropTypes.number,
    notes: PropTypes.string,
  }),
};

export default OwnershipTransferDetailModal;
