/**
 * Jest Setup File for React Native
 *
 * Task #100: Enhanced testing infrastructure
 */

// React Native Testing Library matchers
// Note: @testing-library/jest-native is deprecated
// Built-in matchers are automatically available in @testing-library/react-native v12.4+
// No explicit import needed

// Mock Firebase modules
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    apps: [],
  })),
}));

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    currentUser: null,
  })),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    collection: jest.fn(),
    doc: jest.fn(),
  })),
}));

jest.mock('@react-native-firebase/storage', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    ref: jest.fn(),
  })),
}));

jest.mock('@react-native-firebase/crashlytics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    recordError: jest.fn(),
    log: jest.fn(),
    setAttribute: jest.fn(),
  })),
}));

// 앱은 모듈러 API(getMessaging(m), getToken(m) ...)만 쓴다.
// 예전 네임스페이스 형태(default())만 있던 목은 named export가 없어
// 실제 코드 경로를 검증할 수 없었다 — 둘 다 제공한다.
jest.mock('@react-native-firebase/messaging', () => {
  const instance = {
    requestPermission: jest.fn(() => Promise.resolve(1)),
    getToken: jest.fn(() => Promise.resolve('mock-fcm-token')),
    onMessage: jest.fn(),
    onTokenRefresh: jest.fn(),
    setBackgroundMessageHandler: jest.fn(),
    onNotificationOpenedApp: jest.fn(),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
  };
  return {
    __esModule: true,
    default: jest.fn(() => instance),
    getMessaging: jest.fn(() => instance),
    getToken: jest.fn(() => Promise.resolve('mock-fcm-token')),
    requestPermission: jest.fn(() => Promise.resolve(1)),
    onTokenRefresh: jest.fn(() => jest.fn()),
    onMessage: jest.fn(() => jest.fn()),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    setBackgroundMessageHandler: jest.fn(),
    deleteToken: jest.fn(() => Promise.resolve()),
    AuthorizationStatus: {
      AUTHORIZED: 1,
      DENIED: 0,
      NOT_DETERMINED: -1,
      PROVISIONAL: 2,
    },
  };
});

jest.mock('@react-native-firebase/functions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    httpsCallable: jest.fn(() => jest.fn(() => Promise.resolve({ data: {} }))),
  })),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn(),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: jest.fn(),
}));

// Mock React Native Vector Icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock PermissionsAndroid
jest.mock('react-native/Libraries/PermissionsAndroid/PermissionsAndroid', () => ({
  PERMISSIONS: {
    POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    NEVER_ASK_AGAIN: 'never_ask_again',
  },
  request: jest.fn(() => Promise.resolve('granted')),
  check: jest.fn(() => Promise.resolve(true)),
}));

// Global test timeout
jest.setTimeout(10000);

// Suppress console errors in tests (optional)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};
