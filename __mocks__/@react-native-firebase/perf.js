/* eslint-disable */
/**
 * Firebase Performance Monitoring Mock
 *
 * Task #100: Comprehensive Firebase mocking for testing
 */

const mockTrace = {
  start: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  putAttribute: jest.fn((key, value) => Promise.resolve()),
  getAttribute: jest.fn((key) => 'mock-value'),
  removeAttribute: jest.fn((key) => Promise.resolve()),
  getAttributes: jest.fn(() => ({})),
  putMetric: jest.fn((metricName, value) => Promise.resolve()),
  getMetric: jest.fn((metricName) => 0),
  incrementMetric: jest.fn((metricName, incrementBy) => Promise.resolve()),
};

const mockHttpMetric = {
  start: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  setHttpResponseCode: jest.fn((code) => Promise.resolve()),
  setRequestPayloadSize: jest.fn((bytes) => Promise.resolve()),
  setResponseContentType: jest.fn((contentType) => Promise.resolve()),
  setResponsePayloadSize: jest.fn((bytes) => Promise.resolve()),
  putAttribute: jest.fn((key, value) => Promise.resolve()),
  getAttribute: jest.fn((key) => 'mock-value'),
  removeAttribute: jest.fn((key) => Promise.resolve()),
  getAttributes: jest.fn(() => ({})),
};

const mockPerfInstance = {
  newTrace: jest.fn((identifier) => mockTrace),
  newHttpMetric: jest.fn((url, httpMethod) => mockHttpMetric),
  setPerformanceCollectionEnabled: jest.fn((enabled) => Promise.resolve()),
  isPerformanceCollectionEnabled: jest.fn(() => Promise.resolve(true)),
};

export const getPerformance = jest.fn(() => mockPerfInstance);
export const trace = jest.fn((perf, identifier) => mockTrace);
export const httpMetric = jest.fn((perf, url, httpMethod) => mockHttpMetric);

const perf = jest.fn(() => mockPerfInstance);
export default perf;
