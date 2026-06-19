# Task ID: 63

**Title:** Migrate React Native Firebase to v22 Modular API

**Status:** done

**Dependencies:** 62 ✓, 59 ✓, 51 ✓

**Priority:** high

**Description:** Migrate all deprecated namespaced React Native Firebase API calls for Crashlytics and Messaging to the new modular API to ensure compatibility with v22, as the namespaced API will be removed.

**Details:**

This task involves a systematic migration of deprecated React Native Firebase namespaced API calls to their v22 modular equivalents. The migration specifically targets Crashlytics and Messaging modules, as Firestore has already been migrated.

**Affected Files - Crashlytics (17 files):**
1. src/services/firebaseService.js
2. src/screens/AdminOwnedVehicleDetailScreen.js
3. src/screens/UserConsultationDetailScreen.js
4. src/utils/firestoreErrorHandler.js
5. src/screens/MyPageScreen.js
6. src/screens/LoginScreen.js
7. src/screens/ForgotPasswordScreen.js
8. src/screens/AdminPageScreen.js
9. src/context/AuthContext.js
10. src/utils/firestoreListenerHelper.js
11. src/components/OwnedVehiclesList.js
12. src/services/ownershipTransferService.js
13. src/hooks/useVehicleStats.js
14. src/hooks/useConsultationStats.js
15. src/screens/AdminOwnershipHistoryScreen.js
16. src/hooks/useOwnershipStats.js
17. src/components/ErrorBoundary.js

**Affected Files - Messaging (3 files):**
1. src/services/firebaseService.js
2. src/context/AuthContext.js
3. src/App.js

**Migration Pattern - Crashlytics:**
Before (deprecated):
```javascript
import crashlytics from '@react-native-firebase/crashlytics';
crashlytics().recordError(error);
crashlytics().log('message');
```
After (v22 compatible):
```javascript
import { getCrashlytics, recordError, log } from '@react-native-firebase/crashlytics';
const crashlyticsInstance = getCrashlytics();
recordError(crashlyticsInstance, error);
log(crashlyticsInstance, 'message');
```

**Migration Pattern - Messaging:**
Before (deprecated):
```javascript
import messaging from '@react-native-firebase/messaging';
messaging().getToken();
messaging().requestPermission();
```
After (v22 compatible):
```javascript
import { getMessaging, getToken, requestPermission } from '@react-native-firebase/messaging';
const messagingInstance = getMessaging();
await getToken(messagingInstance);
await requestPermission(messagingInstance);
```

**Implementation Steps:**
1.  **Create Utility Helper Functions (Optional but Recommended):** For common Crashlytics and Messaging operations, consider creating small wrapper functions (e.g., `reportCrashlyticsError`, `getFCMToken`) to encapsulate the new modular API calls and simplify usage across the codebase. Place these in a relevant service file like `src/services/firebaseService.js` or a new utility file.
2.  **Update Imports:** In all listed affected files, update `import crashlytics from '@react-native-firebase/crashlytics';` to `import { getCrashlytics, recordError, log } from '@react-native-firebase/crashlytics';` (and similarly for Messaging).
3.  **Replace Deprecated API Calls:** Systematically go through each affected file and replace all instances of `crashlytics().method()` with `method(crashlyticsInstance, ...)`, and `messaging().method()` with `method(messagingInstance, ...)`. Ensure to retrieve the module instance first (e.g., `const crashlyticsInstance = getCrashlytics();`).
4.  **Review `src/services/firebaseService.js` and `src/context/AuthContext.js`:** These files are central and will require careful attention to ensure all Firebase-related initializations and calls are updated correctly.
5.  **Test Each Module:** After migrating a set of files related to a specific module (e.g., Crashlytics), perform initial testing to ensure basic functionality.
6.  **Enable Strict Mode:** For final verification, ensure `RNFB_MODULAR_DEPRECATION_STRICT_MODE` is enabled to catch any remaining deprecated calls during development or testing.

**References:**
- React Native Firebase v22 Migration Guide: https://rnfirebase.io/migrating-to-v22

**Test Strategy:**

1.  **Successful Build:** Ensure the application builds without compilation errors after migration.
2.  **Error Logging Verification:** Trigger various error scenarios (e.g., simulated runtime errors, API call failures) across different screens and components. Verify that errors are correctly logged to Crashlytics by checking the Firebase Crashlytics dashboard.
3.  **FCM Token Retrieval & Messaging:** Log in to the application and ensure the FCM token is successfully retrieved. Verify that push notifications can be sent and received (if implemented and relevant for the app).
4.  **Strict Mode Deprecation Check:** Run the application with `RNFB_MODULAR_DEPRECATION_STRICT_MODE` enabled. Monitor the console for any warnings or errors indicating the use of deprecated namespaced APIs. Address any found instances.
5.  **Full Regression Testing:** Conduct a full regression test of the application's core functionalities to ensure no side effects or regressions were introduced by the API migration. Pay close attention to features involving user authentication, data fetching, and background services.

