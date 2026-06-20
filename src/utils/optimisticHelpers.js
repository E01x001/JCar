import { logger } from './logger';
/**
 * Optimistic UI Helper Functions
 *
 * Task 106.2: Utilities for implementing optimistic UI updates
 *
 * These helpers assist with managing temporary IDs and handling
 * optimistic data in offline-first patterns.
 */

/**
 * Generate a temporary unique ID for optimistic updates
 * @param {string} prefix - Prefix for the ID (e.g., 'temp_vehicle', 'temp_consultation')
 * @returns {string} Temporary unique ID
 */
export const generateTempId = (prefix = 'temp') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * Check if an item is optimistic (has temporary ID)
 * @param {Object} item - Item to check
 * @returns {boolean} True if item is optimistic
 */
export const isOptimistic = (item) => {
  return item?._optimistic === true || item?.id?.startsWith('temp_');
};

/**
 * Remove optimistic flags from item
 * Useful for cleaning up data before display
 * @param {Object} item - Item to clean
 * @returns {Object} Cleaned item without optimistic flags
 */
export const cleanOptimisticData = (item) => {
  if (!item) {
    return item;
  }

  // eslint-disable-next-line no-unused-vars
  const {_optimistic, _tempId, ...cleaned} = item;
  return cleaned;
};

/**
 * Execute an optimistic update with error handling
 *
 * @param {Object} options - Configuration object
 * @param {Function} options.optimisticFn - Function to call immediately for optimistic update
 * @param {Function} options.serverFn - Async function for server write (returns Promise)
 * @param {Function} options.onSuccess - Callback on successful server write
 * @param {Function} options.onError - Callback on failed server write (receives error)
 * @param {Function} options.revertFn - Function to revert optimistic update on error
 * @returns {Promise<any>} Promise that resolves with server response or rejects with error
 */
export const executeOptimisticUpdate = async ({
  optimisticFn,
  serverFn,
  onSuccess,
  onError,
  revertFn,
}) => {
  // Execute optimistic update immediately
  if (optimisticFn) {
    optimisticFn();
  }

  try {
    // Execute server write (don't await to maintain responsiveness)
    const result = await serverFn();

    // Call success callback
    if (onSuccess) {
      onSuccess(result);
    }

    return result;
  } catch (error) {
    logger.error('❌ Server write failed:', error);

    // Revert optimistic update
    if (revertFn) {
      revertFn();
    }

    // Call error callback
    if (onError) {
      onError(error);
    }

    throw error;
  }
};

/**
 * Create a wrapped Firestore write function that doesn't block on await
 *
 * This is critical for offline mode - awaiting Firestore writes will block
 * until the server confirms, defeating the purpose of optimistic UI.
 *
 * @param {Function} writeFn - Async Firestore write function
 * @returns {Function} Wrapped function that returns a promise but doesn't require await
 */
export const nonBlockingWrite = (writeFn) => {
  return (...args) => {
    // Start the write but don't block on it
    const writePromise = writeFn(...args);

    // Return the promise for error handling, but caller shouldn't await
    return writePromise;
  };
};
