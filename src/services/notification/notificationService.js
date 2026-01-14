/**
 * Notification Service
 *
 * Handles error reporting and logging including:
 * - Crashlytics error reporting
 * - Crashlytics logging
 *
 * Task #88: Modular service refactoring
 */

import { getCrashlytics, recordError, log } from '@react-native-firebase/crashlytics';

/**
 * Get crashlytics instance helper
 * @returns {Object} Crashlytics instance
 */
const getCrashlyticsInstance = () => getCrashlytics();

/**
 * Report an error to Crashlytics
 * @param {Error} error - The error object to report
 */
export const reportCrashlyticsError = (error) => {
  try {
    const crashlyticsInstance = getCrashlyticsInstance();
    recordError(crashlyticsInstance, error);
  } catch (err) {
    console.error('Failed to report error to Crashlytics:', err);
  }
};

/**
 * Log a message to Crashlytics
 * @param {string} message - The message to log
 */
export const logCrashlyticsMessage = (message) => {
  try {
    const crashlyticsInstance = getCrashlyticsInstance();
    log(crashlyticsInstance, message);
  } catch (err) {
    console.error('Failed to log message to Crashlytics:', err);
  }
};
