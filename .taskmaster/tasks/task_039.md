# Task ID: 39

**Title:** Develop 'Complete Deal' Modal and Logic

**Status:** done

**Dependencies:** 38 ✓

**Priority:** high

**Description:** Create a modal that appears when an admin clicks the '거래완료' button. This modal will capture the deal amount and admin notes, then update the consultation document.

**Details:**

Create a new reusable modal component. The modal should contain a numeric `TextInput` for `dealAmount` (required) and a `TextInput` for `adminNotes` (optional). On 'Confirm', call a new Firestore service function `completeConsultation(docId, dealAmount, notes, completedBy, isSellType)`. This function updates the document with `consultationStatus: 'completed'`, `completedAt: serverTimestamp()`, `dealAmount`, `adminNotes`, and `completedBy`. For sell-type consultations, the modal should include the specified checkbox.

**Test Strategy:**

Trigger the modal from a consultation card. Test form validation (deal amount is required and numeric). Successfully submit the form and verify that all relevant fields (`consultationStatus`, `completedAt`, `dealAmount`, etc.) are updated in Firestore. Test the cancel action.

## Subtasks

### 39.1. Create `completeConsultation` Function in Firestore Service

**Status:** done  
**Dependencies:** None  

Implement the backend logic in a Firestore service file to update a consultation document, setting its status to 'completed' and adding the final deal information.

**Details:**

In the primary Firestore service file (e.g., `src/services/firestoreService.js`), create a new async function `completeConsultation({ docId, dealAmount, adminNotes, completedBy })`. This function will use `updateDoc` to update the specified consultation document with `consultationStatus: 'completed'`, `completedAt: serverTimestamp()`, `dealAmount`, `adminNotes`, and `completedBy` fields.

### 39.2. Create `CompleteDealModal` Component File and Structure

**Status:** done  
**Dependencies:** None  

Create the new reusable modal component, setting up its basic structure, props for visibility, and callbacks.

**Details:**

Create a new file at `src/components/modals/CompleteDealModal.js`. The component should be built upon React Native's `Modal` component and accept props like `isVisible`, `onClose`, and `onSubmit`. The main content area should use the existing `Card` component to ensure consistent styling.

### 39.3. Add Form Inputs and Buttons to CompleteDealModal

**Status:** done  
**Dependencies:** 39.2  

Populate the modal with the necessary input fields for deal amount, admin notes, and the confirm/cancel action buttons using existing shared components.

**Details:**

Inside `CompleteDealModal.js`, use the existing `InputField` component for 'Deal Amount' (setting `keyboardType="numeric"`) and 'Admin Notes'. Use the existing `Button` component for 'Confirm' and 'Cancel' actions. The cancel button should call the `onClose` prop.

### 39.4. Implement Form State Management and Validation Logic

**Status:** done  
**Dependencies:** 39.3  

Add local state management for the form inputs within the modal and implement validation logic, specifically making the deal amount required.

**Details:**

Use `useState` hooks in `CompleteDealModal.js` to manage the values for `dealAmount` and `adminNotes`. Implement validation logic that checks if `dealAmount` is a non-empty, positive number. The 'Confirm' button should be disabled until the form is valid. An error message should be displayed via the `InputField`'s `error` prop if validation fails on an attempt to submit.

### 39.5. Integrate Modal into the Consultation Admin View

**Status:** done  
**Dependencies:** 39.1, 39.4  

Connect the '거래완료' button on the consultation card/view to trigger the modal, pass the necessary document ID, and handle the submission callback.

**Details:**

In the relevant admin screen component, manage state for the modal's visibility and the selected consultation ID. When the '거래완료' button is pressed, update the state to show the modal and pass the `docId` as a prop. The modal's `onSubmit` callback should invoke the `completeConsultation` service function with the form data, then close the modal and refresh the data.
