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
    it('should successfully save consultation request', async () => {
      // Mock Firebase Functions for rate limit check
      const mockHttpsCallable = jest.fn().mockResolvedValue({
        data: { allowed: true, remainingRequests: 5 },
      });
      functions.mockReturnValue({
        httpsCallable: jest.fn().mockReturnValue(mockHttpsCallable),
      });

      // Mock modular Firestore API (슬롯 선점 배치 쓰기)
      getFirestore.mockReturnValue({});
      collection.mockReturnValue({ _collectionPath: 'consultation_requests' });
      doc.mockReturnValue({ id: 'consultation-123' });
      const mockBatch = { set: jest.fn(), update: jest.fn(), commit: jest.fn().mockResolvedValue() };
      writeBatch.mockReturnValue(mockBatch);

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
      // 상담 문서 + 슬롯 문서 배치 커밋 확인
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should handle missing fields with defaults', async () => {
      // Mock Firebase Functions for rate limit check
      const mockHttpsCallable = jest.fn().mockResolvedValue({
        data: { allowed: true, remainingRequests: 5 },
      });
      functions.mockReturnValue({
        httpsCallable: jest.fn().mockReturnValue(mockHttpsCallable),
      });

      // Mock modular Firestore API (필드 없음 → 슬롯 없이 상담 문서만)
      getFirestore.mockReturnValue({});
      collection.mockReturnValue({ _collectionPath: 'consultation_requests' });
      doc.mockReturnValue({ id: 'consultation-123' });
      const mockBatch = { set: jest.fn(), update: jest.fn(), commit: jest.fn().mockResolvedValue() };
      writeBatch.mockReturnValue(mockBatch);

      const result = await saveConsultationRequest({});

      expect(result.success).toBe(true);
      expect(mockBatch.set).toHaveBeenCalledTimes(1); // 슬롯 정보 없으니 상담 문서만
      expect(mockBatch.commit).toHaveBeenCalled();
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
