/**
 * Firebase Mock Factories
 *
 * Task #100.4: Reusable factory functions for generating Firebase mock objects
 *
 * These factories simplify test setup by providing consistent mock data structures
 * that match the Firebase SDK API.
 */

/**
 * Create a mock Firestore DocumentSnapshot
 *
 * @param {string} id - Document ID
 * @param {Object} data - Document data
 * @param {boolean} exists - Whether the document exists
 * @returns {Object} Mock DocumentSnapshot
 */
export const createMockDocumentSnapshot = (id, data = {}, exists = true) => {
  return {
    id,
    exists,
    ref: {
      id,
      path: `collection/${id}`,
      collection: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    metadata: {
      hasPendingWrites: false,
      fromCache: false,
    },
    data: jest.fn(() => (exists ? data : undefined)),
    get: jest.fn((fieldPath) => (exists ? data[fieldPath] : undefined)),
  };
};

/**
 * Create a mock Firestore QueryDocumentSnapshot
 * (Similar to DocumentSnapshot but exists is always true)
 *
 * @param {string} id - Document ID
 * @param {Object} data - Document data
 * @returns {Object} Mock QueryDocumentSnapshot
 */
export const createMockQueryDocumentSnapshot = (id, data = {}) => {
  return {
    id,
    exists: true,
    ref: {
      id,
      path: `collection/${id}`,
      collection: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    metadata: {
      hasPendingWrites: false,
      fromCache: false,
    },
    data: jest.fn(() => data),
    get: jest.fn((fieldPath) => data[fieldPath]),
  };
};

/**
 * Create a mock Firestore QuerySnapshot
 *
 * @param {Array<Object>} docs - Array of document objects {id, data}
 * @returns {Object} Mock QuerySnapshot
 */
export const createMockQuerySnapshot = (docs = []) => {
  const mockDocs = docs.map(doc =>
    createMockQueryDocumentSnapshot(doc.id, doc.data || doc)
  );

  return {
    docs: mockDocs,
    size: mockDocs.length,
    empty: mockDocs.length === 0,
    metadata: {
      hasPendingWrites: false,
      fromCache: false,
    },
    forEach: jest.fn((callback) => {
      mockDocs.forEach(callback);
    }),
    docChanges: jest.fn(() => []),
  };
};

/**
 * Create a mock Firebase User
 *
 * @param {Object} overrides - Properties to override default user
 * @returns {Object} Mock User
 */
export const createMockUser = (overrides = {}) => {
  const defaultUser = {
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

  return { ...defaultUser, ...overrides };
};

/**
 * Create a mock Firebase UserCredential
 *
 * @param {Object} userOverrides - Properties to override default user
 * @returns {Object} Mock UserCredential
 */
export const createMockUserCredential = (userOverrides = {}) => {
  return {
    user: createMockUser(userOverrides),
    providerId: 'password',
    operationType: 'signIn',
  };
};

/**
 * Create a mock Firestore Timestamp
 *
 * @param {Date} date - JavaScript Date object
 * @returns {Object} Mock Timestamp
 */
export const createMockTimestamp = (date = new Date()) => {
  const seconds = Math.floor(date.getTime() / 1000);
  const nanoseconds = (date.getTime() % 1000) * 1000000;

  return {
    seconds,
    nanoseconds,
    toDate: jest.fn(() => date),
    toMillis: jest.fn(() => date.getTime()),
    isEqual: jest.fn((other) => seconds === other.seconds && nanoseconds === other.nanoseconds),
  };
};

/**
 * Create mock Storage UploadTask
 *
 * @param {Object} overrides - Properties to override default task
 * @returns {Object} Mock UploadTask
 */
export const createMockUploadTask = (overrides = {}) => {
  const defaultTask = {
    snapshot: {
      bytesTransferred: 1024,
      totalBytes: 1024,
      state: 'success',
      metadata: {},
      ref: {
        getDownloadURL: jest.fn(() => Promise.resolve('https://mock-url.com/file.jpg')),
      },
    },
    then: jest.fn((onResolve) => {
      onResolve(defaultTask.snapshot);
      return Promise.resolve(defaultTask.snapshot);
    }),
    catch: jest.fn(() => Promise.resolve(defaultTask.snapshot)),
  };

  return { ...defaultTask, ...overrides };
};

/**
 * Create mock FCM RemoteMessage
 *
 * @param {Object} overrides - Properties to override default message
 * @returns {Object} Mock RemoteMessage
 */
export const createMockRemoteMessage = (overrides = {}) => {
  const defaultMessage = {
    messageId: 'mock-message-id',
    data: {},
    notification: {
      title: 'Test Notification',
      body: 'This is a test notification',
    },
    from: 'mock-sender-id',
    collapseKey: null,
    messageType: null,
    sentTime: Date.now(),
    ttl: 3600,
  };

  return { ...defaultMessage, ...overrides };
};

/**
 * Create a collection of mock users
 *
 * @param {number} count - Number of users to create
 * @param {Function} generator - Optional function to generate user data
 * @returns {Array<Object>} Array of mock users
 */
export const createMockUserCollection = (count = 5, generator = null) => {
  return Array.from({ length: count }, (_, index) => {
    const defaultData = {
      uid: `user-${index + 1}`,
      email: `user${index + 1}@example.com`,
      displayName: `User ${index + 1}`,
    };

    return createMockUser(generator ? generator(index, defaultData) : defaultData);
  });
};

/**
 * Create a collection of mock documents
 *
 * @param {number} count - Number of documents to create
 * @param {Function} generator - Function to generate document data: (index) => ({ id, data })
 * @returns {Array<Object>} Array of mock document snapshots
 */
export const createMockDocumentCollection = (count = 5, generator) => {
  return Array.from({ length: count }, (_, index) => {
    const doc = generator ? generator(index) : { id: `doc-${index + 1}`, data: {} };
    return createMockQueryDocumentSnapshot(doc.id, doc.data);
  });
};

/**
 * Helper to create mock Firestore data for testing
 *
 * @param {Object} collections - Object mapping collection names to arrays of documents
 * @returns {Object} Mock Firestore data structure
 */
export const createMockFirestoreData = (collections = {}) => {
  const mockData = {};

  Object.entries(collections).forEach(([collectionName, docs]) => {
    docs.forEach((doc) => {
      const key = `${collectionName}/${doc.id}`;
      mockData[key] = doc.data || doc;
    });
  });

  return mockData;
};

/**
 * Helper to reset all Firebase mocks
 * Call this in beforeEach or afterEach in tests
 */
export const resetAllFirebaseMocks = () => {
  jest.clearAllMocks();

  // Clear any in-memory data stores
  if (global.__MOCK_FIRESTORE_DATA__) {
    global.__MOCK_FIRESTORE_DATA__.clear();
  }
};
