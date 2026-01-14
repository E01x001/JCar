/* eslint-disable */
/**
 * Firebase Messaging (FCM) Mock
 *
 * Task #100: Comprehensive Firebase mocking for testing
 */

const mockMessagingInstance = {
  requestPermission: jest.fn(() => Promise.resolve(1)), // AuthorizationStatus.AUTHORIZED
  getToken: jest.fn(() => Promise.resolve('mock-fcm-token')),
  deleteToken: jest.fn(() => Promise.resolve()),
  onMessage: jest.fn((handler) => {
    return jest.fn(); // Unsubscribe function
  }),
  onTokenRefresh: jest.fn((handler) => {
    return jest.fn(); // Unsubscribe function
  }),
  setBackgroundMessageHandler: jest.fn((handler) => {}),
  onNotificationOpenedApp: jest.fn((handler) => {
    return jest.fn(); // Unsubscribe function
  }),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
  hasPermission: jest.fn(() => Promise.resolve(1)),
  subscribeToTopic: jest.fn(() => Promise.resolve()),
  unsubscribeFromTopic: jest.fn(() => Promise.resolve()),
  setAutoInitEnabled: jest.fn(() => Promise.resolve()),
  isAutoInitEnabled: jest.fn(() => Promise.resolve(true)),
  sendMessage: jest.fn(() => Promise.resolve()),
  registerDeviceForRemoteMessages: jest.fn(() => Promise.resolve()),
  unregisterDeviceForRemoteMessages: jest.fn(() => Promise.resolve()),
  isDeviceRegisteredForRemoteMessages: jest.fn(() => Promise.resolve(true)),
  getAPNSToken: jest.fn(() => Promise.resolve(null)),
  setAPNSToken: jest.fn(() => Promise.resolve()),
};

export const AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

export const getMessaging = jest.fn(() => mockMessagingInstance);
export const requestPermission = jest.fn(() => Promise.resolve(AuthorizationStatus.AUTHORIZED));
export const getToken = jest.fn(() => Promise.resolve('mock-fcm-token'));
export const deleteToken = jest.fn(() => Promise.resolve());
export const onMessage = jest.fn((messaging, handler) => jest.fn());
export const getInitialNotification = jest.fn(() => Promise.resolve(null));
export const onNotificationOpenedApp = jest.fn((messaging, handler) => jest.fn());

const messaging = jest.fn(() => mockMessagingInstance);
export default messaging;
