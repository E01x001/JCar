/**
 * JCar Design System - AdminMemoModal Component
 *
 * Modal for admins to add or edit internal memos on consultations.
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
 * AdminMemoModal Component
 *
 * @param {Object} props
 * @param {boolean} props.isVisible - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSubmit - Submit handler (memo)
 * @param {string} [props.initialMemo] - Existing memo to pre-populate
 * @param {string} [props.consultationId] - Consultation ID for reference
 */
const AdminMemoModal = ({ isVisible, onClose, onSubmit, initialMemo = '', consultationId }) => {
  const theme = useTheme();
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load initial memo when modal opens
  useEffect(() => {
    if (isVisible) {
      setMemo(initialMemo || '');
    }
  }, [isVisible, initialMemo]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isVisible) {
      setMemo('');
      setIsSubmitting(false);
    }
  }, [isVisible]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(memo.trim());
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
                      marginBottom: theme.spacing.xs,
                    },
                  ]}
                >
                  관리자 메모
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
                  이 메모는 관리자만 볼 수 있습니다.
                </Text>

                {/* Memo Input */}
                <InputField
                  label="메모"
                  value={memo}
                  onChangeText={setMemo}
                  placeholder="상담 관련 메모를 입력하세요"
                  multiline
                  numberOfLines={6}
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
                    variant="primary"
                    title={isSubmitting ? '저장 중...' : '저장'}
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
  infoText: {},
  buttonRow: {
    flexDirection: 'row',
  },
});

AdminMemoModal.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialMemo: PropTypes.string,
  consultationId: PropTypes.string,
};

export default AdminMemoModal;
