/* eslint-disable */
/**
 * Firebase Firestore Mock
 *
 * Task #100: Comprehensive Firebase mocking for testing
 * Supports React Native Firebase v22+ modular API
 */

// Mock DocumentSnapshot
class MockDocumentSnapshot {
  constructor(id, data, exists = true) {
    this.id = id;
    this._data = data;
    this.exists = exists;
    this.ref = {
      id,
      path: `collection/${id}`,
    };
    this.metadata = {
      hasPendingWrites: false,
      fromCache: false,
    };
  }

  data() {
    return this._data;
  }

  get(fieldPath) {
    return this._data?.[fieldPath];
  }
}

// Mock QueryDocumentSnapshot
class MockQueryDocumentSnapshot extends MockDocumentSnapshot {
  data() {
    return this._data;
  }
}

// Mock QuerySnapshot
class MockQuerySnapshot {
  constructor(docs = []) {
    this.docs = docs.map(doc =>
      doc instanceof MockQueryDocumentSnapshot
        ? doc
        : new MockQueryDocumentSnapshot(doc.id, doc.data, true)
    );
    this.size = this.docs.length;
    this.empty = this.docs.length === 0;
    this.metadata = {
      hasPendingWrites: false,
      fromCache: false,
    };
  }

  forEach(callback) {
    this.docs.forEach(callback);
  }
}

// In-memory data store for mocking
const mockDataStore = new Map();

// Mock DocumentReference
const createMockDocumentReference = (collectionPath, docId) => ({
  id: docId,
  path: `${collectionPath}/${docId}`,
  collection: jest.fn((subCollection) =>
    createMockCollectionReference(`${collectionPath}/${docId}/${subCollection}`)
  ),
  get: jest.fn(() => {
    const key = `${collectionPath}/${docId}`;
    const data = mockDataStore.get(key);
    return Promise.resolve(new MockDocumentSnapshot(docId, data, !!data));
  }),
  set: jest.fn((data, options) => {
    const key = `${collectionPath}/${docId}`;
    if (options?.merge) {
      const existing = mockDataStore.get(key) || {};
      mockDataStore.set(key, { ...existing, ...data });
    } else {
      mockDataStore.set(key, data);
    }
    return Promise.resolve();
  }),
  update: jest.fn((data) => {
    const key = `${collectionPath}/${docId}`;
    const existing = mockDataStore.get(key) || {};
    mockDataStore.set(key, { ...existing, ...data });
    return Promise.resolve();
  }),
  delete: jest.fn(() => {
    const key = `${collectionPath}/${docId}`;
    mockDataStore.delete(key);
    return Promise.resolve();
  }),
  onSnapshot: jest.fn((callback) => {
    const key = `${collectionPath}/${docId}`;
    const data = mockDataStore.get(key);
    const snapshot = new MockDocumentSnapshot(docId, data, !!data);
    callback(snapshot);
    // Return unsubscribe function
    return jest.fn();
  }),
});

// Mock Query
const createMockQuery = (collectionPath) => ({
  where: jest.fn((field, operator, value) =>
    createMockQuery(collectionPath)
  ),
  orderBy: jest.fn((field, direction) =>
    createMockQuery(collectionPath)
  ),
  limit: jest.fn((limitNum) =>
    createMockQuery(collectionPath)
  ),
  limitToLast: jest.fn((limitNum) =>
    createMockQuery(collectionPath)
  ),
  startAt: jest.fn((snapshot) =>
    createMockQuery(collectionPath)
  ),
  startAfter: jest.fn((snapshot) =>
    createMockQuery(collectionPath)
  ),
  endAt: jest.fn((snapshot) =>
    createMockQuery(collectionPath)
  ),
  endBefore: jest.fn((snapshot) =>
    createMockQuery(collectionPath)
  ),
  get: jest.fn(() => {
    // Return all docs in this collection
    const docs = [];
    mockDataStore.forEach((data, key) => {
      if (key.startsWith(collectionPath + '/')) {
        const docId = key.split('/').pop();
        docs.push(new MockQueryDocumentSnapshot(docId, data, true));
      }
    });
    return Promise.resolve(new MockQuerySnapshot(docs));
  }),
  onSnapshot: jest.fn((callback) => {
    // Return all docs in this collection
    const docs = [];
    mockDataStore.forEach((data, key) => {
      if (key.startsWith(collectionPath + '/')) {
        const docId = key.split('/').pop();
        docs.push(new MockQueryDocumentSnapshot(docId, data, true));
      }
    });
    const snapshot = new MockQuerySnapshot(docs);
    callback(snapshot);
    // Return unsubscribe function
    return jest.fn();
  }),
});

