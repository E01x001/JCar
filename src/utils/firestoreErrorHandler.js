/**
 * Firestore Error Handler
 *
 * Centralized error handling for Firestore operations.
 * Provides user-friendly error messages for common Firebase errors,
 * especially permission-denied and authentication errors.
 */

import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/firebaseService'; // Task 63.2: Migrated to v22 Modular API

/**
 * Get user-friendly error message from Firebase error
 *
 * @param {Error} error - Firebase error object
 * @returns {string} User-friendly error message
 */
export const getFirestoreErrorMessage = (error) => {
  if (!error) {
    return '알 수 없는 오류가 발생했습니다.';
  }

  const errorCode = error.code;

  switch (errorCode) {
    case 'permission-denied':
      return '접근 권한이 없습니다. 이 작업을 수행할 권한이 없습니다.';

    case 'unauthenticated':
      return '로그인이 필요합니다. 다시 로그인해 주세요.';

    case 'not-found':
      return '요청한 데이터를 찾을 수 없습니다.';

    case 'already-exists':
      return '이미 존재하는 데이터입니다.';

    case 'resource-exhausted':
      return '요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.';

    case 'failed-precondition':
      return '작업을 수행할 수 없는 상태입니다.';

    case 'aborted':
      return '작업이 중단되었습니다. 다시 시도해 주세요.';

    case 'out-of-range':
      return '유효하지 않은 범위입니다.';

    case 'unimplemented':
      return '지원하지 않는 기능입니다.';

    case 'internal':
      return '서버 내부 오류가 발생했습니다.';

    case 'unavailable':
      return '서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.';

    case 'data-loss':
      return '데이터 손실이 발생했습니다.';

    case 'cancelled':
      return '작업이 취소되었습니다.';

    default:
      // Return original error message if no specific mapping
      return error.message || '오류가 발생했습니다. 다시 시도해 주세요.';
  }
};

/**
 * Handle Firestore error with logging and user notification
 *
 * @param {Error} error - Firebase error object
 * @param {Object} context - Context information for logging
 * @param {Function} notifyUser - Function to notify user (e.g., toast.showError)
 * @returns {string} User-friendly error message
 */
export const handleFirestoreError = (error, context = {}, notifyUser = null) => {
  // Get user-friendly message
  const userMessage = getFirestoreErrorMessage(error);

  // Log to Crashlytics
  reportCrashlyticsError(error);
  logCrashlyticsMessage(
    `Firestore error: ${error.code || 'unknown'} - ${JSON.stringify(context)}`
  );

  // Log to console
  console.error('🔥 Firestore Error:', {
    code: error.code,
    message: error.message,
    context,
  });

  // Notify user if function provided
  if (notifyUser && typeof notifyUser === 'function') {
    notifyUser('오류', userMessage);
  }

  return userMessage;
};

/**
 * Check if error is a permission-denied error
 *
 * @param {Error} error - Firebase error object
 * @returns {boolean} True if permission-denied error
 */
export const isPermissionDenied = (error) => {
  return error && error.code === 'permission-denied';
};

/**
 * Check if error is an authentication error
 *
 * @param {Error} error - Firebase error object
 * @returns {boolean} True if authentication error
 */
export const isAuthenticationError = (error) => {
  return (
    error &&
    (error.code === 'unauthenticated' || error.code === 'permission-denied')
  );
};

/**
 * Wrap Firestore operation with error handling
 *
 * @param {Function} operation - Async Firestore operation
 * @param {Object} context - Context information for logging
 * @param {Function} notifyUser - Function to notify user
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const executeFirestoreOperation = async (
  operation,
  context = {},
  notifyUser = null
) => {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = handleFirestoreError(error, context, notifyUser);
    return { success: false, error: errorMessage };
  }
};

export default {
  getFirestoreErrorMessage,
  handleFirestoreError,
  isPermissionDenied,
  isAuthenticationError,
  executeFirestoreOperation,
};
