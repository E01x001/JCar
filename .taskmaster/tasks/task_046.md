# Task ID: 46

**Title:** Implement User-Side Consultation Management Features

**Status:** done

**Dependencies:** 2 ✓, 17 ✓, 19 ✓, 38 ✓

**Priority:** medium

**Description:** Enable users to manage their consultations by adding features to cancel pending/approved requests, resubmit rejected requests with new times, and view a detailed history including rejection reasons.

**Details:**

This task involves creating a comprehensive user-facing interface for managing consultation requests. 
1. **Create UserConsultationDetailScreen:** Develop a new screen that displays all details of a single consultation request. This screen will be the hub for all user actions. It should fetch and display all fields from the Firestore document, including the vehicle details, user information, selected time slots, current status, and any admin-provided `rejectionReason` or `alternativeSlots`.
2. **Conditional Action Buttons:** On the `UserConsultationDetailScreen`, implement conditional rendering for action buttons based on `consultationStatus`:
   - If status is 'pending' or 'approved', display a 'Cancel Consultation' button.
   - If status is 'rejected', display the `rejectionReason` text and a 'Resubmit Consultation' button.
   - For 'completed' or 'cancelled' statuses, no action buttons should be shown.
3. **Cancellation Logic:** The 'Cancel' button should trigger a confirmation modal. Upon confirmation, call a service function that updates the consultation document's status to 'cancelled'. This will require updating Firestore Security Rules (from Task 2) to allow a user to write to their own consultation document if the change is to set the status to 'cancelled'. Use the global toast system (Task 19) to show a success message.
4. **Resubmission Logic:** The 'Resubmit' button should navigate the user to the consultation request flow, pre-populating the form with the original data but allowing the user to select new time slots. Upon submission, the existing document in Firestore should be updated, changing its status back to 'pending', updating the `requestedTimeSlots` and clearing the `rejectionReason`. Security rules must also be updated to permit this specific state transition initiated by the user.
5. **Enhance Consultation List:** Modify the user's main consultation list screen to fetch and display consultations of all statuses to serve as a complete history. Consider adding tabs or filter chips (e.g., 'Upcoming', 'Past') to help users navigate their history.

**Test Strategy:**

1. **Detail View Verification:** Navigate to the detail screen for consultations in each state ('pending', 'approved', 'rejected', 'completed', 'cancelled'). Verify that all data is displayed correctly. For a rejected consultation, confirm the rejection reason is shown. For each state, confirm that only the appropriate action buttons are visible or hidden.
2. **Cancellation Flow:** As a logged-in user, navigate to a 'pending' consultation. Tap 'Cancel'. Verify a confirmation modal appears. Confirm the action. Check Firestore to ensure the document's `consultationStatus` is now 'cancelled'. Verify the UI on the detail screen and list screen updates to reflect this change and a success toast (from Task 19) is displayed. Repeat for an 'approved' consultation.
3. **Resubmission Flow:** As an admin, reject a user's consultation and provide a reason. As the user, navigate to the now 'rejected' consultation. Click 'Resubmit'. Verify you are taken to a pre-filled form. Select new time slots and submit. Check Firestore to confirm the same document's status is updated to 'pending', the `rejectionReason` is cleared, and the `requestedTimeSlots` are updated. Verify a success toast is displayed.
4. **History Verification:** Go to the main user consultation list. Verify that consultations with all statuses are displayed correctly. Test any new filter controls to ensure they correctly filter the list.
5. **Security Rules Test:** Using the Firebase Emulator, attempt to cancel or modify a consultation that does not belong to the authenticated user and verify the operation fails. Attempt to perform an invalid state transition (e.g., resubmit a 'completed' consultation) and verify it is blocked by security rules.

## Subtasks

### 46.1. Create UserConsultationDetailScreen and Setup Navigation

**Status:** done  
**Dependencies:** None  

Create a new screen component for viewing the details of a single consultation. This includes setting up the file structure and adding the new screen to the user-facing navigation stack.

**Details:**

