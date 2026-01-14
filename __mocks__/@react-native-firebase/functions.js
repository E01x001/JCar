/* eslint-disable */
/**
 * Firebase Functions Mock
 *
 * Task #100: Comprehensive Firebase mocking for testing
 */

const mockFunctionsInstance = {
  httpsCallable: jest.fn((name) => {
    return jest.fn((data) => {
      return Promise.resolve({
        data: { success: true, message: 'Mock function response' },
      });
    });
  }),
  useFunctionsEmulator: jest.fn((host, port) => {}),
};

export class HttpsError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'HttpsError';
  }
}

export const getFunctions = jest.fn(() => mockFunctionsInstance);
export const httpsCallable = jest.fn((functions, name) => {
  return jest.fn((data) => {
    return Promise.resolve({
      data: { success: true, message: 'Mock function response' },
    });
  });
});
export const connectFunctionsEmulator = jest.fn();

const functions = jest.fn(() => mockFunctionsInstance);
export default functions;
