/**
 * Firebase Mock Factories Tests
 *
 * Task #100.4: Verify mock factories produce correct data structures
 */

import {
  createMockDocumentSnapshot,
  createMockQueryDocumentSnapshot,
  createMockQuerySnapshot,
  createMockUser,
  createMockUserCredential,
  createMockTimestamp,
  createMockUploadTask,
  createMockRemoteMessage,
  createMockUserCollection,
  createMockDocumentCollection,
  createMockFirestoreData,
} from './firebaseMockFactories';

describe('Firebase Mock Factories', () => {
  describe('createMockDocumentSnapshot', () => {
    it('should create a document snapshot with correct properties', () => {
      const mockDoc = createMockDocumentSnapshot('test-id', { name: 'Test' }, true);

      expect(mockDoc.id).toBe('test-id');
      expect(mockDoc.exists).toBe(true);
      expect(mockDoc.data()).toEqual({ name: 'Test' });
      expect(mockDoc.get('name')).toBe('Test');
      expect(mockDoc.ref.id).toBe('test-id');
    });

    it('should create non-existent document snapshot', () => {
      const mockDoc = createMockDocumentSnapshot('test-id', {}, false);

      expect(mockDoc.exists).toBe(false);
      expect(mockDoc.data()).toBeUndefined();
    });
  });

  describe('createMockQueryDocumentSnapshot', () => {
    it('should create query document snapshot', () => {
      const mockDoc = createMockQueryDocumentSnapshot('test-id', { name: 'Test' });

      expect(mockDoc.id).toBe('test-id');
      expect(mockDoc.exists).toBe(true);
      expect(mockDoc.data()).toEqual({ name: 'Test' });
    });
  });

  describe('createMockQuerySnapshot', () => {
    it('should create query snapshot with multiple documents', () => {
      const docs = [
        { id: 'doc1', data: { name: 'Doc 1' } },
        { id: 'doc2', data: { name: 'Doc 2' } },
      ];
      const mockSnapshot = createMockQuerySnapshot(docs);

      expect(mockSnapshot.size).toBe(2);
      expect(mockSnapshot.empty).toBe(false);
      expect(mockSnapshot.docs).toHaveLength(2);
      expect(mockSnapshot.docs[0].id).toBe('doc1');
      expect(mockSnapshot.docs[1].id).toBe('doc2');
    });

    it('should create empty query snapshot', () => {
      const mockSnapshot = createMockQuerySnapshot([]);

      expect(mockSnapshot.size).toBe(0);
      expect(mockSnapshot.empty).toBe(true);
      expect(mockSnapshot.docs).toHaveLength(0);
    });

    it('should support forEach iteration', () => {
      const docs = [
        { id: 'doc1', data: { name: 'Doc 1' } },
        { id: 'doc2', data: { name: 'Doc 2' } },
      ];
      const mockSnapshot = createMockQuerySnapshot(docs);
      const callback = jest.fn();

      mockSnapshot.forEach(callback);

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('createMockUser', () => {
    it('should create user with default properties', () => {
      const mockUser = createMockUser();

      expect(mockUser.uid).toBe('mock-user-id');
      expect(mockUser.email).toBe('test@example.com');
      expect(mockUser.emailVerified).toBe(true);
      expect(mockUser.getIdToken).toBeDefined();
    });

    it('should create user with custom properties', () => {
      const mockUser = createMockUser({
        uid: 'custom-id',
        email: 'custom@example.com',
      });

      expect(mockUser.uid).toBe('custom-id');
      expect(mockUser.email).toBe('custom@example.com');
    });
  });

  describe('createMockUserCredential', () => {
    it('should create user credential with user object', () => {
      const mockCred = createMockUserCredential();

      expect(mockCred.user).toBeDefined();
      expect(mockCred.user.uid).toBe('mock-user-id');
      expect(mockCred.providerId).toBe('password');
      expect(mockCred.operationType).toBe('signIn');
    });
  });

  describe('createMockTimestamp', () => {
    it('should create timestamp from date', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const mockTimestamp = createMockTimestamp(date);

      expect(mockTimestamp.toDate()).toEqual(date);
      expect(mockTimestamp.toMillis()).toBe(date.getTime());
      expect(mockTimestamp.seconds).toBe(Math.floor(date.getTime() / 1000));
    });
  });

  describe('createMockUploadTask', () => {
    it('should create upload task with snapshot', () => {
      const mockTask = createMockUploadTask();

      expect(mockTask.snapshot).toBeDefined();
      expect(mockTask.snapshot.state).toBe('success');
      expect(mockTask.snapshot.bytesTransferred).toBe(1024);
      expect(mockTask.then).toBeDefined();
    });
  });

  describe('createMockRemoteMessage', () => {
    it('should create remote message with notification', () => {
      const mockMessage = createMockRemoteMessage();

      expect(mockMessage.messageId).toBe('mock-message-id');
      expect(mockMessage.notification).toBeDefined();
      expect(mockMessage.notification.title).toBe('Test Notification');
    });
  });

  describe('createMockUserCollection', () => {
    it('should create collection of users', () => {
      const users = createMockUserCollection(3);

      expect(users).toHaveLength(3);
      expect(users[0].uid).toBe('user-1');
      expect(users[1].uid).toBe('user-2');
      expect(users[2].uid).toBe('user-3');
    });

    it('should use generator function', () => {
      const users = createMockUserCollection(2, (index) => ({
        uid: `custom-${index}`,
        email: `custom${index}@test.com`,
      }));

      expect(users).toHaveLength(2);
      expect(users[0].uid).toBe('custom-0');
      expect(users[1].email).toBe('custom1@test.com');
    });
  });

  describe('createMockDocumentCollection', () => {
    it('should create collection of documents', () => {
      const docs = createMockDocumentCollection(3, (index) => ({
        id: `doc-${index}`,
        data: { value: index },
      }));

      expect(docs).toHaveLength(3);
      expect(docs[0].id).toBe('doc-0');
      expect(docs[1].data()).toEqual({ value: 1 });
    });
  });

  describe('createMockFirestoreData', () => {
    it('should create firestore data structure', () => {
      const mockData = createMockFirestoreData({
        users: [
          { id: 'user1', data: { name: 'User 1' } },
          { id: 'user2', data: { name: 'User 2' } },
        ],
        posts: [
          { id: 'post1', data: { title: 'Post 1' } },
        ],
      });

      expect(mockData['users/user1']).toEqual({ name: 'User 1' });
      expect(mockData['users/user2']).toEqual({ name: 'User 2' });
      expect(mockData['posts/post1']).toEqual({ title: 'Post 1' });
    });
  });
});
