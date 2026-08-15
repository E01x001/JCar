/**
 * FCM (Firebase Cloud Messaging) Service
 *
 * Handles push notification operations including:
 * - FCM token management
 * - Notification permissions
 * - Token storage
 *
 * Task #88: Modular service refactoring
 */

import { getMessaging, getToken, requestPermission, isSupported } from './firebaseNative';
import { logger } from '../../utils/logger';
import { Alert, Platform, PermissionsAndroid } from 'react-native';

/**
 * Get messaging instance helper
 * @returns {Object} Messaging instance
 */
const getMessagingInstance = () => getMessaging();

/**
 * Get FCM token for the device
 * @returns {Promise<string>} FCM token
 */
export const getFCMToken = async () => {
  try {
    const messagingInstance = getMessagingInstance();
    const token = await getToken(messagingInstance);
    return token;
  } catch (err) {
    logger.error('Failed to get FCM token:', err);
    throw err;
  }
};

/**
 * Request notification permission
 * @returns {Promise<number>} Authorization status
 */
export const requestFCMNotificationPermission = async () => {
  try {
    const messagingInstance = getMessagingInstance();
    const authStatus = await requestPermission(messagingInstance);
    return authStatus;
  } catch (err) {
    logger.error('Failed to request notification permission:', err);
    throw err;
  }
};

/**
 * Request notification permission (legacy function)
 * @returns {Promise<boolean>} Permission granted status
 */
export const requestNotificationPermission = async () => {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      logger.debug('Android 13+ 알림 권한 요청 결과:', granted);

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        logger.debug('✅ 알림 권한 허용됨');
        return true;
      } else {
        logger.debug('❌ 알림 권한 거부됨');
        Alert.alert('알림 권한', '알림 기능을 사용하려면 설정에서 알림 권한을 활성화해주세요.');
        return false;
      }
    } else {
      // iOS or Android < 13
      const authStatus = await requestFCMNotificationPermission();
      const enabled =
        authStatus === 1 || // messaging.AuthorizationStatus.AUTHORIZED (iOS)
        authStatus === 2;    // messaging.AuthorizationStatus.PROVISIONAL (iOS)

      if (enabled) {
        logger.debug('✅ 알림 권한 허용됨');
        return true;
      } else {
        logger.debug('❌ 알림 권한 거부됨');
        Alert.alert('알림 권한', '알림 기능을 사용하려면 설정에서 알림 권한을 활성화해주세요.');
        return false;
      }
    }
  } catch (error) {
    logger.error('알림 권한 요청 실패:', error);
    return false;
  }
};

/**
 * Save FCM token to Firestore
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const saveFcmToken = async (userId) => {
  try {
    const token = await getFCMToken();
    // Supabase 이전(Phase 2a): 토큰은 profiles.fcm_token에 저장.
    // FCM 발급 자체는 Firebase Messaging 유지(하이브리드).
    const { saveMyFcmToken } = require('../auth/supabaseAuthService');
    await saveMyFcmToken(userId, token);

    logger.debug('FCM 토큰 저장 완료:', token);
  } catch (error) {
    logger.error('FCM 토큰 저장 실패:', error);
  }
};
