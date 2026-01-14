
/**
 * Firebase Analytics Mock
 *
 * Task #100: Comprehensive Firebase mocking for testing
 */

const mockAnalyticsInstance = {
  logEvent: jest.fn((_eventName, _params) => Promise.resolve()),
  setUserId: jest.fn((_userId) => Promise.resolve()),
  setUserProperty: jest.fn((_name, _value) => Promise.resolve()),
  setUserProperties: jest.fn((_properties) => Promise.resolve()),
  setAnalyticsCollectionEnabled: jest.fn((_enabled) => Promise.resolve()),
  setSessionTimeoutDuration: jest.fn((_milliseconds) => Promise.resolve()),
  resetAnalyticsData: jest.fn(() => Promise.resolve()),
  setDefaultEventParameters: jest.fn((_params) => Promise.resolve()),
  logScreenView: jest.fn((_params) => Promise.resolve()),
  logLogin: jest.fn((_params) => Promise.resolve()),
  logSignUp: jest.fn((_params) => Promise.resolve()),
  logPurchase: jest.fn((_params) => Promise.resolve()),
  logSelectContent: jest.fn((_params) => Promise.resolve()),
  logShare: jest.fn((_params) => Promise.resolve()),
};

export const getAnalytics = jest.fn(() => mockAnalyticsInstance);
export const logEvent = jest.fn((_analytics, _eventName, _params) => Promise.resolve());
export const setUserId = jest.fn((_analytics, _userId) => Promise.resolve());
export const setUserProperties = jest.fn((_analytics, _properties) => Promise.resolve());
export const setAnalyticsCollectionEnabled = jest.fn((_analytics, _enabled) => Promise.resolve());

const analytics = jest.fn(() => mockAnalyticsInstance);
export default analytics;
