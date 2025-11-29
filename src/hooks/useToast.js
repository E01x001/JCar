/**
 * useToast Hook
 *
 * Provides convenient methods to show toast messages throughout the app.
 * Wraps react-native-toast-message with custom configuration.
 */

import Toast from 'react-native-toast-message';

/**
 * Default toast configuration
 */
const DEFAULT_DURATION = 3000; // 3 seconds
const DEFAULT_POSITION = 'top'; // 'top' | 'bottom'

/**
 * useToast Hook
 *
 * @returns {object} Toast utility functions
 */
export const useToast = () => {
  /**
   * Show success toast
   *
   * @param {string} message - Primary message (text1)
   * @param {string} [description] - Optional secondary message (text2)
   * @param {number} [duration] - Duration in milliseconds
   */
  const showSuccess = (message, description = '', duration = DEFAULT_DURATION) => {
    Toast.show({
      type: 'success',
      text1: message,
      text2: description,
      position: DEFAULT_POSITION,
      visibilityTime: duration,
    });
  };

  /**
   * Show error/danger toast
   *
   * @param {string} message - Primary message (text1)
   * @param {string} [description] - Optional secondary message (text2)
   * @param {number} [duration] - Duration in milliseconds
   */
  const showError = (message, description = '', duration = DEFAULT_DURATION) => {
    Toast.show({
      type: 'danger',
      text1: message,
      text2: description,
      position: DEFAULT_POSITION,
      visibilityTime: duration,
    });
  };

  /**
   * Show info toast
   *
   * @param {string} message - Primary message (text1)
   * @param {string} [description] - Optional secondary message (text2)
   * @param {number} [duration] - Duration in milliseconds
   */
  const showInfo = (message, description = '', duration = DEFAULT_DURATION) => {
    Toast.show({
      type: 'info',
      text1: message,
      text2: description,
      position: DEFAULT_POSITION,
      visibilityTime: duration,
    });
  };

  /**
   * Show warning toast
   *
   * @param {string} message - Primary message (text1)
   * @param {string} [description] - Optional secondary message (text2)
   * @param {number} [duration] - Duration in milliseconds
   */
  const showWarning = (message, description = '', duration = DEFAULT_DURATION) => {
    Toast.show({
      type: 'warning',
      text1: message,
      text2: description,
      position: DEFAULT_POSITION,
      visibilityTime: duration,
    });
  };

  /**
   * Hide currently visible toast
   */
  const hide = () => {
    Toast.hide();
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    hide,
  };
};

export default useToast;
