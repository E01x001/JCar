# Task ID: 67

**Title:** Implement Consultation Completion Notification

**Status:** done

**Dependencies:** 64 ✓, 65 ✓

**Priority:** medium

**Description:** Add a Firebase Cloud Function to `consultationNotifications.js` that triggers upon a consultation request's status changing to 'completed', sending a push notification with deal details.

**Details:**

1. In `functions/triggers/consultationNotifications.js`, add `onConsultationCompleted` as an `onUpdate` Firestore trigger for `consultation_requests/{id}`.
2. Inside the trigger, check if `change.after.data().consultationStatus` is 'completed'.
3. Extract `dealAmount`, `id` (as `consultationId`), and `userId` from `change.after.data()`.
4. Construct the notification payload:
   - Title: "상담 완료"
   - Body: `"상담이 완료되었습니다. 거래 금액: ${dealAmount || 'N/A'}원"` (Handle `dealAmount` gracefully if it might be missing).
   - Data: `{ type: "consultation_completed", consultationId: consultationId, screen: "UserConsultationDetail" }`
5. Use `sendNotificationToUser(userId, title, body, data)` to send the notification.

**Test Strategy:**

1. Unit test the payload generation for the completion notification.
2. Integration test: Manually update a `consultation_requests` document in Firestore, changing `consultationStatus` to 'completed' and including a `dealAmount`. Verify that the notification is received and deep links correctly to `UserConsultationDetail`.
3. Test the case where `dealAmount` might be missing or null, ensuring the notification body is still coherent.

## Subtasks

### 67.1. Verify `consultationNotifications.js` and FCM Utility Setup

**Status:** done  
**Dependencies:** 67.65  

Ensure the `functions/triggers/consultationNotifications.js` file exists and that the `sendNotificationToUser` utility function from `functions/utils/fcm.js` is correctly imported and available for use.

**Details:**

Check if `functions/triggers/consultationNotifications.js` has been created as part of Task 65. Verify that `admin` and `functions` modules from 'firebase-functions' and 'firebase-admin' are imported, and crucially, `sendNotificationToUser` from `../utils/fcm` is imported at the top of the file.

### 67.2. Define `onConsultationCompleted` Firestore Trigger Structure

**Status:** done  
**Dependencies:** 67.1  

Add a new Firebase Cloud Function to `consultationNotifications.js` that acts as an `onUpdate` trigger for documents in the `consultation_requests` collection.

**Details:**

Within `functions/triggers/consultationNotifications.js`, export a new function named `onConsultationCompleted` using `functions.firestore.document('consultation_requests/{id}').onUpdate(async (change, context) => { ... });` This sets up the basic trigger structure.

### 67.3. Implement Status Check and Data Extraction Logic

**Status:** done  
**Dependencies:** 67.2  

Inside the `onConsultationCompleted` trigger, add logic to check if the `consultationStatus` has changed to 'completed' and extract necessary data from the updated document.

**Details:**

Within the `onConsultationCompleted` function body, first check if `change.before.data().consultationStatus !== 'completed'` and `change.after.data().consultationStatus === 'completed'`. If true, extract `dealAmount`, `id` (as `consultationId`), and `userId` from `change.after.data()`. Include `console.log` statements for debugging extracted data.

### 67.4. Construct Consultation Completion Notification Payload

**Status:** done  
**Dependencies:** 67.3  

Assemble the title, body, and data payload for the push notification based on the extracted deal details.

**Details:**

After extracting data, construct the notification `title`: '상담 완료', `body`: `상담이 완료되었습니다. 거래 금액: ${dealAmount || 'N/A'}원`. The `data` object should be `{ type: 'consultation_completed', consultationId: consultationId, screen: 'UserConsultationDetail' }`. Ensure graceful handling for `dealAmount` being potentially missing or null.

### 67.5. Send Notification and Add Error Handling

**Status:** done  
**Dependencies:** 67.4  

Call the `sendNotificationToUser` function with the constructed payload and include robust error handling and logging.

**Details:**

Integrate `await sendNotificationToUser(userId, title, body, data);` within a `try-catch` block inside the trigger. Log success messages including `consultationId` and `userId` upon successful notification send. In case of an error, catch the exception and log the error details using `console.error` to ensure failures are captured.
