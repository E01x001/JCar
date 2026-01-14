/* eslint-disable */
/**
 * Firebase Crashlytics Mock
 *
 * Task #100: Comprehensive Firebase mocking for testing
 */

const mockCrashlyticsInstance = {
  recordError: jest.fn((error) => Promise.resolve()),
  log: jest.fn((message) => Promise.resolve()),
  setAttribute: jest.fn((key, value) => Promise.resolve()),
  setAttributes: jest.fn((attributes) => Promise.resolve()),
  setUserId: jest.fn((userId) => Promise.resolve()),
  setCrashlyticsCollectionEnabled: jest.fn((enabled) => Promise.resolve()),
  isCrashlyticsCollectionEnabled: jest.fn(() => Promise.resolve(true)),
  checkForUnsentReports: jest.fn(() => Promise.resolve(false)),
  deleteUnsentReports: jest.fn(() => Promise.resolve()),
  didCrashOnPreviousExecution: jest.fn(() => Promise.resolve(false)),
  sendUnsentReports: jest.fn(() => Promise.resolve()),
  crash: jest.fn(), // For testing crash reporting
};

export const getCrashlytics = jest.fn(() => mockCrashlyticsInstance);
export const recordError = jest.fn((crashlytics, error) => Promise.resolve());
export const log = jest.fn((crashlytics, message) => Promise.resolve());
export const setAttribute = jest.fn((crashlytics, key, value) => Promise.resolve());
export const setUserId = jest.fn((crashlytics, userId) => Promise.resolve());

const crashlytics = jest.fn(() => mockCrashlyticsInstance);
export default crashlytics;
