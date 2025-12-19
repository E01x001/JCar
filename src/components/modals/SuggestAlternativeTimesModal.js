/**
 * JCar Design System - SuggestAlternativeTimesModal Component
 *
 * Modal for admins to suggest alternative time slots for consultations.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useTheme } from '../../theme/ThemeProvider';
import Card from '../Card';
import Button from '../Button';

/**
 * SuggestAlternativeTimesModal Component
 *
 * @param {Object} props
 * @param {boolean} props.isVisible - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSubmit - Submit handler (suggestedSlots)
 * @param {Array<Date>} [props.initialSlots] - Existing suggested slots to pre-populate
 * @param {string} [props.consultationId] - Consultation ID for reference
 */
const SuggestAlternativeTimesModal = ({ isVisible, onClose, onSubmit, initialSlots = [], consultationId }) => {
  const theme = useTheme();
  const [suggestedSlots, setSuggestedSlots] = useState([]);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load initial slots when modal opens
  // Convert {date, time} format to Date objects
  useEffect(() => {
    if (isVisible && initialSlots && initialSlots.length > 0) {
      const convertedSlots = initialSlots.map(slot => {
        if (slot instanceof Date) {
          return slot;
        }
        // Assume slot is {date: "YYYY-MM-DD", time: "HH:MM"}
        if (slot.date && slot.time) {
          const [year, month, day] = slot.date.split('-').map(Number);
          const [hours, minutes] = slot.time.split(':').map(Number);
          return new Date(year, month - 1, day, hours, minutes);
        }
        return new Date(slot);
      });
      setSuggestedSlots(convertedSlots);
    }
  }, [isVisible, initialSlots]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isVisible) {
      setSuggestedSlots([]);
      setIsSubmitting(false);
    }
  }, [isVisible]);

  const handleAddTimeSlot = (selectedDate) => {
    setIsDatePickerVisible(false);
    if (selectedDate) {
      setSuggestedSlots([...suggestedSlots, selectedDate]);
    }
  };

  const handleRemoveTimeSlot = (index) => {
    setSuggestedSlots(suggestedSlots.filter((_, i) => i !== index));
  };

  const formatDateTime = (date) => {
    if (!date) {return '-';}
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(suggestedSlots);
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

  const renderTimeSlot = ({ item, index }) => (
    <View
      style={[
        styles.timeSlotItem,
        {
          backgroundColor: theme.colors.background.secondary,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.sm,
          marginBottom: theme.spacing.xs,
        },
      ]}
    >
      <Text
        style={[
          styles.timeSlotText,
          {
            fontSize: theme.typography.fontSize.body,
            color: theme.colors.text.primary,
            flex: 1,
          },
        ]}
      >
        {formatDateTime(item)}
      </Text>
      <TouchableOpacity
        onPress={() => handleRemoveTimeSlot(index)}
        disabled={isSubmitting}
        activeOpacity={0.6}
        style={{
          padding: theme.spacing.xs,
        }}
      >
        <MaterialIcons
          name="delete"
          size={20}
          color={theme.colors.error.main}
        />
      </TouchableOpacity>
    </View>
  );

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
                      marginBottom: theme.spacing.xs,
                    },
                  ]}
                >
                  대체 시간 제안
                </Text>

                {/* Info Text */}
                <Text
                  style={[
                    styles.infoText,
                    {
                      fontSize: theme.typography.fontSize.bodySmall,
                      color: theme.colors.text.secondary,
                      marginBottom: theme.spacing.md,
                    },
                  ]}
                >
                  고객에게 제안할 대체 상담 시간을 추가하세요.
                </Text>

                {/* Add Time Slot Button */}
                <Button
                  variant="secondary"
                  title="시간 추가"
                  onPress={() => setIsDatePickerVisible(true)}
                  disabled={isSubmitting}
                  icon="add"
                  style={{ marginBottom: theme.spacing.md }}
                />

                {/* Suggested Slots List */}
                {suggestedSlots.length > 0 ? (
                  <View style={{ marginBottom: theme.spacing.md }}>
                    <Text
                      style={[
                        styles.listTitle,
                        {
                          fontSize: theme.typography.fontSize.bodySmall,
                          fontWeight: theme.typography.fontWeight.semiBold,
                          color: theme.colors.text.secondary,
                          marginBottom: theme.spacing.xs,
                        },
                      ]}
                    >
                      제안된 시간 ({suggestedSlots.length})
                    </Text>
                    <FlatList
                      data={suggestedSlots}
                      renderItem={renderTimeSlot}
                      keyExtractor={(item, index) => `slot-${index}`}
                      scrollEnabled={false}
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.emptyState,
                      {
                        backgroundColor: theme.colors.background.secondary,
                        borderRadius: theme.borderRadius.md,
                        padding: theme.spacing.lg,
                        marginBottom: theme.spacing.md,
                        alignItems: 'center',
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="schedule"
                      size={48}
                      color={theme.colors.text.tertiary}
                    />
                    <Text
                      style={[
                        styles.emptyText,
                        {
                          fontSize: theme.typography.fontSize.bodySmall,
                          color: theme.colors.text.tertiary,
                          marginTop: theme.spacing.sm,
                        },
                      ]}
                    >
                      제안된 시간이 없습니다
                    </Text>
                  </View>
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
                    variant="primary"
                    title={isSubmitting ? '저장 중...' : '저장'}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    style={{ flex: 1, marginLeft: theme.spacing.sm }}
                  />
                </View>
              </ScrollView>
            </Card>

            {/* Date Time Picker */}
            <DateTimePickerModal
              isVisible={isDatePickerVisible}
              mode="datetime"
              onConfirm={handleAddTimeSlot}
              onCancel={() => setIsDatePickerVisible(false)}
              minimumDate={new Date()}
              minuteInterval={10}
            />
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
  infoText: {},
  listTitle: {},
  timeSlotItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeSlotText: {},
  emptyState: {},
  emptyText: {},
  buttonRow: {
    flexDirection: 'row',
  },
});

SuggestAlternativeTimesModal.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialSlots: PropTypes.array,
  consultationId: PropTypes.string,
};

export default SuggestAlternativeTimesModal;
