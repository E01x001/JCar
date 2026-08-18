// __tests__/services/fcmService.test.js
//
// 원래 firebaseService.test.js에 있던 것을 실제 모듈로 옮겼다(죽은 재수출 배럴 제거).
// FCM 발급 자체는 Supabase 이전 후에도 Firebase에 남지만, 토큰 저장은
// profiles.fcm_token(Supabase)으로 이동했다 — 그 경계가 이 테스트의 관심사다.

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'android', Version: 33 },
  PermissionsAndroid: {
    PERMISSIONS: { POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS' },
    RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
    request: jest.fn(),
  },
}));

jest.mock('../../src/services/auth/supabaseAuthService', () => ({
  saveMyFcmToken: jest.fn(() => Promise.resolve()),
}));

import { getMessaging, getToken } from '@react-native-firebase/messaging';
import { PermissionsAndroid } from 'react-native';
import { saveFcmToken, requestNotificationPermission } from '../../src/services/notification/fcmService';

describe('fcmService', () => {
  describe('saveFcmToken', () => {
    const { saveMyFcmToken } = require('../../src/services/auth/supabaseAuthService');

    it('발급받은 토큰을 Supabase 프로필에 저장한다', async () => {
      const mockToken = 'mock-fcm-token-12345';
      getMessaging.mockReturnValue({});
      getToken.mockResolvedValue(mockToken);

      await saveFcmToken('user-123');

      expect(saveMyFcmToken).toHaveBeenCalledWith('user-123', mockToken);
    });

    it('토큰이 없어도 예외를 던지지 않는다', async () => {
      // 알림 미허용/시뮬레이터 등에서 정상적으로 발생하는 경로다
      getMessaging.mockReturnValue({});
      getToken.mockResolvedValue(null);

      await expect(saveFcmToken('user-123')).resolves.not.toThrow();
    });
  });

  describe('requestNotificationPermission', () => {
    it('Android 13+에서 POST_NOTIFICATIONS 권한을 요청한다', async () => {
      PermissionsAndroid.request.mockResolvedValue('granted');

      const result = await requestNotificationPermission();

      expect(result).toBe(true);
      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
    });

    it('권한 거부를 예외 없이 false로 돌려준다', async () => {
      PermissionsAndroid.request.mockResolvedValue('denied');

      const result = await requestNotificationPermission();

      expect(result).toBe(false);
    });
  });
});
