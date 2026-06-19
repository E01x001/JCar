# Task ID: 45

**Title:** Enhance Admin Consultation Management with Rejection Reasons, Memos, and Time Slot Suggestions

**Status:** done

**Dependencies:** 2 ✓, 3 ✓, 5 ✓, 19 ✓, 38 ✓

**Priority:** medium

**Description:** Extend the consultation management system to allow administrators to add rejection reasons, internal memos, and suggest alternative time slots when managing consultation requests. This involves updating the Firestore data model and creating new UI components for these admin actions.

**Details:**

1. **Firestore Schema Update:** Modify the `consultation_requests` collection by adding three new optional fields:
   - `rejectionReason` (string): To store the reason provided by an admin when rejecting a request.
   - `adminMemo` (string): For internal notes visible only to admins.
   - `suggestedSlots` (array of Firestore Timestamps): For admins to propose alternative times to the user.
2. **Firestore Security Rules Update:** Based on Task 2, update `firestore.rules` for the `consultation_requests` collection. Ensure that only users with an 'admin' custom claim can write to `rejectionReason`, `adminMemo`, and `suggestedSlots`. Regular users should have read-only access to `rejectionReason` and `suggestedSlots`, and no access to `adminMemo`.
3. **UI for Rejection Reason:** When an admin presses the 'Reject' button on a `ConsultationCard`, trigger a modal. This modal should contain a `TextInput` for the rejection reason. On submission, the `updateConsultationStatus` function from Task 38 must be extended to accept the reason, update the document's status to 'rejected', and populate the `rejectionReason` field.
4. **UI for Admin Memo:** Add a new icon button (e.g., 'notebook-edit') to the admin's `ConsultationCard`. Tapping this button should open a modal allowing the admin to view, add, or edit the `adminMemo` field for that specific consultation.
5. **UI for Time Slot Suggestion:** On the consultation detail screen for admins, add a new section titled 'Suggest Alternative Times'. This section should include a button to add a new time slot, which opens a date/time picker. Admins should be able to add multiple suggestions, which are displayed in a list. Saving these will update the `suggestedSlots` array in Firestore.
6. **Notification Trigger:** Create or update a Cloud Function that triggers on write operations to `consultation_requests`. If `consultationStatus` changes to 'rejected' and `rejectionReason` is present, use the FCM system from Task 5 to send a push notification to the user, including the rejection reason in the message body.

**Test Strategy:**

1. **Rejection Flow:** Log in as an admin, navigate to a 'pending' consultation, and tap 'Reject'. Verify the reason input modal appears. Enter a reason like 'Time slot unavailable' and submit. Confirm a success toast (from Task 19) is shown. Check the Firestore document to ensure `consultationStatus` is 'rejected' and `rejectionReason` is correctly populated. Log in as the user and confirm a push notification with the reason was received.
2. **Admin Memo Flow:** As an admin, select any consultation and use the new memo button to add a note. Save the note and verify the `adminMemo` field is updated in Firestore. Reload the screen and confirm the memo persists. Log in as the user who created the request and verify there is no UI to see the memo and that a direct Firestore read for the field is denied by security rules (Task 2).
3. **Time Slot Suggestion Flow:** As an admin, open a consultation and add two different time slots using the new UI. Save the changes. Verify the `suggestedSlots` array in Firestore contains two valid Timestamp objects. Attempt to add an invalid date to ensure proper validation is in place.
4. **Error Handling:** Manually simulate a network failure or Firestore permission error during any of the above operations. Verify that the UI enters a loading state, the operation fails gracefully, and an error toast (Task 19) and logs (Task 3) are generated without crashing the app.

## Subtasks

### 45.1. Update Firestore Schema and Security Rules for Consultations

**Status:** done  
**Dependencies:** None  

Modify the `consultation_requests` collection in Firestore to include new fields for admin management: `rejectionReason`, `adminMemo`, and `suggestedSlots`. Update Firestore security rules to ensure only admins can write to these fields and user access is appropriately restricted.

**Details:**

Add `rejectionReason` (string), `adminMemo` (string), and `suggestedSlots` (array of Timestamps) as optional fields to the `consultation_requests` collection. In `firestore.rules`, update the rules for `consultation_requests/{requestId}` to grant write access on these fields only to users with an 'admin' claim. Ensure regular users have read-only access to `rejectionReason` and `suggestedSlots`, and no access to `adminMemo`.
<info added on 2025-12-05T17:08:59.670Z>
The `consultation_requests` collection schema and `firestore.rules` have been updated. New optional fields `rejectionReason` (string), `adminMemo` (string), and `suggestedSlots` (array of Timestamps) have been added. Security rules now restrict write access to these fields to admins (`isAdmin() && isActiveUser()`) during update operations. A note has been added to the rules file acknowledging that `adminMemo` must be filtered out on the client-side for non-admin users due to Firestore limitations. The schema is now ready for the implementation of the UI components.
</info added on 2025-12-05T17:08:59.670Z>

