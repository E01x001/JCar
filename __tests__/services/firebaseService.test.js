// __tests__/services/firebaseService.test.js

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock React Native Platform and PermissionsAndroid
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'android',
    Version: 33,
  },
  PermissionsAndroid: {
    PERMISSIONS: {
      POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
    request: jest.fn(),
  },
}));

// Mock Firebase Auth Modular API (Task 62.4)
jest.mock('@react-native-firebase/auth', () => ({
  getAuth: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(),
  getToken: jest.fn(),
  requestPermission: jest.fn(),
  onTokenRefresh: jest.fn(),
  onMessage: jest.fn(),
  getInitialNotification: jest.fn(),
  onNotificationOpenedApp: jest.fn(),
}));
jest.mock('@react-native-firebase/crashlytics');
jest.mock('@react-native-firebase/functions');

// Phase 2a: FCM 토큰 저장이 Supabase 경유로 변경됨
jest.mock('../../src/services/auth/supabaseAuthService', () => ({
  saveMyFcmToken: jest.fn().mockResolvedValue(),
}));

// Mock Firestore Modular API
jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  onSnapshot: jest.fn(),
  writeBatch: jest.fn(),
  deleteDoc: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _methodName: 'FieldValue.serverTimestamp' })),
  deleteField: jest.fn(() => ({ _methodName: 'FieldValue.delete' })),
}));

import { getFirestore, collection, doc, setDoc, addDoc, writeBatch } from '@react-native-firebase/firestore';
import { getMessaging, getToken } from '@react-native-firebase/messaging';
import functions from '@react-native-firebase/functions';
import { PermissionsAndroid } from 'react-native';
import {
  saveConsultationRequest,
  saveFcmToken,
  requestNotificationPermission,
} from '../../src/services/firebaseService';

describe('firebaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveConsultationRequest', () => {
    // Phase 2c: Supabase insert + (구매 상담 시) mark_vehicle_acquiring RPC
    const { supabase } = require('../../__mocks__/supabaseClientMock');

    // resetMocks/restoreMocks 설정이 목 구현을 초기화하므로 매 테스트 재설정
    beforeEach(() => {
      supabase.from.mockImplementation(() => ({
        insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      }));
      supabase.rpc.mockImplementation(() => Promise.resolve({ data: null, error: null }));
    });

    it('should successfully save consultation request', async () => {
      const consultationData = {
        userId: 'user-123',
        userName: 'Test User',
        userPhone: '01012345678',
        vehicleId: 'vehicle-123',
        vehicleName: 'Test Car',
        preferredDate: '2025-12-01',
        preferredTime: '14:00',
        status: 'pending',
        type: 'buy',
      };

      const result = await saveConsultationRequest(consultationData);

      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('consultation_requests');
      // 구매 상담이므로 차량 acquiring 전환 RPC 호출
      expect(supabase.rpc).toHaveBeenCalledWith('mark_vehicle_acquiring', {
        p_vehicle_id: 'vehicle-123',
      });
    });

    it('should handle missing fields with defaults', async () => {
      const result = await saveConsultationRequest({});

      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('consultation_requests');
      // vehicleId 없으면 RPC 미호출
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('saveFcmToken', () => {
    // Phase 2a: 토큰 저장이 Supabase profiles.fcm_token으로 이동
    const { saveMyFcmToken } = require('../../src/services/auth/supabaseAuthService');

    it('should successfully save FCM token', async () => {
      const mockToken = 'mock-fcm-token-12345';

      // Mock modular messaging API
      getMessaging.mockReturnValue({});
      getToken.mockResolvedValue(mockToken);

      await saveFcmToken('user-123');

      expect(saveMyFcmToken).toHaveBeenCalledWith('user-123', mockToken);
    });

    it('should handle case when token is null', async () => {
      // Mock modular messaging API
      getMessaging.mockReturnValue({});
      getToken.mockResolvedValue(null);

      await expect(saveFcmToken('user-123')).resolves.not.toThrow();
    });
  });

  describe('requestNotificationPermission', () => {
    it('should request permission on Android 13+', async () => {
      // Mock is already set to Android 13+ in the jest.mock above
      PermissionsAndroid.request.mockResolvedValue('granted');

      const result = await requestNotificationPermission();

      expect(result).toBe(true);
      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
    });

    it('should handle permission denial gracefully', async () => {
      // Mock is already set to Android 13+ in the jest.mock above
      PermissionsAndroid.request.mockResolvedValue('denied');

      const result = await requestNotificationPermission();

      expect(result).toBe(false);
    });
  });
});
