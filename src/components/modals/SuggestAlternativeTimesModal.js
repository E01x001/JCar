/**
 * JCar Design System - SuggestAlternativeTimesModal Component
 *
 * Modal for admins to suggest alternative time slots for consultations.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import PropTypes from 'prop-types';
import BaseModal from './BaseModal';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  // @react-native-community/datetimepicker는 날짜와 시간을 각각 띄운다.
  // 기존 datetime 한 번에 고르던 UX를 유지하려고 date → time 2단계로 잇는다.
  const [pickerMode, setPickerMode] = useState('date');
  const [pendingDate, setPendingDate] = useState(null);

  const handlePickerChange = (event, picked) => {
    // 안드로이드는 취소 시 dismissed 이벤트를 준다
    if (event?.type === 'dismissed' || !picked) {
      setIsDatePickerVisible(false);
      setPickerMode('date');
      setPendingDate(null);
      return;
    }

    if (pickerMode === 'date') {
      // 날짜만 고른 상태 — 이어서 시간 선택을 띄운다
      setPendingDate(picked);
      setPickerMode('time');
      return;
    }

    const base = pendingDate ?? picked;
    const combined = new Date(
      base.getFullYear(), base.getMonth(), base.getDate(),
      picked.getHours(), picked.getMinutes(), 0, 0,
    );
    setSuggestedSlots([...suggestedSlots, combined]);
    setIsDatePickerVisible(false);
    setPickerMode('date');
    setPendingDate(null);
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
          borderWidth: 1,
          borderColor: theme.colors.primary.opacity10,
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
            fontWeight: theme.typography.fontWeight.medium,
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
    <BaseModal variant="center" visible={isVisible} onClose={handleCancel}>
      <View style={styles.modalContainer}>
        <Card
          style={[
            styles.modalCard,
            {
              backgroundColor: '#FFFFFF',
              borderRadius: theme.borderRadius.lg,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
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
                  color: theme.colors.primary.main,
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
                  color: theme.colors.text.primary,
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
                      color: theme.colors.primary.main,
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
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: theme.colors.border.light,
                    padding: theme.spacing.lg,
                    marginBottom: theme.spacing.md,
                    alignItems: 'center',
                  },
                ]}
              >
                <MaterialIcons
                  name="schedule"
                  size={48}
                  color={theme.colors.primary.light}
                />
                <Text
                  style={[
                    styles.emptyText,
                    {
                      fontSize: theme.typography.fontSize.bodySmall,
                      color: theme.colors.text.secondary,
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
        {isDatePickerVisible && (
          <DateTimePicker
            value={pendingDate ?? selectedDate}
            mode={pickerMode}
            minimumDate={pickerMode === 'date' ? new Date() : undefined}
            minuteInterval={10}
            onChange={handlePickerChange}
          />
        )}
      </View>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
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