Create the file at 'src/screens/user/UserConsultationDetailScreen.js'. Add this screen to the main user stack navigator. Modify the existing 'UserConsultationListScreen' so that each list item is pressable and navigates to this new detail screen, passing the Firestore document ID as a route parameter.
<info added on 2025-12-10T11:56:41.963Z>
The UserConsultationDetailScreen (src/screens/user/UserConsultationDetailScreen.js) has been implemented with full design system integration. Navigation to this screen is set up in src/navigation/AppNavigator.js, and src/screens/user/MyPageScreen.js was updated to pass the consultation navigation handler. The onPress handlers in src/screens/user/BuyConsultationsTab.js and src/screens/user/SellConsultationsTab.js now navigate to UserConsultationDetailScreen instead of VehicleDetailScreen. Utility functions formatDate and formatTime were added to src/utils/format.js. The screen fetches consultation and vehicle data in real-time, displaying comprehensive information including the status badge, detailed vehicle information, consultation specifics, rejection reasons, and available alternative slots.
</info added on 2025-12-10T11:56:41.963Z>

### 46.2. Fetch and Display Consultation Details with Conditional Actions

**Status:** done  
**Dependencies:** 46.1  

Implement the logic to fetch and display the full details of a consultation. The screen should also conditionally render action buttons based on the consultation's status.

**Details:**

In 'UserConsultationDetailScreen', use the consultation ID from route params to fetch the corresponding document from the 'consultation_requests' collection in Firestore. Display all relevant data. Implement UI logic: if status is 'pending' or 'approved', show a 'Cancel' button. If status is 'rejected', display the 'rejectionReason' text and a 'Resubmit' button. No buttons should appear for 'completed' or 'cancelled' statuses.
<info added on 2025-12-10T17:58:44.331Z>
The UI logic for conditional action buttons has been refined. For 'pending', 'approved', or 'meeting' statuses, an 'outlined' 'Cancel' button is displayed. If the status is 'rejected', a 'primary' 'Resubmit' button is shown alongside the 'rejectionReason'. As before, no buttons appear for 'completed' or 'cancelled' statuses. The button handlers are currently placeholder functions, with their full implementation scheduled for subtasks 46.3 and 46.4.
</info added on 2025-12-10T17:58:44.331Z>

### 46.3. Implement Consultation Cancellation Flow

**Status:** done  
**Dependencies:** 46.2  

Develop the full logic for a user to cancel a consultation. This includes a confirmation step, updating the backend data, modifying security rules, and providing user feedback.

**Details:**

Create a service function `cancelConsultation(consultationId)` that updates the Firestore document's status to 'cancelled'. Wire this to the 'Cancel' button's onPress handler, showing a confirmation modal first. Update 'firestore.rules' to allow a user to update their own consultation document if the status change is from 'pending' or 'approved' to 'cancelled'. Use the global toast system (Task 19) to show a success message upon completion.
<info added on 2025-12-10T18:01:59.981Z>
The consultation cancellation flow has been fully implemented. A cancelConsultation function was added to firebaseService.js that updates the Firestore document's status field to 'cancelled'. In UserConsultationDetailScreen, the handleCancelConsultation function is triggered by the 'Cancel' button, first displaying an Alert confirmation dialog. Upon user confirmation, the cancelConsultation service function is invoked. A cancelling state is managed to disable the 'Cancel' button and provide visual feedback during the API call. Toast notifications, leveraging the useToast hook (Task 19), are used to provide success or error feedback to the user. Firestore security rules in firestore.rules (Task 2) have been updated to allow users to modify their own consultation document, specifically permitting the status field to change from 'pending', 'approved', or 'meeting' to 'cancelled'. During this cancellation, a new cancelledAt timestamp field is set, and the rules ensure that only the status and cancelledAt fields can be modified.
</info added on 2025-12-10T18:01:59.981Z>

### 46.4. Implement Consultation Resubmission Flow

**Status:** done  
**Dependencies:** 46.2  

Enable users to resubmit a rejected consultation request with new time slots. This involves pre-populating the request form and updating the existing document instead of creating a new one.

**Details:**

The 'Resubmit' button should navigate to the consultation request screen, passing the original consultation data as route params. Modify the request screen to detect these params, pre-populate the form, and change its submission logic. Instead of creating a new document, it must `update` the existing one, setting the status to 'pending', saving the new `requestedTimeSlots`, and clearing the `rejectionReason`. Update Firestore security rules to allow this specific state transition.

### 46.5. Enhance Consultation List to a Full History View

**Status:** done  
**Dependencies:** 46.1  

Modify the user's consultation list to display consultations of all statuses, effectively turning it into a complete history log with filtering capabilities.

**Details:**

In 'UserConsultationListScreen', update the Firestore query to fetch all consultations for the current user, removing any status-based filters. Implement UI elements like filter chips or tabs (e.g., 'Upcoming', 'Past', 'All') to allow users to filter the list. Ensure each item in the list correctly navigates to the 'UserConsultationDetailScreen' created in subtask 1.
