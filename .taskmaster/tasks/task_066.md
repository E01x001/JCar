# Task ID: 66

**Title:** Implement Consultation Rejection and Alternative Slots Notifications

**Status:** done

**Dependencies:** 64 ✓, 65 ✓

**Priority:** high

**Description:** Add Firebase Cloud Functions to `consultationNotifications.js` to send push notifications when a consultation request is rejected or when alternative time slots are suggested by an administrator.

**Details:**

1. In `functions/triggers/consultationNotifications.js`, add `onConsultationRejected` as an `onUpdate` Firestore trigger for `consultation_requests/{id}`.
2. Inside `onConsultationRejected`, check if `change.after.data().consultationStatus` is 'rejected'.
3. Extract `rejectionReason`, `id` (as `consultationId`), and `userId` from `change.after.data()`.
4. Construct the rejection notification payload:
   - Title: "상담 거절"
   - Body: `"상담 요청이 거절되었습니다. ${rejectionReason}"`
   - Data: `{ type: "consultation_rejected", consultationId: consultationId, screen: "UserConsultationDetail" }`
5. Add `onAlternativeSlotsSuggested` as another `onUpdate` Firestore trigger for `consultation_requests/{id}`.
6. Inside `onAlternativeSlotsSuggested`, check if the `alternativeSlots` field has been added or modified (i.e., `change.before.data().alternativeSlots !== change.after.data().alternativeSlots` and `change.after.data().alternativeSlots` exists).
7. Extract `id` (as `consultationId`) and `userId` from `change.after.data()`.
8. Construct the alternative slots notification payload:
   - Title: "대체 시간 제안"
   - Body: "관리자가 대체 상담 시간을 제안했습니다. 확인해주세요."
   - Data: `{ type: "alternative_slots_suggested", consultationId: consultationId, screen: "UserConsultationDetail" }`
9. Use `sendNotificationToUser` for both triggers to send notifications to the respective `userId`.

**Test Strategy:**

1. Unit test the payload generation for both rejection and alternative slots notifications.
2. Integration test for rejection: Manually update a `consultation_requests` document to `rejected` and provide a `rejectionReason`. Verify notification receipt and deep linking to `UserConsultationDetail`.
3. Integration test for alternative slots: Manually add or modify the `alternativeSlots` field in a `consultation_requests` document. Verify notification receipt and deep linking to `UserConsultationDetail`.
4. Ensure that notifications are only sent when the specific field changes as expected and not on other updates.

## Subtasks

### 66.1. Initialize and Prepare consultationNotifications.js

**Status:** done  
**Dependencies:** None  

Ensure `functions/triggers/consultationNotifications.js` is properly initialized with all necessary Firebase imports (functions, admin) and the `sendNotificationToUser` utility. This step ensures the file is ready for new Cloud Function triggers.

**Details:**

Verify `functions/triggers/consultationNotifications.js` includes `const functions = require('firebase-functions');`, `const admin = require('firebase-admin');` (if needed for local admin operations; often global init is in `index.js`), and `const { sendNotificationToUser } = require('../utils/fcm');`. Ensure `functions.logger` is available for logging. Confirm consistent error handling patterns for robustness.

### 66.2. Implement onConsultationRejected Trigger Structure

**Status:** done  
**Dependencies:** 66.1  

Create the `exports.onConsultationRejected` Firebase Cloud Function as an `onUpdate` trigger for the `consultation_requests/{id}` collection. This function will contain the initial logic to detect rejected consultation requests and extract relevant data.

**Details:**

Add `exports.onConsultationRejected = functions.firestore.document('consultation_requests/{id}').onUpdate(async (change, context) => { ... });` to `consultationNotifications.js`. Inside the trigger, implement the conditional check `if (change.after.data().consultationStatus === 'rejected')`. Extract `rejectionReason`, `id` (as `consultationId`), and `userId` from `change.after.data()` for later use.

### 66.3. Construct and Dispatch Rejection Notification

**Status:** done  
**Dependencies:** 66.2  

Within the `onConsultationRejected` trigger, construct the notification payload for a rejected consultation request, including a Korean title and body with the rejection reason. Subsequently, use the `sendNotificationToUser` utility to send this notification to the relevant user.

**Details:**

Inside the `onConsultationRejected` trigger, after data extraction, create a `notificationPayload` object. Set `title: "상담 거절"`, `body: `상담 요청이 거절되었습니다. ${rejectionReason}`, and `data: { type: "consultation_rejected", consultationId: consultationId, screen: "UserConsultationDetail" }`. Call `await sendNotificationToUser(userId, notificationPayload)`. Add `functions.logger.info` for successful notification sending.

### 66.4. Implement onAlternativeSlotsSuggested Trigger Structure

**Status:** done  
**Dependencies:** 66.1  

Create a new Firebase Cloud Function `exports.onAlternativeSlotsSuggested` as an `onUpdate` trigger for `consultation_requests/{id}`. This function will detect when alternative time slots are suggested by an administrator by checking for changes in the `alternativeSlots` field.

**Details:**

Add `exports.onAlternativeSlotsSuggested = functions.firestore.document('consultation_requests/{id}').onUpdate(async (change, context) => { ... });` to `consultationNotifications.js`. Implement the condition `if (change.before.data().alternativeSlots !== change.after.data().alternativeSlots && change.after.data().alternativeSlots)` to check for `alternativeSlots` field modification or addition. Extract `id` (as `consultationId`) and `userId` from `change.after.data()`.

### 66.5. Construct and Dispatch Alternative Slots Notification

**Status:** done  
**Dependencies:** 66.4  

Within the `onAlternativeSlotsSuggested` trigger, construct the notification payload for suggested alternative slots, including a Korean title and body. Then, use the `sendNotificationToUser` utility to dispatch this notification to the user whose consultation request was updated.

**Details:**

Inside the `onAlternativeSlotsSuggested` trigger, after data extraction, create a `notificationPayload` object. Set `title: "대체 시간 제안"`, `body: "관리자가 대체 상담 시간을 제안했습니다. 확인해주세요."`, and `data: { type: "alternative_slots_suggested", consultationId: consultationId, screen: "UserConsultationDetail" }`. Call `await sendNotificationToUser(userId, notificationPayload)`. Add `functions.logger.info` for successful notification sending.
