/* eslint-disable no-console */
/**
 * Firestore Listener Helper
 *
 * Task 59: Provides robust error handling and retry logic for Firestore listeners
 * Implements exponential backoff, connection state tracking, and error-specific handling
 *
 * Task 62.3: Migrated to React Native Firebase Modular API (v22+)
 */

import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { onSnapshot } from '@react-native-firebase/firestore';

/**
 * Configuration for retry behavior
 */
const RETRY_CONFIG = {
  MAX_RETRIES: 5,
  INITIAL_DELAY_MS: 1000, // 1 second
  MAX_DELAY_MS: 32000, // 32 seconds
  BACKOFF_MULTIPLIER: 2,
};

/**
 * Error codes that should NOT trigger retry
 */
const NON_RETRYABLE_ERRORS = [
  'permission-denied',
  'unauthenticated',
  'invalid-argument',
  'not-found',
];

/**
 * Calculate exponential backoff delay
 * Task 59: Returns delay in milliseconds for next retry attempt
 *
 * @param {number} attempt - Current retry attempt (0-indexed)
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt) {
  const delay = RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt);
  return Math.min(delay, RETRY_CONFIG.MAX_DELAY_MS);
}

/**
 * Check if error should trigger retry
 * Task 59: Determines retry eligibility based on error code
 *
 * @param {Error} error - Firebase error object
 * @returns {boolean} True if error is retryable
 */
function isRetryableError(error) {
  if (!error || !error.code) {
    return true; // Retry unknown errors
  }

  // Don't retry permission or authentication errors
  if (NON_RETRYABLE_ERRORS.includes(error.code)) {
    return false;
  }

  // Retry network-related errors
  if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
    return true;
  }

  // Default: retry for safety
  return true;
}

/**
 * Create a resilient Firestore listener with automatic retry
 * Task 59: Wraps onSnapshot with exponential backoff and error handling
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.query - Function that returns Firestore query
 * @param {Function} options.onSnapshot - Callback for successful snapshots
 * @param {Function} options.onError - Error handler
 * @param {Object} options.connectionContext - Connection context from useConnection
 * @param {string} [options.listenerName] - Name for logging purposes
 * @returns {Function} Unsubscribe function
 */
export function createFirestoreListener({
  query,
  onSnapshot: onSnapshotCallback,
  onError,
  connectionContext,
  listenerName = 'Firestore Listener',
}) {
  let unsubscribe = null;
  let retryTimer = null;
  let currentAttempt = 0;
  let isActive = true;

  /**
   * Cleanup function
   * Task 59: Clears timeouts and unsubscribes from listener
   */
  function cleanup() {
    isActive = false;

    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }

    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }

  /**
   * Handle snapshot success
   * Task 59: Process snapshot and detect offline mode
   */
  function handleSnapshot(snapshot) {
    if (!isActive) {return;}

    // Task 59: Check if data is from cache (offline mode)
    const isFromCache = snapshot.metadata && snapshot.metadata.fromCache;

    if (isFromCache && !connectionContext.isOfflineMode) {
      console.log(`📦 ${listenerName}: Loading from cache (offline mode)`);
      connectionContext.setOfflineMode(true);
    }

    if (!isFromCache && connectionContext.isOfflineMode) {
      console.log(`📡 ${listenerName}: Back online - receiving live data`);
      connectionContext.resetConnection();
    }

    // Reset retry state on successful snapshot
    if (currentAttempt > 0) {
      console.log(`✅ ${listenerName}: Reconnected successfully`);
      currentAttempt = 0;
      connectionContext.resetConnection();
    }

    // Call user's snapshot handler
    onSnapshotCallback(snapshot);
  }

  /**
   * Handle snapshot error with retry logic
   * Task 59: Implements exponential backoff and error-specific handling
   */
  function handleError(error) {
    if (!isActive) {return;}

    console.error(`❌ ${listenerName}: Error occurred`, error.code, error.message);

    // Log to Crashlytics
    reportCrashlyticsError(error);
    logCrashlyticsMessage(`${listenerName} error: ${error.code}`);

    // Update connection context with error
    connectionContext.setLastError(error);

    // Handle non-retryable errors
    if (!isRetryableError(error)) {
      console.error(`🚫 ${listenerName}: Non-retryable error - ${error.code}`);
      connectionContext.setReconnecting(false);

      // Call user's error handler
      if (onError) {
        onError(error);
      }

      return;
    }

    // Check if max retries exceeded
    if (currentAttempt >= RETRY_CONFIG.MAX_RETRIES) {
      console.error(`🚫 ${listenerName}: Max retries (${RETRY_CONFIG.MAX_RETRIES}) exceeded`);
      connectionContext.setReconnecting(false);

      // Call user's error handler
      if (onError) {
        onError(new Error(`${listenerName} failed after ${RETRY_CONFIG.MAX_RETRIES} retries: ${error.message}`));
      }

      return;
    }

    // Calculate delay and schedule retry
    const delay = calculateBackoffDelay(currentAttempt);
    currentAttempt++;

    console.log(`🔄 ${listenerName}: Retry attempt ${currentAttempt}/${RETRY_CONFIG.MAX_RETRIES} in ${delay}ms`);

    connectionContext.setReconnecting(true);
    connectionContext.setRetryAttempt(currentAttempt);

    // Schedule retry
    retryTimer = setTimeout(() => {
      if (!isActive) {return;}

      console.log(`🔄 ${listenerName}: Retrying now...`);
      subscribeToQuery();
    }, delay);
  }

  /**
   * Subscribe to the query
   * Task 59: Creates the actual Firestore listener
   * Task 62.3: Migrated to modular onSnapshot
   */
  function subscribeToQuery() {
    try {
      // Unsubscribe from previous listener if exists
      if (unsubscribe) {
        unsubscribe();
      }

      // Get query and attach listener
      const firestoreQuery = query();

      // Task 62.3: Use modular onSnapshot(query, callback, errorCallback)
      unsubscribe = onSnapshot(
        firestoreQuery,
        handleSnapshot,
        handleError
      );
    } catch (error) {
      console.error(`❌ ${listenerName}: Failed to create listener`, error);
      handleError(error);
    }
  }

  // Initial subscription
  subscribeToQuery();

  // Return cleanup function
  return cleanup;
}

/**
 * Create a simple Firestore listener without retry (for backward compatibility)
 * Task 59: Lightweight wrapper for simple use cases
 * Task 62.3: Migrated to modular onSnapshot API
 *
 * @param {Function} query - Function that returns Firestore query
 * @param {Function} onSnapshotCallback - Snapshot callback
 * @param {Function} [onError] - Error callback
 * @returns {Function} Unsubscribe function
 */
export function createSimpleListener(query, onSnapshotCallback, onError) {
  const firestoreQuery = query();

  // Task 62.3: Use modular onSnapshot(query, callback, errorCallback)
  return onSnapshot(
    firestoreQuery,
    (snapshot) => {
      onSnapshotCallback(snapshot);
    },
    (error) => {
      console.error('Firestore listener error:', error);
      reportCrashlyticsError(error);

      if (onError) {
        onError(error);
      }
    }
  );
}

export default createFirestoreListener;
