# Task ID: 6

**Title:** Write Unit Tests for Critical Functions

**Status:** done

**Dependencies:** 4 ✓

**Priority:** medium

**Description:** Write a suite of unit tests for existing critical business logic, focusing on services, formatters, and validators to improve code reliability.

**Details:**

Using the Jest framework set up in Task 4, create test files for the following: 
- `firebaseService.js`: Mock Firebase functions using `jest.mock` to test data fetching, vehicle registration, and consultation request logic without making actual API calls. 
- **Validators**: Test input validation functions for forms (e.g., email format, password strength, vehicle year). Test with both valid and invalid inputs. 
- **Formatters**: Test utility functions that format data for display (e.g., currency formatters for price, date formatters for timestamps).

**Test Strategy:**

1. Run all tests via `npm test` and ensure they pass. 2. Integrate a code coverage tool like `jest --coverage` to measure test effectiveness. Aim for an initial coverage of over 70% for the targeted files. 3. Ensure tests are run as part of the pre-commit hook.

## Subtasks

### 6.1. Create Test Setup for firebaseService.js with Firebase Mocks

**Status:** done  
**Dependencies:** None  

Create a `firebaseService.test.js` file and implement the necessary mocks for the `@react-native-firebase/firestore` module using `jest.mock`. This foundational step will prevent actual database calls during tests.

**Details:**

In the new `__tests__/services/firebaseService.test.js` file, use `jest.mock('@react-native-firebase/firestore', () => { ... })` to return a mock implementation. The mock should allow for spying on and controlling the behavior of functions like `collection`, `doc`, `get`, and `add` for subsequent tests.
<info added on 2025-11-27T14:05:30.443Z>
Global mocks have been configured in `jest.setup.js`, centralizing the setup for all tests. This includes mocks for Firebase messaging, functions, and crashlytics. A mock for `PermissionsAndroid` has also been added to support testing for Android 13+ permissions.
</info added on 2025-11-27T14:05:30.443Z>

### 6.2. Write Unit Tests for Data Fetching Functions in firebaseService.js

**Status:** done  
**Dependencies:** 6.1  

Using the mock setup from the previous task, write unit tests for the data retrieval functions in `firebaseService.js`, specifically `getVehicles` and `getUserProfile`. Tests should cover both successful and empty/failed responses.

**Details:**

For `getVehicles`, mock a successful response from `firestore().collection('vehicles').get()` and assert that the function correctly maps and returns the documents. For `getUserProfile`, test the case where a document is found and the case where it isn't, ensuring it returns user data or null accordingly.

### 6.3. Write Unit Tests for Data Writing Functions in firebaseService.js

**Status:** done  
**Dependencies:** 6.1  

Write unit tests for the functions that perform write operations, such as `registerVehicle` and `createConsultationRequest`. The tests should verify that the correct data payload is passed to the mocked Firestore functions.

**Details:**

For each write function, create a test that calls the function with sample data. Use `expect(mockedAddFunction).toHaveBeenCalledWith(...)` to assert that the mocked Firestore `add` method was called with the exact object structure expected.

### 6.4. Implement Unit Tests for Validator and Formatter Utilities

**Status:** done  
**Dependencies:** None  

Create test files for `validators.js` and `formatters.js`. Write a comprehensive suite of tests covering all functions with both valid and invalid inputs to ensure they behave as expected across various edge cases.

**Details:**

Create `__tests__/utils/validators.test.js` and `__tests__/utils/formatters.test.js`. For validators (e.g., `isValidEmail`, `isStrongPassword`), test with multiple valid and invalid strings. For formatters (e.g., `formatCurrency`, `formatDate`), test with numbers, valid timestamp objects, and null/undefined inputs to ensure robust formatting.

### 6.5. Run Test Suite and Generate Code Coverage Report

**Status:** done  
**Dependencies:** 6.2, 6.3, 6.4  

Execute the entire test suite and use Jest's built-in coverage tool to generate a report. Analyze the report to ensure the newly tested files meet the project's target coverage of over 70%.

**Details:**

Run the command `npm test -- --coverage` in the terminal. This will execute all tests and create a `coverage/` directory. Open the `lcov-report/index.html` file in a browser to review the statement, branch, and function coverage for the targeted files. If coverage is below 70%, add tests for any missed logic.
