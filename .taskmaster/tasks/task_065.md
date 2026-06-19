# Task ID: 65

**Title:** Implement Consultation Approval Notification

**Status:** done

**Dependencies:** 64 ✓

**Priority:** high

**Description:** Create a Firebase Cloud Function that triggers when a consultation request's status changes from 'pending' to 'approved' and sends a push notification to the associated user.

**Details:**

1. Create the file `functions/triggers/consultationNotifications.js`.
2. Import necessary Firebase Functions modules and the FCM utility functions from `functions/utils/fcm.js`.
3. Implement an `onUpdate` Firestore trigger for `consultation_requests/{id}` named `onConsultationApproved`.
4. Inside the trigger, check if `change.before.data().consultationStatus` was 'pending' and `change.after.data().consultationStatus` is 'approved'.
5. Extract `preferredDate`, `preferredTime`, `id` (as `consultationId`), and `userId` from `change.after.data()`.
6. Construct the notification payload:
   - Title: "상담 승인"
   - Body: `"${preferredDate} ${preferredTime} 상담이 승인되었습니다."`
   - Data: `{ type: "consultation_approved", consultationId: consultationId, screen: "UserConsultationDetail" }`
7. Call `sendNotificationToUser(userId, title, body, data)` from the FCM utility module. Ensure that missing or invalid FCM tokens are handled gracefully by the utility function.

**Test Strategy:**

1. Unit test the payload generation logic to ensure dynamic data is correctly inserted into the title, body, and data fields.
2. Integration test: Deploy the function to a Firebase project. Manually update a `consultation_requests` document in the Firestore Console, changing `consultationStatus` from 'pending' to 'approved'.
3. Verify that a push notification is received on a test device running the JCar app in foreground, background, and quit states.
4. Confirm that tapping the notification correctly deep links to the `UserConsultationDetail` screen.
5. Check Cloud Functions logs for successful notification send records and any error logs for edge cases (e.g., missing FCM token).

## Subtasks

### 65.1. Create consultation notification file and import modules

**Status:** done  
**Dependencies:** None  

Create the file `functions/triggers/consultationNotifications.js` and import necessary Firebase Functions modules (`functions`, `admin`) and the FCM utility function `sendNotificationToUser` from `functions/utils/fcm.js` to prepare for defining the Cloud Function.

**Details:**

Create the new file `C:\JCar\functions\triggers\consultationNotifications.js`. Add the following imports: `const functions = require('firebase-functions');`, `const admin = require('firebase-admin');`, and `const { sendNotificationToUser } = require('../utils/fcm');`. Ensure `admin.initializeApp()` is called if not already done globally.

### 65.2. Implement `onConsultationApproved` trigger skeleton

**Status:** done  
**Dependencies:** 65.1  

Define the basic structure for an `onUpdate` Firestore trigger named `onConsultationApproved` that monitors changes in the `consultation_requests/{id}` collection.

**Details:**

Inside `functions/triggers/consultationNotifications.js`, implement `exports.onConsultationApproved = functions.firestore.document('consultation_requests/{id}').onUpdate(async (change, context) => { /* Placeholder for future logic */ });`.

### 65.3. Add consultation status change detection logic

**Status:** done  
**Dependencies:** 65.2  

Implement the conditional logic within the `onConsultationApproved` trigger to check if the `consultationStatus` field has specifically changed from 'pending' to 'approved'.

**Details:**

Inside the `onUpdate` trigger, retrieve `beforeStatus = change.before.data().consultationStatus` and `afterStatus = change.after.data().consultationStatus`. Add an `if` condition: `if (beforeStatus === 'pending' && afterStatus === 'approved') { /* Notification logic will go here */ }`.

### 65.4. Extract consultation details and build notification payload

**Status:** done  
**Dependencies:** 65.3  

Within the approved status block, extract necessary consultation data (`preferredDate`, `preferredTime`, `id`, `userId`) from the updated document and construct the push notification title, body, and data payload.

**Details:**

Get `afterData = change.after.data()`. Extract `preferredDate = afterData.preferredDate`, `preferredTime = afterData.preferredTime`, `consultationId = afterData.id`, and `userId = afterData.userId`. Define `title = "상담 승인"`, `body = "]`${preferredDate} ${preferredTime} 상담이 승인되었습니다."`, and `data = { type: "consultation_approved", consultationId: consultationId, screen: "UserConsultationDetail" }`.

### 65.5. Call FCM utility to send approval notification

**Status:** done  
**Dependencies:** 65.4  

Utilize the imported `sendNotificationToUser` utility function with the constructed payload to send the approval push notification to the associated user, ensuring robust error handling.

**Details:**

Inside the conditional block from Subtask 3, after constructing the payload, call `await sendNotificationToUser(userId, title, body, data)`. Ensure any potential errors from `sendNotificationToUser` (e.g., missing FCM token) are handled gracefully, possibly with `try-catch` or by relying on `fcm.js`'s internal handling, and log relevant information.