// Mock CollectionReference
const createMockCollectionReference = (collectionPath) => ({
  id: collectionPath.split('/').pop(),
  path: collectionPath,
  doc: jest.fn((docId) => {
    if (docId) {
      return createMockDocumentReference(collectionPath, docId);
    }
    // Generate random ID if not provided
    const randomId = `mock-${Math.random().toString(36).substr(2, 9)}`;
    return createMockDocumentReference(collectionPath, randomId);
  }),
  add: jest.fn((data) => {
    const docId = `mock-${Math.random().toString(36).substr(2, 9)}`;
    const key = `${collectionPath}/${docId}`;
    mockDataStore.set(key, data);
    return Promise.resolve(createMockDocumentReference(collectionPath, docId));
  }),
  where: jest.fn((field, operator, value) =>
    createMockQuery(collectionPath)
  ),
  orderBy: jest.fn((field, direction) =>
    createMockQuery(collectionPath)
  ),
  limit: jest.fn((limitNum) =>
    createMockQuery(collectionPath)
  ),
  limitToLast: jest.fn((limitNum) =>
    createMockQuery(collectionPath)
  ),
  startAt: jest.fn((snapshot) =>
    createMockQuery(collectionPath)
  ),
  startAfter: jest.fn((snapshot) =>
    createMockQuery(collectionPath)
  ),
  endAt: jest.fn((snapshot) =>
    createMockQuery(collectionPath)
  ),
  endBefore: jest.fn((snapshot) =>
    createMockQuery(collectionPath)
  ),
  get: jest.fn(() => {
    // Return all docs in this collection
    const docs = [];
    mockDataStore.forEach((data, key) => {
      if (key.startsWith(collectionPath + '/')) {
        const docId = key.split('/').pop();
        docs.push(new MockQueryDocumentSnapshot(docId, data, true));
      }
    });
    return Promise.resolve(new MockQuerySnapshot(docs));
  }),
  onSnapshot: jest.fn((callback) => {
    // Return all docs in this collection
    const docs = [];
    mockDataStore.forEach((data, key) => {
      if (key.startsWith(collectionPath + '/')) {
        const docId = key.split('/').pop();
        docs.push(new MockQueryDocumentSnapshot(docId, data, true));
      }
    });
    const snapshot = new MockQuerySnapshot(docs);
    callback(snapshot);
    // Return unsubscribe function
    return jest.fn();
  }),
});

// Mock Firestore instance
const mockFirestoreInstance = {
  collection: jest.fn((collectionPath) =>
    createMockCollectionReference(collectionPath)
  ),
  doc: jest.fn((docPath) => {
    const parts = docPath.split('/');
    if (parts.length < 2) {
      throw new Error('Document path must contain collection and document ID');
    }
    const collectionPath = parts.slice(0, -1).join('/');
    const docId = parts[parts.length - 1];
    return createMockDocumentReference(collectionPath, docId);
  }),
  batch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(() => Promise.resolve()),
  })),
  runTransaction: jest.fn((updateFunction) => {
    const transaction = {
      get: jest.fn((docRef) => {
        const key = docRef.path;
        const data = mockDataStore.get(key);
        return Promise.resolve(new MockDocumentSnapshot(docRef.id, data, !!data));
      }),
      set: jest.fn((docRef, data) => {
        mockDataStore.set(docRef.path, data);
      }),
      update: jest.fn((docRef, data) => {
        const existing = mockDataStore.get(docRef.path) || {};
        mockDataStore.set(docRef.path, { ...existing, ...data });
      }),
      delete: jest.fn((docRef) => {
        mockDataStore.delete(docRef.path);
      }),
    };
    return Promise.resolve(updateFunction(transaction));
  }),
  settings: jest.fn(),
  enableNetwork: jest.fn(() => Promise.resolve()),
  disableNetwork: jest.fn(() => Promise.resolve()),
  clearPersistence: jest.fn(() => Promise.resolve()),
  terminate: jest.fn(() => Promise.resolve()),
  waitForPendingWrites: jest.fn(() => Promise.resolve()),
};

