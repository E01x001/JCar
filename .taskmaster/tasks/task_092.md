# Task ID: 92

**Title:** Implement Global Error Handler for Mapping Firebase Errors to Korean Messages and Crashlytics Reporting

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Standardize error handling by mapping Firebase error codes to user-friendly Korean messages and automatically reporting errors to Crashlytics.

**Details:**

Extend `utils/errorHandler.js` with a comprehensive error mapping mechanism. Create a `ERROR_MESSAGES` object that maps common Firebase error codes (e.g., `auth/user-not-found`, `auth/wrong-password`, `permission-denied`, `unavailable`) to localized Korean user-friendly messages. Modify all service functions and API calls to process errors through this handler, ensuring raw Firebase errors are never exposed to the user. Integrate Firebase Crashlytics to automatically log all caught errors for monitoring and debugging.

**Test Strategy:**

Simulate various Firebase errors (e.g., incorrect login credentials, unauthorized Firestore access, network unavailability). Verify that the application displays the correct, user-friendly Korean error message to the user. Check the Firebase Crashlytics dashboard to confirm that all errors are being reported automatically with relevant context.

## Subtasks

### 92.1. Extend utils/errorHandler.js with a Firebase Error to Korean Message Map

**Status:** done  
**Dependencies:** None  

Create a comprehensive mapping object within `utils/errorHandler.js` that translates common Firebase error codes into user-friendly, localized Korean messages. This will serve as the dictionary for all subsequent error handling.

**Details:**

Define and export a constant object named `ERROR_MESSAGES`. Populate this object with key-value pairs where the key is the Firebase error code (e.g., 'auth/user-not-found', 'permission-denied') and the value is the corresponding Korean text. Include a default message for unmapped errors.

### 92.2. Integrate Firebase Crashlytics Reporting into the Global Error Handler

**Status:** done  
**Dependencies:** 92.1  

Modify the global error handler to automatically report all processed errors to Firebase Crashlytics. This will centralize error monitoring and provide valuable debugging information.

**Details:**

Import the Firebase Crashlytics SDK into `utils/errorHandler.js`. In the main error handling function, add a call to `crashlytics().recordError(error)` to ensure every exception passed to the handler is logged. Consider adding contextual logs for better diagnostics.

### 92.3. Refactor Service Layer and API Calls to Use the New Error Handler

**Status:** done  
**Dependencies:** 92.2  

Systematically refactor all `try...catch` blocks across the application, especially in service functions and API calls, to route all exceptions through the new global error handler. This will ensure consistent user-facing messages and complete Crashlytics reporting.

**Details:**

Audit the codebase, focusing on `.catch(error => { ... })` blocks that handle Firebase operations. Replace the existing logic with a call to the unified error handler, which will now manage both message localization and Crashlytics reporting.
