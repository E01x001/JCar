/**
 * Firebase 네이티브 모듈 단일 창구 (네이티브 구현).
 *
 * RNFirebase는 웹 구현이 없어, 웹 번들에서 모듈을 로드하는 순간 크래시한다.
 * 호출부가 `@react-native-firebase/*`를 직접 import하지 않고 이 모듈만 쓰면,
 * Metro가 웹에서는 firebaseNative.web.js(무동작 스텁)로 자동 대체한다.
 *
 * FCM·Crashlytics·Analytics는 Supabase 이전 후에도 Firebase에 남긴다(하이브리드).
 */
import {
  getMessaging,
  getToken,
  requestPermission,
  onTokenRefresh,
  onMessage,
  getInitialNotification,
  onNotificationOpenedApp,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import {
  getCrashlytics,
  recordError,
  log,
  setAttribute,
} from '@react-native-firebase/crashlytics';
import analytics from '@react-native-firebase/analytics';

export const isSupported = true;

export {
  getMessaging,
  getToken,
  requestPermission,
  onTokenRefresh,
  onMessage,
  getInitialNotification,
  onNotificationOpenedApp,
  setBackgroundMessageHandler,
  getCrashlytics,
  recordError,
  log,
  setAttribute,
  analytics,
};
