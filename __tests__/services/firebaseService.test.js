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
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _methodName: 'FieldValue.serverTimestamp' })),
  deleteField: jest.fn(() => ({ _methodName: 'FieldValue.delete' })),
}));

// Task 62.4: Import modular auth functions
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '@react-native-firebase/auth';
import { getFirestore, collection, doc, setDoc, updateDoc, addDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { getMessaging, getToken } from '@react-native-firebase/messaging';
import crashlytics from '@react-native-firebase/crashlytics';
import functions from '@react-native-firebase/functions';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import {
  registerUser,
  loginUser,
  saveConsultationRequest,
  saveFcmToken,
  requestNotificationPermission,
} from '../../src/services/firebaseService';

describe('firebaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should successfully register a new user', async () => {
      const mockUser = { uid: 'test-uid-123' };
      const mockUserCredential = { user: mockUser };

      // Task 62.4: Mock modular auth functions
      getAuth.mockReturnValue({});
      createUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);

      // Mock modular Firestore API
      getFirestore.mockReturnValue({});
      doc.mockReturnValue({ id: 'test-uid-123' });
      setDoc.mockResolvedValue();

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        phoneNumber: '01012345678',
      };

      const result = await registerUser(userData);

      expect(result.success).toBe(true);
      expect(result.user.uid).toBe('test-uid-123');
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith({}, 'test@example.com', 'password123');
      expect(setDoc).toHaveBeenCalled();
    });

    it('should handle registration error', async () => {
      const mockError = new Error('Email already exists');
      // Task 62.4: Mock modular auth error
      getAuth.mockReturnValue({});
      createUserWithEmailAndPassword.mockRejectedValue(mockError);

      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
        phoneNumber: '01012345678',
      };

      // The service throws errors instead of returning error objects
      await expect(registerUser(userData)).rejects.toThrow();
    });
  });

  describe('loginUser', () => {
    it('should successfully log in a user', async () => {
      const mockUser = { uid: 'test-uid-123' };
      const mockUserCredential = { user: mockUser };

      // Task 62.4: Mock modular auth
      getAuth.mockReturnValue({});
      signInWithEmailAndPassword.mockResolvedValue(mockUserCredential);

      const result = await loginUser({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.user.uid).toBe('test-uid-123');
    });

    it('should handle login error', async () => {
      const mockError = new Error('Invalid credentials');
      mockError.code = 'auth/invalid-credential';
      // Task 62.4: Mock modular auth error
      getAuth.mockReturnValue({});
      signInWithEmailAndPassword.mockRejectedValue(mockError);

      await expect(loginUser({
        email: 'test@example.com',
        password: 'wrongpassword',
      })).rejects.toThrow();
    });
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

      // Mock modular Firestore API
      getFirestore.mockReturnValue({});
      collection.mockReturnValue({ _collectionPath: 'consultation_requests' });
      addDoc.mockResolvedValue({ id: 'consultation-123' });

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
      expect(addDoc).toHaveBeenCalled();
    });

    it('should handle missing fields with defaults', async () => {
      // Mock Firebase Functions for rate limit check
      const mockHttpsCallable = jest.fn().mockResolvedValue({
        data: { allowed: true, remainingRequests: 5 },
      });
      functions.mockReturnValue({
        httpsCallable: jest.fn().mockReturnValue(mockHttpsCallable),
      });

      // Mock modular Firestore API
      getFirestore.mockReturnValue({});
      collection.mockReturnValue({ _collectionPath: 'consultation_requests' });
      addDoc.mockResolvedValue({ id: 'consultation-123' });

      const result = await saveConsultationRequest({});

      expect(result.success).toBe(true);
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('saveFcmToken', () => {
    it('should successfully save FCM token', async () => {
      const mockToken = 'mock-fcm-token-12345';

      // Mock modular messaging API
      getMessaging.mockReturnValue({});
      getToken.mockResolvedValue(mockToken);

      // Mock modular Firestore API
      getFirestore.mockReturnValue({});
      doc.mockReturnValue({ id: 'user-123' });
      setDoc.mockResolvedValue();

      await saveFcmToken('user-123');

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ fcmToken: mockToken }),
        { merge: true }
      );
    });

    it('should handle case when token is null', async () => {
      // Mock modular messaging API
      getMessaging.mockReturnValue({});
      getToken.mockResolvedValue(null);

      // Mock modular Firestore API
      getFirestore.mockReturnValue({});
      doc.mockReturnValue({ id: 'user-123' });
      setDoc.mockResolvedValue();

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
