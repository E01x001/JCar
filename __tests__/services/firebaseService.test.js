// __tests__/services/firebaseService.test.js

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock Firebase modules
jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');
jest.mock('@react-native-firebase/messaging');
jest.mock('@react-native-firebase/crashlytics');
jest.mock('@react-native-firebase/functions');

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import crashlytics from '@react-native-firebase/crashlytics';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import {
  registerUser,
  loginUser,
  sendPasswordResetEmail,
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

      const mockCreateUser = jest.fn().mockResolvedValue(mockUserCredential);
      auth.mockReturnValue({
        createUserWithEmailAndPassword: mockCreateUser,
      });

      const mockSet = jest.fn().mockResolvedValue();
      firestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            set: mockSet,
          })),
        })),
      });

      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        phoneNumber: '01012345678',
      };

      const result = await registerUser(userData);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-uid-123');
      expect(mockCreateUser).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should handle registration error', async () => {
      const mockError = new Error('Email already exists');
      auth.mockReturnValue({
        createUserWithEmailAndPassword: jest.fn().mockRejectedValue(mockError),
      });

      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
        phoneNumber: '01012345678',
      };

      const result = await registerUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('loginUser', () => {
    it('should successfully log in a user', async () => {
      const mockUser = { uid: 'test-uid-123' };
      const mockUserCredential = { user: mockUser };

      auth.mockReturnValue({
        signInWithEmailAndPassword: jest.fn().mockResolvedValue(mockUserCredential),
      });

      const result = await loginUser({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-uid-123');
    });

    it('should handle login error', async () => {
      const mockError = new Error('Invalid credentials');
      auth.mockReturnValue({
        signInWithEmailAndPassword: jest.fn().mockRejectedValue(mockError),
      });

      const result = await loginUser({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should successfully send password reset email', async () => {
      auth.mockReturnValue({
        sendPasswordResetEmail: jest.fn().mockResolvedValue(),
      });

      const result = await sendPasswordResetEmail('test@example.com');

      expect(result.success).toBe(true);
    });

    it('should handle password reset error', async () => {
      const mockError = new Error('User not found');
      auth.mockReturnValue({
        sendPasswordResetEmail: jest.fn().mockRejectedValue(mockError),
      });

      const result = await sendPasswordResetEmail('nonexistent@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('saveConsultationRequest', () => {
    it('should successfully save consultation request', async () => {
      firestore.mockReturnValue({
        collection: jest.fn(() => ({
          add: jest.fn().mockResolvedValue({ id: 'consultation-123' }),
        })),
      });

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
    });

    it('should handle missing fields with defaults', async () => {
      firestore.mockReturnValue({
        collection: jest.fn(() => ({
          add: jest.fn().mockResolvedValue({ id: 'consultation-123' }),
        })),
      });

      const result = await saveConsultationRequest({});

      expect(result.success).toBe(true);
    });
  });

  describe('saveFcmToken', () => {
    it('should successfully save FCM token', async () => {
      const mockToken = 'mock-fcm-token-12345';
      messaging.mockReturnValue({
        getToken: jest.fn().mockResolvedValue(mockToken),
      });

      const mockUpdate = jest.fn().mockResolvedValue();
      firestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            update: mockUpdate,
          })),
        })),
      });

      await saveFcmToken('user-123');

      expect(mockUpdate).toHaveBeenCalledWith({ fcmToken: mockToken });
    });

    it('should handle case when token is null', async () => {
      messaging.mockReturnValue({
        getToken: jest.fn().mockResolvedValue(null),
      });

      await expect(saveFcmToken('user-123')).resolves.not.toThrow();
    });
  });

  describe('requestNotificationPermission', () => {
    it('should auto-grant permission on Android 12 and below', async () => {
      Platform.OS = 'android';
      Platform.Version = 32;

      const result = await requestNotificationPermission();

      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      Platform.OS = 'android';
      Platform.Version = 12;

      const result = await requestNotificationPermission();

      // Should return true for Android 12 and below
      expect(result).toBe(true);
    });
  });
});
