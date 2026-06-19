# Task ID: 64

**Title:** Set up Firebase Functions Environment and FCM Utilities Module

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Establish the Firebase Cloud Functions project structure, initialize the Firebase Admin SDK, and create a utility module for common FCM operations to be used by various notification triggers.

**Details:**

1. Verify `firebase-admin` and `firebase-functions` package versions are at v23.5.0 in `functions/package.json`. If not, update them.
2. Create the `functions/utils/fcm.js` file.
3. In `fcm.js`, implement `initializeAdmin()` by calling `admin.initializeApp();` (ensure `firebase-admin` is imported).
4. Implement `sendPushNotification(fcmToken, title, body, data)`: This function should use `admin.messaging().send({ token: fcmToken, notification: { title, body }, data })`. Wrap this call in a `try-catch` block to gracefully handle and log any `FirebaseMessagingError` instances, especially for invalid or expired tokens.
5. Implement `getUserFcmToken(userId)`: This function should retrieve the FCM token from `Firestore.collection('users').doc(userId).get()`, specifically `snapshot.data()?.fcmToken`.
6. Implement `sendNotificationToUser(userId, title, body, data)`: This high-level helper will first call `getUserFcmToken(userId)` and then, if a token is found, call `sendPushNotification(token, title, body, data)`.
7. Implement proper logging using `functions.logger.info` for successful operations and `functions.logger.error` for errors, including details about invalid FCM tokens.

**Test Strategy:**

1. Unit test `initializeAdmin()` to ensure it runs without errors and the Admin SDK is properly initialized.
2. Unit test `sendPushNotification` with mock FCM tokens (valid and invalid) to verify payload structure, successful sends, and graceful error handling for invalid tokens (e.g., logging without throwing).
3. Unit test `getUserFcmToken` by mocking Firestore responses for users with and without FCM tokens.
4. Unit test `sendNotificationToUser` by mocking `getUserFcmToken` and `sendPushNotification` to ensure correct flow and error propagation/handling.
5. Deploy a simple HTTP function that calls `fcm.initializeAdmin()` and logs success to verify environment setup in a live Firebase project.

## Subtasks

### 64.1. Verify Firebase Functions Dependencies and Create FCM Utilities File

**Status:** done  
**Dependencies:** None  

Ensure that `firebase-admin` and `firebase-functions` packages in the Firebase Functions project are updated to version v23.5.0 in `functions/package.json`. Subsequently, create the `fcm.js` file within the `functions/utils` directory to house FCM-related utility functions.

**Details:**

Navigate to `C:\JCar\functions` and open `package.json`. In the `dependencies` section, verify and update `firebase-admin` and `firebase-functions` to `^23.5.0`. Run `npm install` in the `functions` directory to apply changes. Create an empty file named `fcm.js` at `C:\JCar\functions\utils\fcm.js`.

### 64.2. Implement Firebase Admin SDK Initialization in FCM Utilities

**Status:** done  
**Dependencies:** 64.1  

Within the newly created `functions/utils/fcm.js` file, import the `firebase-admin` SDK and implement an `initializeAdmin()` function that calls `admin.initializeApp()`. This function will ensure the Firebase Admin SDK is properly set up for subsequent operations.

**Details:**

Edit `C:\JCar\functions\utils\fcm.js`. Add `const admin = require('firebase-admin');` and `const functions = require('firebase-functions');` at the top. Implement and export `const initializeAdmin = () => { if (!admin.apps.length) { admin.initializeApp(); functions.logger.info('Firebase Admin SDK initialized.'); } };`

### 64.3. Implement `sendPushNotification` with Robust Error Handling

**Status:** done  
**Dependencies:** 64.2  

Develop the `sendPushNotification(fcmToken, title, body, data)` function within `functions/utils/fcm.js`. This function will send a push notification using `admin.messaging().send()`. It must include a `try-catch` block to gracefully handle `FirebaseMessagingError` instances (especially for invalid/expired tokens) and log errors using `functions.logger.error`.

**Details:**

In `C:\JCar\functions\utils\fcm.js`, export an `async` function `sendPushNotification(fcmToken, title, body, data)`. Inside, use `try { await admin.messaging().send({ token: fcmToken, notification: { title, body }, data }); functions.logger.info('Successfully sent FCM message', { fcmToken, title }); } catch (error) { if (error.code === 'messaging/invalid-argument' || error.code === 'messaging/registration-token-not-registered') { functions.logger.error('FCM: Invalid or unregistered token', { fcmToken, error: error.message }); } else { functions.logger.error('FCM: Error sending message', { fcmToken, error: error.message }); } throw error; }`

### 64.4. Implement `getUserFcmToken` for Firestore Retrieval

**Status:** done  
**Dependencies:** 64.2  

Create the `getUserFcmToken(userId)` function in `functions/utils/fcm.js`. This function will asynchronously query the 'users' collection in Firestore to retrieve the `fcmToken` field for a given `userId`, returning `undefined` if the user or token is not found.

**Details:**

In `C:\JCar\functions\utils\fcm.js`, export an `async` function `getUserFcmToken(userId)`. Inside, obtain a Firestore instance: `const db = admin.firestore();`. Retrieve the user document: `const userDoc = await db.collection('users').doc(userId).get();`. Return `userDoc.data()?.fcmToken`. Add `functions.logger.warn` if user or token is not found.

### 64.5. Implement `sendNotificationToUser` and Finalize Logging

**Status:** done  
**Dependencies:** 64.3, 64.4  

Implement the `sendNotificationToUser(userId, title, body, data)` helper function in `functions/utils/fcm.js`. This high-level function will orchestrate fetching the FCM token via `getUserFcmToken` and, if available, sending the notification using `sendPushNotification`. Ensure all functions in the module utilize `functions.logger.info` for successes and `functions.logger.error` for failures, providing clear context.

**Details:**

In `C:\JCar\functions\utils\fcm.js`, export an `async` function `sendNotificationToUser(userId, title, body, data)`. Call `const fcmToken = await getUserFcmToken(userId);`. If `fcmToken` is found, call `await sendPushNotification(fcmToken, title, body, data); functions.logger.info('Notification process completed for user', { userId });`. Otherwise, log a warning: `functions.logger.warn('FCM: No token available for user, notification not sent', { userId });`.
