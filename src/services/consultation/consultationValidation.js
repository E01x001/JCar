/**
 * Consultation Validation Service
 * Handles validation logic for consultation requests
 */

import firestore from '@react-native-firebase/firestore';
import { logger } from '../../utils/logger';

/**
 * Check if user already has a pending consultation for a vehicle
 */
export const checkDuplicateConsultation = async (userId, vehicleId) => {
  try {
    const snapshot = await firestore()
      .collection('consultation_requests')
      .where('userId', '==', userId)
      .where('vehicleId', '==', vehicleId)
      .where('status', '==', 'pending')
      .get();

    return !snapshot.empty;
  } catch (error) {
    logger.error('Error checking duplicate consultation:', error);
    throw error;
  }
};

/**
 * Check for time slot conflicts
 */
export const checkTimeSlotConflict = async (vehicleId, preferredDate, preferredTime) => {
  try {
    const snapshot = await firestore()
      .collection('consultation_requests')
      .where('vehicleId', '==', vehicleId)
      .where('preferredDate', '==', preferredDate)
      .where('preferredTime', '==', preferredTime)
      .where('status', 'in', ['pending', 'approved'])
      .get();

    return !snapshot.empty;
  } catch (error) {
    logger.error('Error checking time slot conflict:', error);
    throw error;
  }
};

/**
 * Validate consultation request data
 */
export const validateConsultationRequest = (data) => {
  const errors = [];

  if (!data.userId) {
    errors.push('User ID is required');
  }

  if (!data.vehicleId) {
    errors.push('Vehicle ID is required');
  }

  if (!data.preferredDate) {
    errors.push('Preferred date is required');
  }

  if (!data.preferredTime) {
    errors.push('Preferred time is required');
  }

  if (!data.type || !['buy', 'sell'].includes(data.type)) {
    errors.push('Consultation type must be either "buy" or "sell"');
  }

  // Validate date is not in the past
  if (data.preferredDate) {
    const selectedDate = new Date(data.preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      errors.push('Cannot select a past date for consultation');
    }
  }

  // Validate time format (HH:MM)
  if (data.preferredTime) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.preferredTime)) {
      errors.push('Invalid time format. Expected HH:MM');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Check if consultation can be modified
 */
export const canModifyConsultation = (consultation) => {
  // Can only modify pending consultations
  if (consultation.status !== 'pending') {
    return {
      canModify: false,
      reason: 'Only pending consultations can be modified',
    };
  }

  // Check if consultation time is not too close
  const consultationDateTime = new Date(`${consultation.preferredDate} ${consultation.preferredTime}`);
  const now = new Date();
  const hoursDifference = (consultationDateTime - now) / (1000 * 60 * 60);

  if (hoursDifference < 2) {
    return {
      canModify: false,
      reason: 'Cannot modify consultation less than 2 hours before scheduled time',
    };
  }

  return {
    canModify: true,
    reason: null,
  };
};

/**
 * Check if consultation can be cancelled
 */
export const canCancelConsultation = (consultation) => {
  // Can only cancel pending or approved consultations
  if (!['pending', 'approved'].includes(consultation.status)) {
    return {
      canCancel: false,
      reason: 'Only pending or approved consultations can be cancelled',
    };
  }

  // Check if consultation time is not too close
  const consultationDateTime = new Date(`${consultation.preferredDate} ${consultation.preferredTime}`);
  const now = new Date();
  const hoursDifference = (consultationDateTime - now) / (1000 * 60 * 60);

  if (hoursDifference < 1) {
    return {
      canCancel: false,
      reason: 'Cannot cancel consultation less than 1 hour before scheduled time',
    };
  }

  return {
    canCancel: true,
    reason: null,
  };
};

export default {
  checkDuplicateConsultation,
  checkTimeSlotConflict,
  validateConsultationRequest,
  canModifyConsultation,
  canCancelConsultation,
};