## Subtasks

### 63.1. Implement Modular API Wrapper Functions for Crashlytics and Messaging

**Status:** done  
**Dependencies:** None  

Create centralized utility functions to encapsulate the new v22 modular API calls for Crashlytics (e.g., `reportCrashlyticsError`, `logCrashlyticsMessage`) and Messaging (e.g., `getFCMToken`, `requestFCMNotificationPermission`). These wrappers will be placed in `src/services/firebaseService.js` to simplify usage across the codebase and abstract away direct modular calls.

**Details:**

In `src/services/firebaseService.js`, add new functions that leverage `getCrashlytics()` and `getMessaging()` instances. For Crashlytics, implement `reportCrashlyticsError(error)` (which internally calls `recordError(getCrashlytics(), error)`) and `logCrashlyticsMessage(message)` (calling `log(getCrashlytics(), message)`). For Messaging, implement `getFCMToken()` (calling `getToken(getMessaging())`) and `requestFCMNotificationPermission()` (calling `requestPermission(getMessaging())`).

### 63.2. Migrate Crashlytics Imports and API Calls to Modular API

**Status:** done  
**Dependencies:** 63.1  

Systematically update all 17 affected files that use Crashlytics. Replace the deprecated `import crashlytics from '@react-native-firebase/crashlytics';` with `import { getCrashlytics, recordError, log } from '@react-native-firebase/crashlytics';`. Subsequently, replace all instances of `crashlytics().method(...)` with calls to the newly created wrapper functions (e.g., `reportCrashlyticsError(error)`) or direct modular calls (e.g., `recordError(getCrashlytics(), error)`).

**Details:**

Iterate through each of the 17 Crashlytics-affected files, including `src/screens/AdminOwnedVehicleDetailScreen.js`, `src/utils/firestoreErrorHandler.js`, `src/components/ErrorBoundary.js`, and others. For each file, update the import statement and then replace all calls like `crashlytics().recordError(error)` with `reportCrashlyticsError(error)` (assuming the wrapper is used). Ensure `getCrashlytics()` is called if direct modular API is used.

### 63.3. Migrate Messaging Imports and API Calls to Modular API

**Status:** done  
**Dependencies:** 63.1  

Update all 3 affected files that use Messaging. Replace the deprecated `import messaging from '@react-native-firebase/messaging';` with `import { getMessaging, getToken, requestPermission } from '@react-native-firebase/messaging';`. Then, replace all instances of `messaging().method(...)` with calls to the newly created wrapper functions (e.g., `getFCMToken()`) or direct modular calls (e.g., `getToken(getMessaging())`).

**Details:**

Iterate through each of the 3 Messaging-affected files: `src/services/firebaseService.js`, `src/context/AuthContext.js`, and `src/App.js`. For each file, update the import statement and then replace calls like `messaging().getToken()` with `getFCMToken()` (assuming the wrapper is used). Ensure `getMessaging()` is called if direct modular API is used.

### 63.4. Review and Refactor Central Firebase Service and Context Files

**Status:** done  
**Dependencies:** 63.2, 63.3  

Perform a thorough review and refactor of `src/services/firebaseService.js` and `src/context/AuthContext.js`. These central files contain critical Firebase initializations and interactions. Ensure all Crashlytics and Messaging-related code segments are fully compliant with the v22 modular API and leverage the wrapper functions created in subtask 1 where appropriate.

**Details:**

In `src/services/firebaseService.js`, verify global Firebase setup, ensuring `getCrashlytics()` and `getMessaging()` are used consistently for instance retrieval. In `src/context/AuthContext.js`, review any lifecycle methods or effect hooks that might interact with Messaging for token management or Crashlytics for error reporting, ensuring they use the new modular patterns or wrapper functions.

### 63.5. Enable Strict Mode and Perform Comprehensive Regression Testing

**Status:** done  
**Dependencies:** 63.4  

After all migration steps are complete, enable `RNFB_MODULAR_DEPRECATION_STRICT_MODE` in the build configuration to aggressively detect any remaining deprecated API calls. Conduct a comprehensive regression test cycle to ensure the stability and functionality of all features reliant on Crashlytics for error logging and Messaging for notifications, as well as general application stability.

**Details:**

Add `RNFB_MODULAR_DEPRECATION_STRICT_MODE=true` to the relevant build configuration (e.g., in `metro.config.js` or via environment variables for the build process). Perform extensive manual testing across all application screens and features. Specifically test error paths for Crashlytics and notification reception/interaction for Messaging. Monitor both console and Crashlytics dashboard for verification.
