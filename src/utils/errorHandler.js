/**
 * Global Error Handler for Firebase
 *
 * Centralized error handling for all Firebase services (Auth, Firestore, Storage, Functions, etc.)
 * Maps Firebase error codes to user-friendly Korean messages and integrates with Crashlytics.
 *
 * Task 92: Implement Global Error Handler
 *
 * Best practices from:
 * - https://dev.to/ajmal_hasan/handling-app-crashes-logging-errors-to-firebase-in-react-native-2h31
 * - https://github.com/invertase/react-native-firebase-docs/blob/master/docs/auth/reference/Error.md
 * - https://rnfirebase.io/reference/functions/httpserror
 */

import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';

/**
 * Comprehensive Firebase error code to Korean message mapping
 *
 * Covers:
 * - Authentication errors (auth/*)
 * - Firestore errors (permission-denied, unavailable, etc.)
 * - Storage errors (storage/*)
 * - Functions errors (functions/*)
 * - Network errors
 */
export const ERROR_MESSAGES = {
  // ============================================
  // Firebase Authentication Errors (auth/*)
  // ============================================
  'auth/admin-restricted-operation': '관리자만 수행할 수 있는 작업입니다.',
  'auth/argument-error': '잘못된 요청입니다. 입력값을 확인해주세요.',
  'auth/app-not-authorized': '앱이 Firebase를 사용할 권한이 없습니다.',
  'auth/app-not-installed': '앱이 설치되지 않았습니다.',
  'auth/captcha-check-failed': '보안 인증에 실패했습니다. 다시 시도해주세요.',
  'auth/code-expired': '인증 코드가 만료되었습니다. 다시 시도해주세요.',
  'auth/cordova-not-ready': '앱이 준비되지 않았습니다.',
  'auth/cors-unsupported': '브라우저가 지원되지 않습니다.',
  'auth/credential-already-in-use': '이미 다른 계정에서 사용중인 인증 정보입니다.',
  'auth/custom-token-mismatch': '인증 토큰이 일치하지 않습니다.',
  'auth/requires-recent-login': '보안을 위해 다시 로그인해주세요.',
  'auth/dependent-sdk-initialized-before-auth': '초기화 오류가 발생했습니다.',
  'auth/dynamic-link-not-activated': '동적 링크가 활성화되지 않았습니다.',
  'auth/email-change-needs-verification': '이메일 변경을 위해 인증이 필요합니다.',
  'auth/email-already-in-use': '이미 사용중인 이메일입니다.',
  'auth/emulator-config-failed': '에뮬레이터 설정에 실패했습니다.',
  'auth/expired-action-code': '인증 코드가 만료되었습니다.',
  'auth/cancelled-popup-request': '팝업이 취소되었습니다.',
  'auth/internal-error': '내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  'auth/invalid-api-key': 'API 키가 올바르지 않습니다.',
  'auth/invalid-app-credential': '앱 인증 정보가 올바르지 않습니다.',
  'auth/invalid-app-id': '앱 ID가 올바르지 않습니다.',
  'auth/invalid-user-token': '사용자 인증이 만료되었습니다. 다시 로그인해주세요.',
  'auth/invalid-auth-event': '인증 이벤트가 올바르지 않습니다.',
  'auth/invalid-cert-hash': '인증서 해시가 올바르지 않습니다.',
  'auth/invalid-verification-code': '인증 코드가 올바르지 않습니다.',
  'auth/invalid-continue-uri': '계속 URL이 올바르지 않습니다.',
  'auth/invalid-cordova-configuration': 'Cordova 설정이 올바르지 않습니다.',
  'auth/invalid-custom-token': '사용자 정의 토큰이 올바르지 않습니다.',
  'auth/invalid-dynamic-link-domain': '동적 링크 도메인이 올바르지 않습니다.',
  'auth/invalid-email': '이메일 주소가 올바르지 않습니다.',
  'auth/invalid-emulator-scheme': '에뮬레이터 스키마가 올바르지 않습니다.',
  'auth/invalid-credential': '인증 정보가 올바르지 않습니다.',
  'auth/invalid-message-payload': '메시지 페이로드가 올바르지 않습니다.',
  'auth/invalid-multi-factor-session': '다중 인증 세션이 올바르지 않습니다.',
  'auth/invalid-oauth-client-id': 'OAuth 클라이언트 ID가 올바르지 않습니다.',
  'auth/invalid-oauth-provider': 'OAuth 제공자가 올바르지 않습니다.',
  'auth/invalid-action-code': '인증 코드가 올바르지 않습니다.',
  'auth/unauthorized-domain': '승인되지 않은 도메인입니다.',
  'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
  'auth/invalid-persistence-type': '저장 유형이 올바르지 않습니다.',
  'auth/invalid-phone-number': '전화번호 형식이 올바르지 않습니다.',
  'auth/invalid-provider-id': '제공자 ID가 올바르지 않습니다.',
  'auth/invalid-recipient-email': '수신자 이메일이 올바르지 않습니다.',
  'auth/invalid-sender': '발신자가 올바르지 않습니다.',
  'auth/invalid-verification-id': '인증 ID가 올바르지 않습니다.',
  'auth/invalid-tenant-id': '테넌트 ID가 올바르지 않습니다.',
  'auth/multi-factor-info-not-found': '다중 인증 정보를 찾을 수 없습니다.',
  'auth/multi-factor-auth-required': '다중 인증이 필요합니다.',
  'auth/missing-android-pkg-name': 'Android 패키지 이름이 필요합니다.',
  'auth/missing-app-credential': '앱 인증 정보가 필요합니다.',
  'auth/auth-domain-config-required': '인증 도메인 설정이 필요합니다.',
  'auth/missing-verification-code': '인증 코드를 입력해주세요.',
  'auth/missing-continue-uri': '계속 URL이 필요합니다.',
  'auth/missing-iframe-start': 'iframe 시작이 누락되었습니다.',
  'auth/missing-ios-bundle-id': 'iOS 번들 ID가 필요합니다.',
  'auth/missing-or-invalid-nonce': 'nonce가 없거나 올바르지 않습니다.',
  'auth/missing-multi-factor-info': '다중 인증 정보가 필요합니다.',
  'auth/missing-multi-factor-session': '다중 인증 세션이 필요합니다.',
  'auth/missing-phone-number': '전화번호를 입력해주세요.',
  'auth/missing-verification-id': '인증 ID가 필요합니다.',
  'auth/app-deleted': '앱이 삭제되었습니다.',
  'auth/account-exists-with-different-credential': '다른 인증 방법으로 가입된 계정입니다.',
  'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
  'auth/null-user': '사용자 정보가 없습니다.',
  'auth/no-auth-event': '인증 이벤트가 없습니다.',
  'auth/no-such-provider': '해당 인증 제공자가 존재하지 않습니다.',
  'auth/operation-not-allowed': '허용되지 않은 작업입니다.',
  'auth/operation-not-supported-in-this-environment': '이 환경에서는 지원되지 않는 작업입니다.',
  'auth/popup-blocked': '팝업이 차단되었습니다. 팝업 차단을 해제해주세요.',
  'auth/popup-closed-by-user': '팝업이 닫혔습니다.',
  'auth/provider-already-linked': '이미 연결된 제공자입니다.',
  'auth/quota-exceeded': '할당량을 초과했습니다.',
  'auth/redirect-cancelled-by-user': '리디렉션이 취소되었습니다.',
  'auth/redirect-operation-pending': '리디렉션 작업이 진행중입니다.',
  'auth/rejected-credential': '인증 정보가 거부되었습니다.',
  'auth/second-factor-already-in-use': '이미 사용중인 2차 인증 수단입니다.',
  'auth/maximum-second-factor-count-exceeded': '2차 인증 수단 개수를 초과했습니다.',
  'auth/tenant-id-mismatch': '테넌트 ID가 일치하지 않습니다.',
  'auth/timeout': '요청 시간이 초과되었습니다.',
  'auth/user-token-expired': '사용자 토큰이 만료되었습니다. 다시 로그인해주세요.',
  'auth/too-many-requests': '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  'auth/unauthorized-continue-uri': '승인되지 않은 계속 URI입니다.',
  'auth/unsupported-first-factor': '지원되지 않는 1차 인증 수단입니다.',
  'auth/unsupported-persistence-type': '지원되지 않는 저장 유형입니다.',
  'auth/unsupported-tenant-operation': '지원되지 않는 테넌트 작업입니다.',
  'auth/unverified-email': '이메일 인증이 필요합니다.',
  'auth/user-cancelled': '사용자가 취소했습니다.',
  'auth/user-not-found': '사용자를 찾을 수 없습니다. 회원가입을 먼저 진행해주세요.',
  'auth/user-disabled': '비활성화된 계정입니다. 관리자에게 문의해주세요.',
  'auth/user-mismatch': '사용자 정보가 일치하지 않습니다.',
  'auth/user-signed-out': '로그아웃되었습니다.',
  'auth/weak-password': '비밀번호가 너무 약합니다. 더 강력한 비밀번호를 사용해주세요.',
  'auth/web-storage-unsupported': '웹 저장소가 지원되지 않습니다.',
  'auth/already-initialized': '이미 초기화되었습니다.',
  'auth/recaptcha-not-enabled': 'reCAPTCHA가 활성화되지 않았습니다.',
  'auth/missing-recaptcha-token': 'reCAPTCHA 토큰이 필요합니다.',
  'auth/invalid-recaptcha-token': 'reCAPTCHA 토큰이 올바르지 않습니다.',
  'auth/invalid-recaptcha-action': 'reCAPTCHA 액션이 올바르지 않습니다.',
  'auth/missing-client-type': '클라이언트 유형이 필요합니다.',
  'auth/missing-recaptcha-version': 'reCAPTCHA 버전이 필요합니다.',
  'auth/invalid-recaptcha-version': 'reCAPTCHA 버전이 올바르지 않습니다.',
  'auth/invalid-req-type': '요청 유형이 올바르지 않습니다.',

  // ============================================
  // Firestore Errors
  // ============================================
  'permission-denied': '접근 권한이 없습니다. 이 작업을 수행할 권한이 없습니다.',
  'unauthenticated': '로그인이 필요합니다. 다시 로그인해주세요.',
  'not-found': '요청한 데이터를 찾을 수 없습니다.',
  'already-exists': '이미 존재하는 데이터입니다.',
  'resource-exhausted': '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  'failed-precondition': '작업을 수행할 수 없는 상태입니다.',
  'aborted': '작업이 중단되었습니다. 다시 시도해주세요.',
  'out-of-range': '유효하지 않은 범위입니다.',
  'unimplemented': '지원하지 않는 기능입니다.',
  'internal': '서버 내부 오류가 발생했습니다.',
  'unavailable': '서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'data-loss': '데이터 손실이 발생했습니다.',
  'cancelled': '작업이 취소되었습니다.',
  'unknown': '알 수 없는 오류가 발생했습니다.',
  'invalid-argument': '잘못된 인수입니다.',
  'deadline-exceeded': '요청 시간이 초과되었습니다.',

  // ============================================
  // Storage Errors (storage/*)
  // ============================================
  'storage/unknown': '알 수 없는 저장소 오류가 발생했습니다.',
  'storage/object-not-found': '파일을 찾을 수 없습니다.',
  'storage/bucket-not-found': '저장소를 찾을 수 없습니다.',
  'storage/project-not-found': '프로젝트를 찾을 수 없습니다.',
  'storage/quota-exceeded': '저장 공간이 부족합니다.',
  'storage/unauthenticated': '로그인이 필요합니다.',
  'storage/unauthorized': '파일에 접근할 권한이 없습니다.',
  'storage/retry-limit-exceeded': '최대 재시도 횟수를 초과했습니다.',
  'storage/invalid-checksum': '파일이 손상되었습니다. 다시 업로드해주세요.',
  'storage/canceled': '업로드가 취소되었습니다.',
  'storage/invalid-event-name': '잘못된 이벤트 이름입니다.',
  'storage/invalid-url': '잘못된 URL입니다.',
  'storage/invalid-argument': '잘못된 인수입니다.',
  'storage/no-default-bucket': '기본 저장소가 설정되지 않았습니다.',
  'storage/cannot-slice-blob': '파일을 처리할 수 없습니다.',
  'storage/server-file-wrong-size': '서버의 파일 크기가 일치하지 않습니다.',

  // ============================================
  // Functions Errors (functions/*)
  // ============================================
  'functions/cancelled': '함수 실행이 취소되었습니다.',
  'functions/unknown': '알 수 없는 오류가 발생했습니다.',
  'functions/invalid-argument': '잘못된 요청입니다.',
  'functions/deadline-exceeded': '요청 시간이 초과되었습니다.',
  'functions/not-found': '요청한 함수를 찾을 수 없습니다.',
  'functions/already-exists': '이미 존재하는 리소스입니다.',
  'functions/permission-denied': '권한이 없습니다.',
  'functions/resource-exhausted': '리소스가 부족합니다.',
  'functions/failed-precondition': '작업을 수행할 수 없는 상태입니다.',
  'functions/aborted': '작업이 중단되었습니다.',
  'functions/out-of-range': '범위를 벗어났습니다.',
  'functions/unimplemented': '구현되지 않은 기능입니다.',
  'functions/internal': '서버 내부 오류가 발생했습니다.',
  'functions/unavailable': '서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
  'functions/data-loss': '데이터 손실이 발생했습니다.',
  'functions/unauthenticated': '인증이 필요합니다.',

  // ============================================
  // Network Errors
  // ============================================
  'network-request-failed': '네트워크 연결을 확인해주세요.',
  'timeout': '요청 시간이 초과되었습니다. 다시 시도해주세요.',

  // Default fallback message
  default: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

/**
 * Get user-friendly Korean error message from Firebase error
 *
 * @param {Error} error - Firebase error object
 * @returns {string} User-friendly Korean error message
 */
export const getErrorMessage = (error) => {
  if (!error) {
    return ERROR_MESSAGES.default;
  }

  // Extract error code from various error formats
  const errorCode = error.code || error.errorCode || '';

  // Try exact match first
  if (ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode];
  }

  // Try without prefix (e.g., 'auth/user-not-found' -> 'user-not-found')
  const codeWithoutPrefix = errorCode.split('/')[1];
  if (codeWithoutPrefix && ERROR_MESSAGES[codeWithoutPrefix]) {
    return ERROR_MESSAGES[codeWithoutPrefix];
  }

  // Check if it's a generic error code without prefix
  if (ERROR_MESSAGES[errorCode.toLowerCase()]) {
    return ERROR_MESSAGES[errorCode.toLowerCase()];
  }

  // Return error message if available, otherwise default
  return error.message || ERROR_MESSAGES.default;
};

