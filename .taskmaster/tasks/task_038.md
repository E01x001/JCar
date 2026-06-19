# Task ID: 38

**Title:** Implement Consultation Status Update Logic

**Status:** done

**Dependencies:** 37 ✓

**Priority:** high

**Description:** Develop the backend logic to handle status changes triggered by the action buttons on the `ConsultationCard`, ensuring data consistency using Firestore transactions.

**Details:**

Create a single Firestore service function, `updateConsultationStatus(docId, newStatus)`. This function will update the `consultationStatus` field of the specified document. Wire this function to the `onPress` handlers of the action buttons in the `ConsultationCard`. For example, the '채결' button on a 'pending' card will call `updateConsultationStatus(id, 'confirmed')`. Use loading states to provide user feedback during the update.

**Test Strategy:**

Manually trigger each possible status change from the UI. Verify in the Firestore console that the `consultationStatus` field is updated correctly. Test edge cases like rapidly clicking buttons or network errors, and ensure the UI handles loading and error states gracefully.

## Subtasks

### 38.1. Create `updateConsultationStatus` Function in Firestore Service

**Status:** done  
**Dependencies:** None  

Implement the core backend logic in a dedicated Firestore service file to update the status of a consultation request. This function will serve as the single point of interaction with Firestore for status changes, ensuring the logic is centralized and reusable.

**Details:**

In a relevant service file, such as `src/services/firestoreService.ts`, create an async function `updateConsultationStatus(docId: string, newStatus: string)`. This function should use the Firebase SDK to update the `consultationStatus` field of the document in the `consultation_requests` collection. The call should be wrapped in a try/catch block to handle potential errors from Firestore.

### 38.2. Implement Loading State in ConsultationCard Component

**Status:** done  
**Dependencies:** None  

Add state management to the `ConsultationCard` to handle the loading state during the Firestore update operation. This will provide immediate visual feedback to the user and prevent multiple clicks on the action buttons while an update is in progress.

**Details:**

In the `ConsultationCard.tsx` component, introduce a new state variable using the `useState` hook, for example: `const [isUpdating, setIsUpdating] = useState(false);`. Bind the `disabled` prop of the action buttons to this `isUpdating` state. Conditionally render an `ActivityIndicator` over the buttons or in place of the button text when `isUpdating` is true.

### 38.3. Wire `onPress` Handlers in `ConsultationCard` to Service Function

**Status:** done  
**Dependencies:** 38.1, 38.2  

Connect the `onPress` events of the action buttons within the `ConsultationCard` to the newly created Firestore service function, passing the correct document ID and target status for the update.

**Details:**

Import the `updateConsultationStatus` function into `ConsultationCard.tsx`. Create a new async handler function, `handleStatusUpdate(newStatus: string)`, inside the component. This handler will call `setIsUpdating(true)`, then `await updateConsultationStatus(props.consultation.id, newStatus)`, and finally `setIsUpdating(false)` in a `finally` block. Attach this handler to the `onPress` prop of each action button, passing the appropriate new status string.

### 38.4. Integrate Toast Messages for User Feedback

**Status:** done  
**Dependencies:** 38.3  

Use the existing global toast message system (from Task 19) to provide clear feedback to the user upon the success or failure of the status update operation.

**Details:**

In `ConsultationCard.tsx`, get access to the toast context using the `useToast` hook. Enhance the `handleStatusUpdate` function's try/catch block. Upon a successful update (after the await call in the `try` block), show a success message like `toast.showSuccess('상태가 성공적으로 변경되었습니다.')`. In the `catch` block, log the error and show an error message like `toast.showError('업데이트 중 오류가 발생했습니다.')`.

### 38.5. Propagate State Change to Parent List Screen

**Status:** done  
**Dependencies:** 38.4  

Ensure the UI of the parent list screen is updated immediately after a consultation's status changes. This prevents stale data from being shown and avoids the need for a manual pull-to-refresh.

**Details:**

Modify the `ConsultationCard` component to accept a new function prop, such as `onUpdateSuccess: () => void;`. In the parent screen that renders the list of cards (e.g., `AdminScheduleScreen.tsx`), pass its data-refetching function as this prop. Inside `ConsultationCard.tsx`, within the `handleStatusUpdate` function, call `onUpdateSuccess()` after the status is successfully updated and the success toast is shown.
