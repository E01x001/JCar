/* eslint-disable */
/**
 * Firebase Auth Mock
 *
 * Task #100: Comprehensive Firebase mocking for testing
 * Supports React Native Firebase v22+ modular API
 */

// Mock user object
const mockUser = {
  uid: 'mock-user-id',
  email: 'test@example.com',
  emailVerified: true,
  displayName: 'Test User',
  phoneNumber: '+1234567890',
  photoURL: null,
  isAnonymous: false,
  metadata: {
    creationTime: '2024-01-01T00:00:00.000Z',
    lastSignInTime: '2024-01-01T00:00:00.000Z',
  },
  providerData: [],
  getIdToken: jest.fn(() => Promise.resolve('mock-id-token')),
  getIdTokenResult: jest.fn(() => Promise.resolve({
    token: 'mock-id-token',
    claims: {},
  })),
  reload: jest.fn(() => Promise.resolve()),
  delete: jest.fn(() => Promise.resolve()),
  updateEmail: jest.fn(() => Promise.resolve()),
  updatePassword: jest.fn(() => Promise.resolve()),
  updateProfile: jest.fn(() => Promise.resolve()),
};

// Mock UserCredential
const mockUserCredential = {
  user: mockUser,
  providerId: 'password',
  operationType: 'signIn',
};

// Mock Auth instance
let currentUser = null;
const authStateListeners = [];

const mockAuthInstance = {
  currentUser,
  languageCode: 'en',
  settings: {},
  app: { name: '[DEFAULT]' },
};

// Auth functions
export const getAuth = jest.fn(() => mockAuthInstance);

export const createUserWithEmailAndPassword = jest.fn((auth, email, password) =>
  Promise.resolve(mockUserCredential)
);

export const signInWithEmailAndPassword = jest.fn((auth, email, password) =>
  Promise.resolve(mockUserCredential)
);

export const signInAnonymously = jest.fn((auth) =>
  Promise.resolve(mockUserCredential)
);

export const signOut = jest.fn((auth) => {
  currentUser = null;
  authStateListeners.forEach(listener => listener(null));
  return Promise.resolve();
});

export const sendPasswordResetEmail = jest.fn((auth, email) =>
  Promise.resolve()
);

export const sendEmailVerification = jest.fn((user) =>
  Promise.resolve()
);

export const updateEmail = jest.fn((user, newEmail) =>
  Promise.resolve()
);

export const updatePassword = jest.fn((user, newPassword) =>
  Promise.resolve()
);

export const updateProfile = jest.fn((user, profile) =>
  Promise.resolve()
);

export const deleteUser = jest.fn((user) =>
  Promise.resolve()
);

export const onAuthStateChanged = jest.fn((auth, callback) => {
  authStateListeners.push(callback);
  // Immediately call with current user
  callback(currentUser);
  // Return unsubscribe function
  return jest.fn(() => {
    const index = authStateListeners.indexOf(callback);
    if (index > -1) {
      authStateListeners.splice(index, 1);
    }
  });
});

export const signInWithCredential = jest.fn((auth, credential) =>
  Promise.resolve(mockUserCredential)
);

export const linkWithCredential = jest.fn((user, credential) =>
  Promise.resolve(mockUserCredential)
);

export const reauthenticateWithCredential = jest.fn((user, credential) =>
  Promise.resolve(mockUserCredential)
);

export const fetchSignInMethodsForEmail = jest.fn((auth, email) =>
  Promise.resolve(['password'])
);

export const verifyPasswordResetCode = jest.fn((auth, code) =>
  Promise.resolve('test@example.com')
);

export const confirmPasswordReset = jest.fn((auth, code, newPassword) =>
  Promise.resolve()
);

export const applyActionCode = jest.fn((auth, code) =>
  Promise.resolve()
);

// Helper to set mock user (for testing)
export const __setMockUser = (user) => {
  currentUser = user;
  mockAuthInstance.currentUser = user;
  authStateListeners.forEach(listener => listener(user));
};

// Helper to clear mock user
export const __clearMockUser = () => {
  currentUser = null;
  mockAuthInstance.currentUser = null;
  authStateListeners.forEach(listener => listener(null));
};

// Default export
const auth = jest.fn(() => mockAuthInstance);
export default auth;
