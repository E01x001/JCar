/**
 * Firestore Error Handler
 *
 * Centralized error handling for Firestore operations.
 * Provides user-friendly error messages for common Firebase errors,
 * especially permission-denied and authentication errors.
 *
 * Task #92: Now uses the global errorHandler for comprehensive error handling
 * @deprecated Consider using utils/errorHandler.js directly for new code
 */

import { getErrorMessage, handleFirebaseError as globalHandleFirebaseError, isPermissionError as globalIsPermissionError } from './errorHandler';

/**
 * Get user-friendly error message from Firebase error
 * Now delegates to the global error handler
 *
 * @param {Error} error - Firebase error object
 * @returns {string} User-friendly error message
 */
export const getFirestoreErrorMessage = (error) => {
  return getErrorMessage(error);
};

/**
 * Handle Firestore error with logging and user notification
 * Now delegates to the global error handler
 *
 * @param {Error} error - Firebase error object
 * @param {Object} context - Context information for logging
 * @param {Function} notifyUser - Function to notify user (e.g., toast.showError)
 * @returns {string} User-friendly error message
 */
export const handleFirestoreError = (error, context = {}, notifyUser = null) => {
  // Use global error handler for consistent error handling
  const userMessage = globalHandleFirebaseError(error, { ...context, source: 'Firestore' });

  // Notify user if function provided
  if (notifyUser && typeof notifyUser === 'function') {
    notifyUser('오류', userMessage);
  }

  return userMessage;
};

/**
 * Check if error is a permission-denied error
 * Now delegates to the global error handler
 *
 * @param {Error} error - Firebase error object
 * @returns {boolean} True if permission-denied error
 */
export const isPermissionDenied = (error) => {
  return globalIsPermissionError(error);
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