// Modular API functions
export const getFirestore = jest.fn(() => mockFirestoreInstance);

export const collection = jest.fn((firestore, collectionPath) =>
  createMockCollectionReference(collectionPath)
);

export const doc = jest.fn((firestore, ...pathSegments) => {
  const docPath = pathSegments.join('/');
  const parts = docPath.split('/');
  const collectionPath = parts.slice(0, -1).join('/');
  const docId = parts[parts.length - 1];
  return createMockDocumentReference(collectionPath, docId);
});

export const getDoc = jest.fn((docRef) => docRef.get());
export const getDocs = jest.fn((queryOrCollectionRef) => queryOrCollectionRef.get());
export const setDoc = jest.fn((docRef, data, options) => docRef.set(data, options));
export const updateDoc = jest.fn((docRef, data) => docRef.update(data));
export const deleteDoc = jest.fn((docRef) => docRef.delete());
export const addDoc = jest.fn((collectionRef, data) => collectionRef.add(data));

export const query = jest.fn((collectionRef, ...queryConstraints) => {
  let q = collectionRef;
  queryConstraints.forEach(constraint => {
    if (constraint._type === 'where') {
      q = q.where(constraint.field, constraint.operator, constraint.value);
    } else if (constraint._type === 'orderBy') {
      q = q.orderBy(constraint.field, constraint.direction);
    } else if (constraint._type === 'limit') {
      q = q.limit(constraint.value);
    }
  });
  return q;
});

export const where = jest.fn((field, operator, value) => ({
  _type: 'where',
  field,
  operator,
  value,
}));

export const orderBy = jest.fn((field, direction = 'asc') => ({
  _type: 'orderBy',
  field,
  direction,
}));

export const limit = jest.fn((value) => ({
  _type: 'limit',
  value,
}));

export const startAt = jest.fn((snapshot) => createMockQuery(''));
export const startAfter = jest.fn((snapshot) => createMockQuery(''));
export const endAt = jest.fn((snapshot) => createMockQuery(''));
export const endBefore = jest.fn((snapshot) => createMockQuery(''));
export const limitToLast = jest.fn((limitNum) => createMockQuery(''));

export const onSnapshot = jest.fn((queryOrDocRef, callback) =>
  queryOrDocRef.onSnapshot(callback)
);

export const serverTimestamp = jest.fn(() => ({
  _methodName: 'serverTimestamp',
}));

export const arrayUnion = jest.fn((...elements) => ({
  _methodName: 'arrayUnion',
  _elements: elements,
}));

export const arrayRemove = jest.fn((...elements) => ({
  _methodName: 'arrayRemove',
  _elements: elements,
}));

export const increment = jest.fn((n) => ({
  _methodName: 'increment',
  _operand: n,
}));

export const deleteField = jest.fn(() => ({
  _methodName: 'deleteField',
}));

export const writeBatch = jest.fn((firestore) => mockFirestoreInstance.batch());
export const runTransaction = jest.fn((firestore, updateFunction) =>
  mockFirestoreInstance.runTransaction(updateFunction)
);

// Field value exports
export const FieldValue = {
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  delete: deleteField,
};

// Helper to clear mock data (for testing)
export const __clearMockData = () => {
  mockDataStore.clear();
};

// Helper to set mock data (for testing)
export const __setMockData = (path, data) => {
  mockDataStore.set(path, data);
};

// Helper to get mock data (for testing)
export const __getMockData = (path) => {
  return mockDataStore.get(path);
};

// Default export
const firestore = jest.fn(() => mockFirestoreInstance);
export default firestore;