/**
 * Handle Firebase error with Crashlytics logging
 *
 * @param {Error} error - Firebase error object
 * @param {Object} context - Additional context for logging
 * @returns {string} User-friendly error message
 */
export const handleFirebaseError = (error, context = {}) => {
  const userMessage = getErrorMessage(error);

  // Log to Crashlytics
  try {
    reportCrashlyticsError(error);
    logCrashlyticsMessage(
      `Firebase error: ${error.code || 'unknown'} | Context: ${JSON.stringify(context)}`
    );
  } catch (loggingError) {
    console.error('Failed to log error to Crashlytics:', loggingError);
  }

  // Log to console in development
  if (__DEV__) {
    console.error('🔥 Firebase Error:', {
      code: error.code,
      message: error.message,
      context,
      stack: error.stack,
    });
  }

  return userMessage;
};

/**
 * Wrap async Firebase operation with error handling
 *
 * @param {Function} operation - Async Firebase operation
 * @param {Object} context - Context information for logging
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const executeWithErrorHandling = async (operation, context = {}) => {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = handleFirebaseError(error, context);
    return { success: false, error: errorMessage };
  }
};

/**
 * Check if error is an authentication error
 *
 * @param {Error} error - Firebase error object
 * @returns {boolean} True if authentication error
 */
export const isAuthError = (error) => {
  if (!error || !error.code) {
    return false;
  }
  return (
    error.code.startsWith('auth/') ||
    error.code === 'unauthenticated' ||
    error.code === 'permission-denied'
  );
};

/**
 * Check if error is a network error
 *
 * @param {Error} error - Firebase error object
 * @returns {boolean} True if network error
 */
export const isNetworkError = (error) => {
  if (!error || !error.code) {
    return false;
  }
  return (
    error.code === 'unavailable' ||
    error.code === 'network-request-failed' ||
    error.code === 'auth/network-request-failed' ||
    error.code === 'deadline-exceeded' ||
    error.code === 'timeout'
  );
};

/**
 * Check if error is a permission error
 *
 * @param {Error} error - Firebase error object
 * @returns {boolean} True if permission error
 */
export const isPermissionError = (error) => {
  if (!error || !error.code) {
    return false;
  }
  return (
    error.code === 'permission-denied' ||
    error.code === 'storage/unauthorized' ||
    error.code === 'functions/permission-denied'
  );
};

export default {
  ERROR_MESSAGES,
  getErrorMessage,
  handleFirebaseError,
  executeWithErrorHandling,
  isAuthError,
  isNetworkError,
  isPermissionError,
};
