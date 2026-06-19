/* eslint-disable no-console */
/**
 * Lightweight Logger
 *
 * debug/info/warn are emitted only in development (__DEV__), so production
 * bundles stay quiet. `error` is also dev-only here; production error
 * telemetry is handled separately via reportCrashlyticsError
 * (see services/notification/notificationService).
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.debug('value', x);
 *
 * @module utils/logger
 */

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export const logger = {
  debug: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  },
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    if (isDev) {
      console.error(...args);
    }
  },
};

export default logger;
