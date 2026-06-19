# Task ID: 100

**Title:** Set Up Jest, React Native Testing Library, and Firebase Mock Infrastructure

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Establish the foundational testing environment, including Jest configuration, React Native Testing Library, and robust Firebase mocking.

**Details:**

Configure `jest.config.js` for a React Native project, including necessary presets and transforms. Install `react-native-testing-library` for component testing. Create a `__mocks__/@react-native-firebase/` directory structure. Within this, create mock implementations for `auth`, `firestore`, `storage`, and `messaging` modules to allow tests to run without actual Firebase connections. Implement generic mock factories for common Firebase data structures (e.g., `DocumentSnapshot`, `QuerySnapshot`).

**Test Strategy:**

Write a minimal Jest test (`.test.js`) that imports a Firebase-dependent component and attempts to render it using `render()`. Verify that the test runs successfully without connecting to actual Firebase services, indicating that the mocks are correctly intercepting calls. Confirm that `jest.mock()` configurations are working as expected.

## Subtasks

### 100.1. Configure Jest for React Native Project

**Status:** done  
**Dependencies:** None  

Set up the Jest testing framework for a React Native project, including all necessary presets and transforms to correctly parse and run tests in a React Native environment.

**Details:**

Modify the `jest.config.js` file at the project root. Add `preset: 'react-native'`, configure `transformIgnorePatterns` to exclude `node_modules` with specific exceptions for React Native components, and set up `moduleNameMapper` if specific asset or module resolution is needed. Ensure `setupFiles` and `setupFilesAfterEnv` are correctly configured for any global test setup.

### 100.2. Install and Integrate React Native Testing Library

**Status:** done  
**Dependencies:** 100.1  

Install `react-native-testing-library` and ensure it's properly integrated with the Jest setup to allow for robust component testing of React Native UI.

**Details:**

Install `react-native-testing-library` along with any necessary peer dependencies (e.g., `react-test-renderer`, `jest-environment-jsdom`). Update `jest.config.js` or create a `setupTests.js` file to include `@testing-library/jest-native/extend-expect` for custom matchers, enhancing the testing experience with React Native specific assertions.

### 100.3. Create Firebase Module Mocks for auth, firestore, storage, and messaging

**Status:** done  
**Dependencies:** 100.1, 100.2  

Develop comprehensive mock implementations for `@react-native-firebase/auth`, `firestore`, `storage`, and `messaging` modules to isolate tests from actual Firebase service calls, ensuring fast and reliable unit/integration tests.

**Details:**

Create a directory structure `__mocks__/@react-native-firebase/` in the project root. Within this, create mock files (e.g., `auth.js`, `firestore.js`, `storage.js`, `messaging.js`) that export mock objects mimicking the public API of each Firebase module. For example, `auth` mock should include `signInAnonymously`, `signOut`, `onAuthStateChanged`; `firestore` should include `collection`, `doc`, `add`, `get`, `set`, `update`, `delete`, etc. These mocks should return resolved promises or dummy data to simulate successful operations without actual network requests.

### 100.4. Implement Generic Mock Factories for Common Firebase Data Structures

**Status:** done  
**Dependencies:** 100.3  

Develop reusable factory functions to generate consistent mock objects for common Firebase data structures like `DocumentSnapshot` and `QuerySnapshot`, streamlining the creation of test data.

**Details:**

Within the `__mocks__/@react-native-firebase/firestore.js` or a dedicated test utility file (e.g., `src/__tests__/utils/firebaseMocks.js`), create helper functions like `createMockDocumentSnapshot(id, data, exists = true)` and `createMockQuerySnapshot(docsArray)` that return objects with methods and properties matching the actual Firebase SDK. For `DocumentSnapshot`, this includes `id`, `exists`, and a `data()` method. For `QuerySnapshot`, this includes `docs` (an array of mock document snapshots) and potentially a `forEach` method. These factories will simplify generating test scenarios for Firestore data.
