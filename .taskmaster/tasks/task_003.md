# Task ID: 3

**Title:** Implement Global Error Handling & Logging

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Establish a comprehensive error handling and logging strategy using a global error boundary and a structured logging service like Firebase Crashlytics.

**Details:**

1. Integrate `react-native-firebase/app` and `react-native-firebase/crashlytics`. Follow the setup instructions for both Android and iOS. 2. Create a global error boundary component using a class component with `componentDidCatch`. This boundary should wrap the root `App` component. When it catches an error, it should log the error to Crashlytics (`crashlytics().recordError(error)`) and display a user-friendly fallback UI. 3. Wrap all Firebase API calls (Firestore, Auth, Storage) in try/catch blocks. In the catch block, log the error to Crashlytics and display a localized, user-friendly message to the user via a toast or alert.

**Test Strategy:**

1. Create a test button in a development build that intentionally throws an error to verify the error boundary is triggered and the error is logged to the Firebase Crashlytics console. 2. Simulate network failures to test the retry logic and error handling for Firebase operations. 3. Manually test form submissions with invalid data to ensure catch blocks are working as expected.

## Subtasks

### 3.1. Install and Configure Firebase App and Crashlytics SDKs

**Status:** done  
**Dependencies:** None  

Add the `@react-native-firebase/app` and `@react-native-firebase/crashlytics` packages to the project and perform the necessary native platform setup for both Android and iOS to enable Firebase services.

**Details:**

Follow the official react-native-firebase documentation. For Android, add the `google-services.json` file and update the `build.gradle` files with the Google services plugin and Crashlytics dependencies. For iOS, add `GoogleService-Info.plist` to Xcode, update the `AppDelegate` file, and run `pod install` in the `ios` directory.
<info added on 2025-11-27T04:23:21.611Z>
Android setup completed for @react-native-firebase/crashlytics v23.5.0. This included adding the `firebase-crashlytics-gradle:3.0.2` dependency to `android/build.gradle` and applying the `com.google.firebase.crashlytics` plugin in `android/app/build.gradle`. The necessary INTERNET permission was already present in AndroidManifest.xml.
</info added on 2025-11-27T04:23:21.611Z>

### 3.2. Create a Global Error Boundary Component

**Status:** done  
**Dependencies:** 3.1  

Implement a new class component named `ErrorBoundary` that catches JavaScript rendering errors in its child component tree, logs them to Crashlytics, and displays a user-friendly fallback UI.

**Details:**

Create a new file, for example, `src/components/ErrorBoundary.tsx`. This file will export a class component that extends `React.Component`. Implement the `getDerivedStateFromError` and `componentDidCatch(error, errorInfo)` lifecycle methods. Inside `componentDidCatch`, call `crashlytics().recordError(error)`. The component's state should track an `hasError` flag to conditionally render a fallback UI instead of the child components when an error is caught.
<info added on 2025-11-27T04:24:25.512Z>
The component's fallback UI displays user-friendly messages in Korean. For easier debugging, detailed error information is shown when the application is in development mode. A reset button was also added to allow users to retry the operation.
</info added on 2025-11-27T04:24:25.512Z>

### 3.3. Integrate Error Boundary at the Application Root

**Status:** done  
**Dependencies:** 3.2  

Wrap the main application component with the newly created `ErrorBoundary` to ensure it can catch rendering errors that occur anywhere within the component tree.

**Details:**

Locate the application's root component file (e.g., `App.tsx` or `index.js`). Import the `ErrorBoundary` component and wrap the main rendered component (e.g., `<App />`) with `<ErrorBoundary>...</ErrorBoundary>`. This will make the error handling global for the entire React component tree.
<info added on 2025-11-27T04:25:17.577Z>
The ErrorBoundary component has been integrated in `src/App.js` at the application root. It now wraps both the `AuthProvider` and `AppNavigator`, ensuring that errors throughout the component tree are caught and logged to Firebase Crashlytics. To preserve gesture functionality, the error boundary is nested inside `GestureHandlerRootView`.
</info added on 2025-11-27T04:25:17.577Z>

### 3.4. Refactor Firebase API Calls with try/catch Blocks

**Status:** done  
**Dependencies:** 3.1  

Systematically review and refactor all asynchronous Firebase operations (e.g., Firestore, Auth, Storage) to include `try/catch` blocks for robust error handling and logging of non-component errors.

**Details:**

Search the codebase for all asynchronous interactions with Firebase services, such as `firestore().collection().get()`, `auth().signInWithEmailAndPassword()`, etc. Enclose these calls within `try/catch` blocks. In each `catch (error)` block, log the error using `crashlytics().recordError(error)` and implement a user-facing feedback mechanism, such as a toast notification or an alert, to inform the user of the failure.
<info added on 2025-11-27T04:28:48.585Z>
Refactored all major Firebase API calls to include Crashlytics error logging. Added crashlytics().recordError() and crashlytics().log() to catch blocks in: src/services/firebaseService.js (all functions), src/context/AuthContext.js (user data loading), src/screens/LoginScreen.js (login), src/screens/ForgotPasswordScreen.js (password reset), src/screens/MyPageScreen.js (logout, delete account, vehicle/consultation snapshot errors). All Firebase operations now log errors to Crashlytics with descriptive messages for better debugging and monitoring.
</info added on 2025-11-27T04:28:48.585Z>

### 3.5. Implement and Test a Crash Trigger for Verification

**Status:** done  
**Dependencies:** 3.3, 3.4  

Add a development-only mechanism to intentionally trigger a JavaScript error and a native crash to fully verify that the Error Boundary and Crashlytics are configured and working correctly.

**Details:**

In a settings or debug screen, add two buttons that are only rendered if `__DEV__` is true. The first button's `onPress` handler should execute `throw new Error('Test JS Error from UI');`. The second button's handler should call `crashlytics().crash()`. Use these buttons to test the end-to-end error reporting flow.
<info added on 2025-11-27T04:30:14.286Z>
A crash trigger test button was added to AdminPageScreen.js, visible only during development (__DEV__). When pressed, it logs a test message, sets a test attribute, and records a test error to Crashlytics. This allows for verification that errors, along with their descriptive messages and metadata, are successfully logged to the Firebase Crashlytics console.
</info added on 2025-11-27T04:30:14.286Z>
