# Task ID: 69

**Title:** Implement Admin Memo Update Notification

**Status:** done

**Dependencies:** 64 ✓, 65 ✓

**Priority:** low

**Description:** (Optional) Add a Firebase Cloud Function to `consultationNotifications.js` that triggers when an `adminMemo` is updated for a consultation request, sending a notification to the user.

**Details:**

1. In `functions/triggers/consultationNotifications.js`, add `onAdminMemoUpdated` as an `onUpdate` Firestore trigger for `consultation_requests/{id}`.
2. Inside the trigger, check if `change.before.data().adminMemo` is different from `change.after.data().adminMemo` AND `change.after.data().adminMemo` is not empty or null (i.e., a meaningful memo was added or updated).
3. Extract `id` (as `consultationId`) and `userId` from `change.after.data()`.
4. Construct the notification payload:
   - Title: "관리자 메모"
   - Body: "상담에 새로운 메모가 추가되었습니다."
   - Data: `{ type: "admin_memo_added", consultationId: consultationId, screen: "UserConsultationDetail" }`
5. Use `sendNotificationToUser(userId, title, body, data)` to send the notification.

**Test Strategy:**

1. Unit test the payload generation logic.
2. Integration test: Manually update the `adminMemo` field in a `consultation_requests` document with new, non-empty text. Verify that a push notification is received and deep links to `UserConsultationDetail`.
3. Test edge cases: update with empty string, update with null, update with the same string. Ensure no notification is sent in these cases.

## Subtasks

### 69.1. Define onAdminMemoUpdated Cloud Function Trigger

**Status:** done  
**Dependencies:** None  

Add a new Firebase Cloud Function named `onAdminMemoUpdated` to `functions/triggers/consultationNotifications.js`. This function will be an `onUpdate` Firestore trigger for documents in the `consultation_requests` collection, following the existing pattern for other consultation-related triggers.

**Details:**

In `functions/triggers/consultationNotifications.js`, add `exports.onAdminMemoUpdated = functions.firestore.document('consultation_requests/{id}').onUpdate(async (change, context) => { /* function body */ });`. Ensure all necessary Firebase and utility imports (e.g., `sendNotificationToUser`) are correctly included at the top of the file.

### 69.2. Implement Admin Memo Change Detection Logic

**Status:** done  
**Dependencies:** 69.1  

Inside the `onAdminMemoUpdated` trigger, add conditional logic to check if the `adminMemo` field has truly changed between the `beforeData` and `afterData` states and if the `afterData.adminMemo` is not empty or null, to prevent unnecessary notifications.

**Details:**

Retrieve `beforeData = change.before.data()` and `afterData = change.after.data()`. Implement an `if` condition: `if (afterData.adminMemo && beforeData.adminMemo !== afterData.adminMemo && afterData.adminMemo.trim() !== '') { /* proceed with notification logic */ }`. This ensures a meaningful change occurred.

### 69.3. Extract Data and Construct Notification Payload

**Status:** done  
**Dependencies:** 69.2  

Within the memo change detection block, extract the `userId` and the `id` of the consultation request (renamed to `consultationId`) from the `afterData`. Then, construct the notification `title`, `body`, and `data` object exactly as specified in the task.

**Details:**

Use destructuring to get `const { userId, id: consultationId } = afterData;`. Define `const title = "관리자 메모";`, `const body = "상담에 새로운 메모가 추가되었습니다.";`, and `const data = { type: "admin_memo_added", consultationId: consultationId, screen: "UserConsultationDetail" };`.

### 69.4. Call sendNotificationToUser Function

**Status:** done  
**Dependencies:** 69.3  

Invoke the `sendNotificationToUser(userId, title, body, data)` utility function, passing the extracted user ID and the constructed notification payload to send the push notification to the user. Include appropriate console logging.

**Details:**

Call `await sendNotificationToUser(userId, title, body, data);` after payload construction. Add `console.log` statements for successful notification dispatch or any errors, consistent with existing function patterns in `consultationNotifications.js`.

### 69.5. Deploy Cloud Function and Conduct Integration Tests

**Status:** done  
**Dependencies:** 69.4  

Deploy the newly implemented `onAdminMemoUpdated` Cloud Function to the development environment. Perform comprehensive end-to-end integration testing by manually updating an `adminMemo` field in a `consultation_requests` document in Firestore.

**Details:**

Deploy the function using `firebase deploy --only functions:onAdminMemoUpdated`. Manually update the `adminMemo` field of a `consultation_requests` document for a test user in the Firebase console. Verify that the user receives the push notification on their device, that the notification content (title, body) is correct, and that tapping the notification correctly deep-links to the `UserConsultationDetail` screen with the specific `consultationId`.
