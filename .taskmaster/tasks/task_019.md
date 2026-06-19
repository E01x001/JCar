# Task ID: 19

**Title:** Implement Global Toast Message System

**Status:** done

**Dependencies:** 11 ✓

**Priority:** medium

**Description:** Set up a global system to display toast messages for success, error, and info feedback, accessible from anywhere in the app.

**Details:**

Use a library like `react-native-toast-message` or build a custom solution using a global context provider. Create a `ToastProvider` at the app's root. Define custom toast types ('success', 'danger', 'info') that map to the semantic colors in the theme. Expose a hook like `useToast()` which provides functions (`toast.showSuccess(message)`, `toast.showError(message)`) to trigger toasts from any component.

**Test Strategy:**

Create a test screen with buttons to trigger each type of toast message. Verify that they appear with the correct background color, text color, and content, and that they disappear automatically after a few seconds. Ensure the toast can be triggered from various places in the component tree.

## Subtasks

### 19.1. Install and Configure react-native-toast-message

**Status:** done  
**Dependencies:** None  

Add the `react-native-toast-message` library to the project dependencies and perform any necessary native configuration for both iOS and Android platforms.

**Details:**

Run `npm install react-native-toast-message` or `yarn add react-native-toast-message`. Follow the library's documentation to add required code to `MainActivity.java` for Android and potentially `AppDelegate.m` for iOS if needed. Ensure the project builds successfully after installation.

### 19.2. Define Custom Toast Components and Configuration

**Status:** done  
**Dependencies:** 19.1  

Create custom React components for 'success', 'danger', and 'info' toast types. These components will use the semantic colors defined in the application's theme.

**Details:**

Create a `toastConfig.js` file. In this file, import the `BaseToast` from the library and extend it to create custom components. For each type ('success', 'danger', 'info'), set the `style` and `text1Style` properties using the corresponding colors from the theme (e.g., `theme.colors.semantic.success`).

### 19.3. Integrate Toast Provider at App Root

**Status:** done  
**Dependencies:** 19.1, 19.2  

Wrap the root of the application with the Toast provider component to make it available globally across all screens.

**Details:**

In the main `App.tsx` file, import the `Toast` component from `react-native-toast-message` and the custom configuration from `toastConfig.js`. Render `<Toast config={toastConfig} />` as the last child within the root view or fragment, ensuring it overlays all other content.

### 19.4. Create a `useToast` Hook for Global Access

**Status:** done  
**Dependencies:** 19.3  

Develop a custom hook named `useToast` that encapsulates the logic for showing different types of toasts, providing a clean and reusable API.

**Details:**

Create a new file `src/hooks/useToast.ts`. This hook will import the `Toast` API from the library. It should return an object with methods like `showSuccess(message, options)`, `showError(message, options)`, and `showInfo(message, options)`. Each method will call `Toast.show()` with the corresponding `type` ('success', 'danger', 'info') and the passed message.

### 19.5. Implement a Test Screen and Verify All Toast Types

**Status:** done  
**Dependencies:** 19.4  

Create or modify a development/test screen with buttons to trigger each type of toast message using the `useToast` hook.

**Details:**

Add a new screen or a section in an existing developer settings screen. Add three buttons: 'Show Success', 'Show Error', and 'Show Info'. In the component, call the `useToast()` hook and link each button's `onPress` to the corresponding function (`showSuccess`, `showError`, `showInfo`) with a sample message.
