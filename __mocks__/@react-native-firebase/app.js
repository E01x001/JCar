
/**
 * Firebase App Mock
 *
 * Task #100: Comprehensive Firebase mocking for testing
 */

const app = jest.fn(() => ({
  name: '[DEFAULT]',
  options: {
    apiKey: 'mock-api-key',
    appId: 'mock-app-id',
    projectId: 'mock-project-id',
  },
}));

// Mock firebase instance
const mockFirebaseApp = {
  name: '[DEFAULT]',
  options: {
    apiKey: 'mock-api-key',
    appId: 'mock-app-id',
    projectId: 'mock-project-id',
  },
};

// Named exports for modular API
export const getApp = jest.fn(() => mockFirebaseApp);
export const initializeApp = jest.fn(() => mockFirebaseApp);
export const deleteApp = jest.fn(() => Promise.resolve());

// Default export
export default app;
