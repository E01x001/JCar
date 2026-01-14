/**
 * Consultation Constants
 *
 * Central location for all consultation-related constant values.
 * Use these constants instead of magic strings throughout the codebase.
 *
 * @module constants/consultation
 */

/**
 * Consultation Status Values
 *
 * Represents the lifecycle of a consultation request:
 * - PENDING: Initial state after user submits consultation request
 * - APPROVED: Admin has approved the consultation and confirmed the time
 * - REJECTED: Admin has rejected the consultation request
 * - COMPLETED: Consultation has been completed and deal was finalized
 * - CANCELLED: User or admin cancelled the consultation
 */
export const CONSULTATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/**
 * Consultation Type
 *
 * Indicates whether the user is requesting as a buyer or seller:
 * - BUY: User wants to purchase a vehicle
 * - SELL: User wants to sell their vehicle
 */
export const CONSULTATION_TYPE = {
  BUY: 'buy',
  SELL: 'sell',
};

/**
 * Status Labels for UI Display (Korean)
 */
export const CONSULTATION_STATUS_LABELS = {
  [CONSULTATION_STATUS.PENDING]: '대기중',
  [CONSULTATION_STATUS.APPROVED]: '승인됨',
  [CONSULTATION_STATUS.REJECTED]: '거절됨',
  [CONSULTATION_STATUS.COMPLETED]: '완료됨',
  [CONSULTATION_STATUS.CANCELLED]: '취소됨',
};

/**
 * Type Labels for UI Display (Korean)
 */
export const CONSULTATION_TYPE_LABELS = {
  [CONSULTATION_TYPE.BUY]: '구매 상담',
  [CONSULTATION_TYPE.SELL]: '판매 상담',
};

/**
 * Status Colors for UI (matches theme colors)
 */
export const CONSULTATION_STATUS_COLORS = {
  [CONSULTATION_STATUS.PENDING]: '#FFA500', // warning.main
  [CONSULTATION_STATUS.APPROVED]: '#4CAF50', // success.main
  [CONSULTATION_STATUS.REJECTED]: '#F44336', // error.main
  [CONSULTATION_STATUS.COMPLETED]: '#2196F3', // info.main
  [CONSULTATION_STATUS.CANCELLED]: '#9E9E9E', // grey
};

/**
 * Valid Status Transitions
 *
 * Defines allowed status changes to prevent invalid state transitions:
 * - From PENDING: can go to APPROVED, REJECTED, or CANCELLED
 * - From APPROVED: can go to COMPLETED or CANCELLED
 * - From REJECTED: no further transitions (terminal state)
 * - From COMPLETED: no further transitions (terminal state)
 * - From CANCELLED: no further transitions (terminal state)
 */
export const VALID_STATUS_TRANSITIONS = {
  [CONSULTATION_STATUS.PENDING]: [
    CONSULTATION_STATUS.APPROVED,
    CONSULTATION_STATUS.REJECTED,
    CONSULTATION_STATUS.CANCELLED,
  ],
  [CONSULTATION_STATUS.APPROVED]: [
    CONSULTATION_STATUS.COMPLETED,
    CONSULTATION_STATUS.CANCELLED,
  ],
  [CONSULTATION_STATUS.REJECTED]: [],
  [CONSULTATION_STATUS.COMPLETED]: [],
  [CONSULTATION_STATUS.CANCELLED]: [],
};

/**
 * Check if a status transition is valid
 *
 * @param {string} fromStatus - Current consultation status
 * @param {string} toStatus - Desired new status
 * @return {boolean} True if transition is allowed
 */
export const isValidStatusTransition = (fromStatus, toStatus) => {
  const validTransitions = VALID_STATUS_TRANSITIONS[fromStatus];
  return validTransitions && validTransitions.includes(toStatus);
};
