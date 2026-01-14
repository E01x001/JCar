/* eslint-disable */
/**
 * Firebase Storage Mock
 *
 * Task #100: Comprehensive Firebase mocking for testing
 */

const mockStorageInstance = {
  ref: jest.fn((path) => ({
    putFile: jest.fn(() => Promise.resolve({
      state: 'success',
      bytesTransferred: 1024,
      totalBytes: 1024,
      metadata: {},
    })),
    put: jest.fn(() => Promise.resolve({
      state: 'success',
      bytesTransferred: 1024,
      totalBytes: 1024,
      metadata: {},
    })),
    putString: jest.fn(() => Promise.resolve({
      state: 'success',
      bytesTransferred: 1024,
      totalBytes: 1024,
      metadata: {},
    })),
    getDownloadURL: jest.fn(() => Promise.resolve('https://mock-download-url.com/file.jpg')),
    delete: jest.fn(() => Promise.resolve()),
    updateMetadata: jest.fn(() => Promise.resolve({})),
    getMetadata: jest.fn(() => Promise.resolve({
      bucket: 'mock-bucket',
      name: 'mock-file',
      size: 1024,
      contentType: 'image/jpeg',
    })),
    listAll: jest.fn(() => Promise.resolve({
      items: [],
      prefixes: [],
      nextPageToken: null,
    })),
    child: jest.fn((childPath) => mockStorageInstance.ref(`${path}/${childPath}`)),
  })),
  refFromURL: jest.fn((url) => mockStorageInstance.ref('mock-path')),
  setMaxOperationRetryTime: jest.fn(),
  setMaxUploadRetryTime: jest.fn(),
  setMaxDownloadRetryTime: jest.fn(),
};

export const getStorage = jest.fn(() => mockStorageInstance);
export const ref = jest.fn((storage, path) => storage.ref(path));
export const uploadBytes = jest.fn(() => Promise.resolve({ state: 'success' }));
export const uploadString = jest.fn(() => Promise.resolve({ state: 'success' }));
export const getDownloadURL = jest.fn(() => Promise.resolve('https://mock-download-url.com/file.jpg'));
export const deleteObject = jest.fn(() => Promise.resolve());
export const getMetadata = jest.fn(() => Promise.resolve({}));
export const updateMetadata = jest.fn(() => Promise.resolve({}));
export const listAll = jest.fn(() => Promise.resolve({ items: [], prefixes: [] }));

const storage = jest.fn(() => mockStorageInstance);
export default storage;
