# Task ID: 59

**Title:** Enhance Firestore Listeners with Robust Error Handling and Retry Logic

**Status:** done

**Dependencies:** 36 ✓, 3 ✓, 2 ✓, 54 ✓

**Priority:** medium

**Description:** Implement a reusable utility to wrap Firestore real-time listeners, adding automatic retry with exponential backoff, connection state tracking, and specific error code handling, along with UI indicators for connection status and offline mode.

**Details:**

This task involves creating a new utility, `firestoreListenerHelper.js`, to provide advanced error handling and retry capabilities for Firestore `onSnapshot` listeners. This utility will integrate with existing services and the UI to provide a more resilient and informative user experience.

**1. Create Reusable Listener Wrapper Utility:**
   - **File Location:** `src/utils/firestoreListenerHelper.js` (new file).
   - Define an async function, `createFirestoreListener(collectionRef, queryOptions, callback, onError)`. This function will encapsulate the `onSnapshot` call within a retry loop.
   - Implement an exponential backoff mechanism for retries: Start with 1 second, doubling up to a maximum of 32 seconds. Define `maxRetries` as 5.
   - Track connection state: Use React Context (e.g., `ConnectionContext` in `src/context/ConnectionContext.js` if it exists, otherwise create it) to expose `isConnected`, `isReconnecting`, `retryAttempt`, and `isOfflineMode` globally.
   - The wrapper should manage internal timers and retry attempts, clearing timeouts on successful reconnection or when retries are exhausted.

**2. Implement Retry Logic for Subscription Functions:**
   - Modify the existing subscription functions in `src/services/consultationService.js` (or equivalent file) to use the new wrapper:
     - `subscribeToBuyConsultations`
     - `subscribeToSellConsultations`
     - `subscribeToCompletedConsultations`
   - Each function should now pass its `onSnapshot` logic to `createFirestoreListener`.

**3. Add Connection Status Indicators in UI:**
   - Create a global UI component (e.g., `src/components/ConnectionStatusBanner.js`) that listens to the `ConnectionContext`.
   - Display a 'Reconnecting...' banner when `isReconnecting` is true, optionally showing `retryAttempt`.
   - Display 'Offline Mode (Cached Data)' when `isOfflineMode` is true.
   - Implement a manual 'Refresh' button within the banner or as a global option to trigger an immediate retry/reconnection attempt.

**4. Handle Specific Error Codes Differently:**
   - Inside the `onError` handler of the wrapper, parse the Firebase error code (e.g., `error.code`).
   - `permission-denied`: Do not retry. Log the error and display an 'Authentication/Permission Error' message using `firestoreErrorHandler.js`. Redirect to an error screen or prompt user to contact support.
   - `unavailable` (network issues, transient server errors): Retry with exponential backoff.
   - `unauthenticated`: Do not retry. Redirect the user to the login screen and clear any authentication tokens.
   - Other errors: Use `firestoreErrorHandler.js` for general error logging and consistent messaging. Decide on retry behavior based on error type (e.g., retry for temporary issues, no retry for permanent data errors).

**5. Add Offline Support Indicators:**
   - Leverage Firestore `snapshot.metadata.fromCache` within the `callback` function of the listener wrapper.
   - If `fromCache` is true, set `isOfflineMode` to true in the `ConnectionContext` and ensure the UI reflects 'Offline Mode (Cached Data)'.
   - When operations are performed while offline, they should be queued by Firestore automatically. The UI can show a 'Pending Upload' indicator if relevant to specific data types.

**6. Integrate with `firestoreErrorHandler.js`:**
   - Ensure all non-retryable or exhausted-retry errors are passed to the existing `firestoreErrorHandler.js` utility (as established in Task 3) for consistent logging and user-facing messages. This includes `permission-denied` and `unauthenticated` errors.

**Technical Details:**
- Use `NetInfo` from `@react-native-community/netinfo` to monitor network connectivity and trigger listener re-initialization if the network comes back up after a prolonged disconnection.
- Exponential backoff sequence: 1s, 2s, 4s, 8s, 16s, up to max 32s delay.
- Maximum 5 retry attempts before giving up and reporting a persistent error.
- Implement a React Context provider/consumer pattern for global connection status state.
- Use `snapshot.metadata.fromCache` to distinguish between real-time data and cached data.
- Ensure cleanup: When a component unmounts or a listener is explicitly unsubscribed, clear any pending timeouts/retries.

**Test Strategy:**

1. **Basic Listener Functionality:** Verify that existing listeners (e.g., for buy/sell/completed consultations) continue to function correctly and fetch data in real-time under normal network conditions.
2. **Network Disconnection & Reconnection:**
   - Simulate network loss (e.g., airplane mode, disabling Wi-Fi/data). 
   - Observe the UI for the 'Reconnecting...' banner and verify the retry count increments according to exponential backoff.
   - Re-enable network. Confirm that the listener successfully reconnects, data refreshes, and the 'Reconnecting...' banner disappears.
3. **Offline Data Mode:**
   - Disconnect network. Open the app where consultation data is displayed.
   - Verify that the data is loaded from cache and an 'Offline Mode (Cached Data)' indicator is shown.
   - Make a change in Firestore via console. Reconnect network. Verify data refreshes to the latest version.
4. **Retry Limit Exceeded:**
   - Keep the network disconnected for a duration exceeding 5 retry attempts (e.g., ~1 + 2 + 4 + 8 + 16 + 32s). 
   - Verify that after max retries, the 'Reconnecting...' banner is replaced with a persistent error message (using `firestoreErrorHandler.js`) and no further retries occur automatically.
5. **Specific Error Codes:**
   - **`permission-denied`:** Temporarily modify Firestore security rules or user roles to trigger a `permission-denied` error for a specific listener. Verify that the listener stops, no retries occur, and an appropriate 'Permission Denied' message is displayed via `firestoreErrorHandler.js`.
   - **`unauthenticated`:** Temporarily invalidate the user's authentication token (e.g., clear from AsyncStorage or Firebase Auth internal state). Verify the user is redirected to the login screen and the listener does not retry.
   - **`unavailable`:** Simulate this by blocking specific Firebase endpoints if possible, or rely on network disconnection tests which often produce this. Verify it triggers exponential backoff retries.
6. **UI Integration:** Ensure the `ConnectionStatusBanner` (or similar) is consistently displayed and updated based on the context state across different screens where listeners are active.
7. **Resource Cleanup:** Test unmounting a component with an active listener. Verify that all retry timers are cleared and no memory leaks or background processes persist.
