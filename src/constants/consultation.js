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
 * - CONFIRMED: Consultation time is confirmed (admin workflow)
 * - ON_HOLD: Temporarily paused by admin, awaiting follow-up
 * - REJECTED: Admin has rejected the consultation request
 * - COMPLETED: Consultation has been completed and deal was finalized
 * - CANCELLED: User or admin cancelled the consultation
 * - ARCHIVED: Completed consultation with ownership transfer (Task 50)
 *
 * NOTE: This is the single source of truth for status values. Badge.js renders
 * its own color/label mapping (it is a generic component reused outside
 * consultations), so it intentionally does not consume the maps below.
 */
export const CONSULTATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  CONFIRMED: 'confirmed',
  ON_HOLD: 'on-hold',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ARCHIVED: 'archived',
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
  [CONSULTATION_STATUS.CONFIRMED]: '확정됨',
  [CONSULTATION_STATUS.ON_HOLD]: '보류',
  [CONSULTATION_STATUS.REJECTED]: '거절됨',
  [CONSULTATION_STATUS.COMPLETED]: '완료됨',
  [CONSULTATION_STATUS.CANCELLED]: '취소됨',
  [CONSULTATION_STATUS.ARCHIVED]: '보관됨',
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
  [CONSULTATION_STATUS.CONFIRMED]: '#4CAF50', // success.main (same family as approved)
  [CONSULTATION_STATUS.ON_HOLD]: '#FFA000', // amber (matches theme status on-hold)
  [CONSULTATION_STATUS.REJECTED]: '#F44336', // error.main
  [CONSULTATION_STATUS.COMPLETED]: '#2196F3', // info.main
  [CONSULTATION_STATUS.CANCELLED]: '#9E9E9E', // grey
  [CONSULTATION_STATUS.ARCHIVED]: '#78909C', // blue-grey
};

/**
 * Valid Status Transitions
 *
 * Descriptive map of the consultation lifecycle (currently documentation only —
 * isValidStatusTransition is exported but not yet enforced at runtime). Reflects
 * the transitions observed in the codebase:
 * - PENDING → APPROVED / CONFIRMED / ON_HOLD / REJECTED / CANCELLED
 * - APPROVED → COMPLETED / CANCELLED
 * - CONFIRMED → COMPLETED / ON_HOLD / REJECTED / CANCELLED
 * - ON_HOLD → APPROVED / CONFIRMED / REJECTED / CANCELLED
 * - REJECTED → PENDING (user resubmits a rejected request)
 * - COMPLETED → ARCHIVED (completed deal with ownership transfer, Task 50)
 * - CANCELLED / ARCHIVED: terminal
 */
export const VALID_STATUS_TRANSITIONS = {
  [CONSULTATION_STATUS.PENDING]: [
    CONSULTATION_STATUS.APPROVED,
    CONSULTATION_STATUS.CONFIRMED,
    CONSULTATION_STATUS.ON_HOLD,
    CONSULTATION_STATUS.REJECTED,
    CONSULTATION_STATUS.CANCELLED,
  ],
  [CONSULTATION_STATUS.APPROVED]: [
    CONSULTATION_STATUS.COMPLETED,
    CONSULTATION_STATUS.CANCELLED,
  ],
  [CONSULTATION_STATUS.CONFIRMED]: [
    CONSULTATION_STATUS.COMPLETED,
    CONSULTATION_STATUS.ON_HOLD,
    CONSULTATION_STATUS.REJECTED,
    CONSULTATION_STATUS.CANCELLED,
  ],
  [CONSULTATION_STATUS.ON_HOLD]: [
    CONSULTATION_STATUS.APPROVED,
    CONSULTATION_STATUS.CONFIRMED,
    CONSULTATION_STATUS.REJECTED,
    CONSULTATION_STATUS.CANCELLED,
  ],
  [CONSULTATION_STATUS.REJECTED]: [
    CONSULTATION_STATUS.PENDING,
  ],
  [CONSULTATION_STATUS.COMPLETED]: [
    CONSULTATION_STATUS.ARCHIVED,
  ],
  [CONSULTATION_STATUS.CANCELLED]: [],
  [CONSULTATION_STATUS.ARCHIVED]: [],
};

/**
 * 사용자가 직접 취소할 수 있는 상태.
 *
 * DB 가드(app_private.guard_consultation_user_update)가 허용하는 목록과 **일치해야 한다.**
 * 화면이 이 목록보다 넓게 취소 버튼을 노출하면 사용자는 원인 불명 실패를 겪는다
 * (실제로 approved에서 그런 일이 있었다 — 20260818140000 마이그레이션 참고).
 * 좁게 노출하면 취소할 수 있는데 못 하게 된다.
 *
 * 변경 시 반드시 DB 가드도 함께 바꾸고, __tests__/constants/consultation.test.js를 갱신한다.
 */
export const USER_CANCELLABLE_STATUSES = [
  CONSULTATION_STATUS.PENDING,
  CONSULTATION_STATUS.APPROVED,
  CONSULTATION_STATUS.CONFIRMED,
  CONSULTATION_STATUS.ON_HOLD,
];

/** 사용자가 이 상담을 지금 취소할 수 있는가 */
export const canUserCancel = (status) => USER_CANCELLABLE_STATUSES.includes(status);

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
