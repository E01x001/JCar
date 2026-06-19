# Task ID: 71

**Title:** Secure API Credentials with react-native-config

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Remove hardcoded API authorization token and sensitive credentials by implementing `react-native-config` for environment variable management.

**Details:**

Create `.env.example` and `.env` files in the project root. Add `.env` to `.gitignore`. Install `react-native-config` (`yarn add react-native-config` and link native modules if necessary). Move the API authorization token from `VehicleRegistrationScreen.js:66` and any other sensitive keys to `.env`. Update code to use `Config.VARIABLE_NAME`. Document the environment setup instructions in the project's README.

**Test Strategy:**

Perform a `grep -r 'your_hardcoded_token'` to ensure no hardcoded credentials remain in the codebase. Build and run the app to verify that all necessary secrets are loaded correctly from environment variables. Check the production build artifact to ensure `.env` file content is not exposed.

## Subtasks

### 71.1. Install react-native-config and Configure Environment Files

**Status:** done  
**Dependencies:** None  

Install the react-native-config package, link native modules if necessary, and set up the initial .env and .env.example files, ensuring .env is ignored by Git.

**Details:**

Execute `yarn add react-native-config`. Manually link native modules if `react-native link` is not sufficient or if using a newer React Native version where auto-linking might fail. Create `.env.example` and an empty `.env` file in the project root. Add `.env` to the project's `.gitignore` to prevent sensitive data from being committed.

### 71.2. Identify and Migrate Sensitive Credentials to .env

**Status:** done  
**Dependencies:** 71.1  

Locate all hardcoded API keys and sensitive credentials within the codebase and move them into the newly created `.env` file.

**Details:**

Specifically identify the API authorization token from `VehicleRegistrationScreen.js:66`. Perform a thorough search across the project for any other hardcoded sensitive keys (e.g., API keys, secret tokens, database credentials). Define corresponding environment variables (e.g., `API_AUTH_TOKEN`, `SOME_OTHER_KEY`) in the `.env` file for each identified credential.

### 71.3. Update Code to Use Config Variables

**Status:** done  
**Dependencies:** 71.2  

Modify the application's source code to replace direct references to hardcoded sensitive credentials with dynamically loaded variables from `react-native-config`.

**Details:**

Import `Config` from `react-native-config` in relevant files. Update all instances where sensitive credentials were used (e.g., `VehicleRegistrationScreen.js:66`) to use `Config.VARIABLE_NAME`. For example, `Config.API_AUTH_TOKEN`. Ensure all variables defined in `.env` are correctly referenced in the code.

### 71.4. Document Environment Setup and Verify Security

**Status:** done  
**Dependencies:** 71.3  

Add clear instructions to the project's README for setting up environment variables and perform final verification of credential security.

**Details:**

Update the project's `README.md` with a new section detailing how to set up the `.env` file based on `.env.example`, including instructions on how to obtain necessary API keys. Conduct final security checks: build the app for production and inspect the artifact to ensure `.env` content is not exposed. Run `grep -r 'your_hardcoded_token'` one last time.
