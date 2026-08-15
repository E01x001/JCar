/**
 * Firebase 네이티브 모듈 단일 창구 (웹 스텁).
 *
 * RNFirebase에는 웹 구현이 없다. 웹 번들에서는 Metro가 이 파일을 대신 선택해
 * 모든 호출을 무동작으로 처리한다 — 푸시/크래시리포팅은 네이티브 앱 전용 기능이고,
 * 웹에서는 없어도 나머지 화면이 정상 동작해야 한다.
 *
 * 웹에서도 푸시가 필요해지면 firebase JS SDK(웹용)로 이 파일만 채우면 된다.
 */
const noop = () => {};
const unsubscribe = () => noop;

export const isSupported = false;

export const getMessaging = () => null;
export const getToken = async () => null;
export const requestPermission = async () => 0;
export const onTokenRefresh = unsubscribe;
export const onMessage = unsubscribe;
export const getInitialNotification = async () => null;
export const onNotificationOpenedApp = unsubscribe;
export const setBackgroundMessageHandler = noop;

export const getCrashlytics = () => null;
export const recordError = noop;
export const log = noop;
export const setAttribute = noop;

// analytics()는 체이닝 호출(analytics().logEvent(...))을 받으므로 프록시로 흡수한다
export const analytics = () =>
  new Proxy({}, { get: () => async () => undefined });
