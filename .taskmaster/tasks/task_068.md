# Task ID: 68

**Title:** Implement Vehicle Approval/Rejection Notifications

**Status:** done

**Dependencies:** 64 ✓

**Priority:** high

**Description:** Create a Firebase Cloud Function to send push notifications to sellers when their vehicle listing's status changes from 'pending' to either 'approved' or 'rejected'.

**Details:**

1. Create the file `functions/triggers/vehicleNotifications.js`.
2. Import necessary Firebase Functions modules and FCM utility functions from `functions/utils/fcm.js`.
3. Implement `onVehicleStatusChanged` as an `onUpdate` Firestore trigger for `vehicles/{id}`.
4. Inside the trigger, check if `change.before.data().status` was 'pending' and `change.after.data().status` is either 'approved' or 'rejected'.
5. Extract `vehicleName`, `id` (as `vehicleId`), and `sellerId` from `change.after.data()`.
6. Implement conditional logic based on the new `status`:
   - If `status` is 'approved':
     - Title: "차량 등록 승인"
     - Body: `"${vehicleName} 차량이 승인되어 판매 가능합니다."`
     - Data: `{ type: "vehicle_approved", vehicleId: vehicleId, screen: "VehicleDetail" }`
   - If `status` is 'rejected':
     - Title: "차량 등록 거절"
     - Body: `"${vehicleName} 차량 등록이 거절되었습니다."`
     - Data: `{ type: "vehicle_rejected", vehicleId: vehicleId, screen: "MyPage" }`
7. Use `sendNotificationToUser(sellerId, title, body, data)` to send the appropriate notification.

**Test Strategy:**

1. Unit test the payload generation logic for both 'approved' and 'rejected' vehicle statuses.
2. Integration test for approval: Manually update a `vehicles` document from `pending` to `approved`. Verify notification receipt and deep linking to `VehicleDetail`.
3. Integration test for rejection: Manually update a `vehicles` document from `pending` to `rejected`. Verify notification receipt and deep linking to `MyPage`.
4. Ensure the correct notification type and deep link are used for each status.

## Subtasks

### 68.1. Create Vehicle Notification Trigger File & Imports

**Status:** done  
**Dependencies:** None  

Create the new Cloud Function file `functions/triggers/vehicleNotifications.js` to house the vehicle status change trigger. Import all necessary Firebase Functions modules (`functions`, `admin`) and the custom FCM utility function (`sendNotificationToUser`) from `functions/utils/fcm.js`.

**Details:**

Create `functions/triggers/vehicleNotifications.js`. Add `const functions = require('firebase-functions');`, `const admin = require('firebase-admin');`, and `const { sendNotificationToUser } = require('../utils/fcm');` to the top of the file. Initialize `admin.initializeApp();` if not already handled globally (verify `functions/index.js` or `functions/app.js`).

### 68.2. Implement `onVehicleStatusChanged` Firestore Trigger Structure

**Status:** done  
**Dependencies:** 68.1  

Define the Firebase Firestore `onUpdate` trigger for the `vehicles/{id}` collection. This trigger will listen for any modifications to vehicle documents.

**Details:**

In `functions/triggers/vehicleNotifications.js`, add the main trigger structure: `exports.onVehicleStatusChanged = functions.firestore.document('vehicles/{id}').onUpdate(async (change, context) => { // Trigger logic will go here });`. Ensure this function is exported via `functions/index.js`.

### 68.3. Add Status Change Condition and Extract Vehicle Data

**Status:** done  
**Dependencies:** 68.2  

Implement the core conditional logic within the `onUpdate` trigger to check if the vehicle's status has changed from 'pending' to either 'approved' or 'rejected'. Subsequently, extract the vehicle's name, ID, and seller ID from the updated document data.

**Details:**

Inside `onVehicleStatusChanged`, retrieve `const beforeStatus = change.before.data().status;` and `const afterStatus = change.after.data().status;`. Add an `if` condition: `if (beforeStatus === 'pending' && (afterStatus === 'approved' || afterStatus === 'rejected')) { ... }`. Within this block, extract `const { vehicleName, id: vehicleId, sellerId } = change.after.data();`.

### 68.4. Implement Approved Vehicle Notification Logic

**Status:** done  
**Dependencies:** 68.3  

Develop the specific notification payload (title, body, data) and call the `sendNotificationToUser` function for cases where a vehicle's status changes to 'approved'.

**Details:**

Inside the conditional block from Subtask 3, add an `if (afterStatus === 'approved') { ... }` sub-condition. Define `const title = "차량 등록 승인";`, `const body = `${vehicleName} 차량이 승인되어 판매 가능합니다.";`, `const data = { type: "vehicle_approved", vehicleId: vehicleId, screen: "VehicleDetail" };`. Then call `await sendNotificationToUser(sellerId, title, body, data);`.

### 68.5. Implement Rejected Vehicle Notification Logic and Final Export

**Status:** done  
**Dependencies:** 68.3, 68.4  

Develop the specific notification payload and logic for sending a push notification when a vehicle's status changes to 'rejected'. Ensure the `onVehicleStatusChanged` function is correctly exported and accessible by `functions/index.js` for deployment.

**Details:**

Inside the conditional block from Subtask 3, add an `else if (afterStatus === 'rejected') { ... }` sub-condition. Define `const title = "차량 등록 거절";`, `const body = `${vehicleName} 차량 등록이 거절되었습니다.";`, `const data = { type: "vehicle_rejected", vehicleId: vehicleId, screen: "MyPage" };`. Call `await sendNotificationToUser(sellerId, title, body, data);`. Finally, ensure `exports.onVehicleStatusChanged` is properly set up in `functions/triggers/vehicleNotifications.js` and that `functions/index.js` imports and re-exports it.
