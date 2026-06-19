# Task ID: 4

**Title:** Setup Testing Framework and Code Quality Tools

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Configure Jest for unit testing, ESLint for static code analysis, and Husky for pre-commit hooks to enforce code quality and testing standards.

**Details:**

1. **Jest**: Install Jest and the `react-native` preset. Configure `jest.config.js` to set up mocks for native modules and assets. 2. **ESLint**: Initialize ESLint with a recommended ruleset like `@react-native-community/eslint-config`. Create a `.eslintrc.js` file and add rules to enforce project coding standards. Add an `npm run lint` script to `package.json`. 3. **Husky**: Install Husky and `lint-staged`. Configure a `pre-commit` hook in the Husky configuration to run ESLint and Jest on staged files (`npx lint-staged`). This will prevent commits with linting errors or failing tests.

**Test Strategy:**

1. Create a simple test file for a utility function and run `npm test` to ensure Jest is configured correctly. 2. Intentionally introduce a linting error in a file, stage it, and try to commit. Verify that the pre-commit hook fails and prevents the commit. 3. Fix the error and verify the commit succeeds.

## Subtasks

### 4.1. Install and Configure ESLint

**Status:** done  
**Dependencies:** None  

Install ESLint and the recommended '@react-native-community/eslint-config' package. Create a root '.eslintrc.js' configuration file to establish a baseline for code style.

**Details:**

Use npm or yarn to install the necessary development dependencies: `eslint` and `@react-native-community/eslint-config`. Create a `.eslintrc.js` file in the project root and configure it to extend the community ruleset: `module.exports = {root: true, extends: '@react-native-community/eslint-config'};`.
<info added on 2025-11-27T04:42:22.088Z>
The configuration in `.eslintrc.js` was enhanced with comprehensive rules for React Native development, including: console statement prevention, React hooks validation, code quality standards (no-unused-vars, prefer-const, no-var), React Native best practices (no-inline-styles), and general best practices (eqeqeq, curly, no-duplicate-imports). A `.eslintignore` file was also created to exclude `node_modules`, build directories, and config files. A scan with the new configuration identified 425 existing issues (91 errors, 334 warnings). These should be addressed in a separate cleanup task, noting that many issues are auto-fixable with the `--fix` flag.
</info added on 2025-11-27T04:42:22.088Z>

### 4.2. Add 'lint' Script to package.json

**Status:** done  
**Dependencies:** 4.1  

Add a `lint` script to the `package.json` file to provide a standardized way to run static code analysis across the entire project.

**Details:**

In the `scripts` section of the `package.json` file, add a new script: `"lint": "eslint . --ext .js,.jsx,.ts,.tsx"`. This will allow developers to run the linter with the command `npm run lint`.
<info added on 2025-11-27T04:43:09.892Z>
Added the `lint:fix` script to `package.json` to automatically resolve fixable issues using the `--fix` flag. This is effective for the large number of auto-fixable issues reported by ESLint, such as 232 of 334 warnings and 68 of 91 errors.
</info added on 2025-11-27T04:43:09.892Z>

### 4.3. Install and Configure Jest

**Status:** done  
**Dependencies:** None  

Install Jest and its required dependencies for a React Native environment. Create and configure the `jest.config.js` file to set up the testing framework.

**Details:**

Install `jest`, `@testing-library/react-native`, `@testing-library/jest-native`, and other necessary peer dependencies. Create a `jest.config.js` file at the project root. Set the `preset` to `'react-native'` and configure any required mocks for native modules, assets, or navigation libraries.
<info added on 2025-11-27T04:46:47.246Z>
The jest.config.js file was created with the 'react-native' preset, and transformIgnorePatterns was configured for React Native libraries. Code coverage collection has been enabled. A jest.setup.js file was added to handle global mocks for Firebase services (Auth, Firestore, Storage, Crashlytics), React Navigation, Vector Icons, and AsyncStorage. Static assets are mocked using fileMock.js and styleMock.js within a new __mocks__ directory.
</info added on 2025-11-27T04:46:47.246Z>

### 4.4. Create a Sample Component Test

**Status:** done  
**Dependencies:** 4.3  

Create an initial test file for a simple component to ensure the Jest configuration is working correctly and to establish a pattern for future tests.

**Details:**

Create a `__tests__` directory if it doesn't exist. Inside, create a test file such as `App-test.tsx`. Write a basic test that renders the App component and checks if it matches a snapshot or if a specific element is present.
<info added on 2025-11-27T04:47:59.848Z>
A comprehensive test suite for utility functions was created in `src/utils/format.test.js`, with 10 test cases covering various scenarios for `formatPhone` and `formatPrice`. A module resolution error was fixed by removing the `NativeAnimatedHelper` mock from `jest.setup.js`. All tests now pass, confirming the Jest environment is fully functional.
</info added on 2025-11-27T04:47:59.848Z>

### 4.5. Set Up Husky and lint-staged Pre-commit Hook

**Status:** done  
**Dependencies:** 4.2, 4.4  

Install and configure Husky and `lint-staged` to create a pre-commit hook. This hook will automatically run ESLint and Jest on staged files, preventing commits with errors.

**Details:**

Run `npx husky-init && npm install` to set up Husky. Install `lint-staged`. In `package.json`, add a `"lint-staged"` configuration object to specify commands for different file types, for example `"*.{js,ts,jsx,tsx}": ["eslint --fix", "jest --bail --findRelatedTests"]`. Modify the generated `.husky/pre-commit` file to run `npx lint-staged`.
<info added on 2025-11-27T04:49:21.261Z>
Successfully set up Husky and lint-staged for pre-commit hooks. Installed husky@9.1.7 and lint-staged@16.2.7. Initialized Husky which added the 'prepare' script to package.json. Configured lint-staged in package.json to run 'eslint --fix' and 'jest --bail --findRelatedTests' on staged *.js and *.jsx files. The .husky/pre-commit hook was updated to run 'npx lint-staged'. This ensures code quality by automatically linting and testing only staged files before commits, preventing commits with linting errors or failing tests.
</info added on 2025-11-27T04:49:21.261Z>