### 45.2. Implement Rejection Reason Modal and Update Logic

**Status:** done  
**Dependencies:** 45.1  

Enhance the admin's `ConsultationCard` by adding a modal that prompts for a rejection reason when a request is rejected. The existing `updateConsultationStatus` function must be updated to handle this new data.

**Details:**

On the `ConsultationCard` component, likely used in `AdminScheduleScreen`, modify the 'Reject' button's `onPress` handler to open a new modal. This modal will contain a `TextInput` for the reason and a 'Submit' button. On submit, call an extended version of the `updateConsultationStatus` function, passing the consultation ID, the new status 'rejected', and the reason string.
<info added on 2025-12-05T17:12:22.266Z>
A new RejectConsultationModal component has been created at src/components/modals/RejectConsultationModal.js, mirroring the design of the CompleteDealModal. It features a validated text input for the reason, an overlay, a keyboard avoiding view, and themed submit/cancel buttons with a loading state. The updateConsultationStatus function in firebaseService.js was enhanced to accept an optional rejectionReason parameter. It now automatically adds both the reason and a rejectedAt timestamp when a consultation status is set to 'rejected', ensuring backward compatibility. In ConsultationCard.js, state was added to manage the modal's visibility. The '거절' buttons for both pending and on-hold states now trigger the modal's opening, and a new handleRejectConsultation function handles the submission of the reason to the updated service function.
</info added on 2025-12-05T17:12:22.266Z>

### 45.3. Implement Admin Memo UI and CRUD Functionality

**Status:** done  
**Dependencies:** 45.1  

Add functionality for administrators to add, view, and edit internal memos on consultation requests. This involves adding a new icon to the `ConsultationCard` and creating a modal for memo management.

**Details:**

Add a new `IconButton` (using an icon like 'notebook-edit') to the admin's `ConsultationCard`. This button will open a modal containing a `TextInput` pre-populated with the existing `adminMemo`. Implement a save function within the modal that updates the `adminMemo` field in the corresponding Firestore document.
<info added on 2025-12-05T17:15:13.435Z>
Implementation is complete.
A new `AdminMemoModal` component has been created in `src/components/modals/AdminMemoModal.js`. This modal allows admins to view, add, or edit internal memos. It pre-populates with existing memo content and includes Save/Cancel buttons with a loading state.
A corresponding `updateAdminMemo` service function was created in `firebaseService.js` to update the `adminMemo` field and add a `memoUpdatedAt` timestamp in the `consultation_requests` collection, including error handling.
The `ConsultationCard` component was updated to integrate the modal. A new memo icon button has been added to the card header, which dynamically changes its icon (`note` vs `note-add`) and color based on the existence of a memo. The component now includes `isMemoModalVisible` state and `handleMemoButtonPress`/`handleUpdateMemo` handlers to manage the modal's functionality.
</info added on 2025-12-05T17:15:13.435Z>

### 45.4. Develop UI for Suggesting Alternative Time Slots

**Status:** done  
**Dependencies:** 45.1  

Create a user interface for admins to suggest alternative time slots for a consultation. This includes a mechanism to add and save multiple date-time suggestions to the Firestore document.

**Details:**

On the admin's consultation detail screen, add a section 'Suggest Alternative Times'. This section will have a button to open a date/time picker. Each selected time should be added to a list displayed in the UI. A 'Save Suggestions' button will update the `suggestedSlots` array field in the Firestore document with the list of Firestore Timestamps.

### 45.5. Configure Cloud Function for Rejection Notifications

**Status:** done  
**Dependencies:** 45.2  

Create or modify a Cloud Function that triggers on write operations to `consultation_requests`. The function will send a push notification to the user when their request is rejected, including the admin's reason.

**Details:**

Write a new `onUpdate` Cloud Function that triggers on the `consultation_requests` collection. The function logic should check if `consultationStatus` in the `after` data is 'rejected' and differs from the `before` data. If so, it should retrieve the user's FCM token, construct a notification payload including the `rejectionReason`, and send it using the existing FCM system (from Task 5).
