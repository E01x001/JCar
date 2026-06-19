# Task ID: 49

**Title:** Implement Vehicle Ownership Transfer on Buy Consultation Completion

**Status:** done

**Dependencies:** 47 ✓, 16 ✓, 33 ✓

**Priority:** medium

**Description:** Create a Firestore transaction to transfer vehicle ownership to the buyer upon confirmed purchase consultation, update vehicle status, and reflect changes in the UI.

**Details:**

This task involves implementing the core logic for transferring vehicle ownership and integrating it into the relevant UI components.

**1. `firebaseService.js` modifications:**
   - Create a new asynchronous function `transferVehicleToBuyer(consultationId, vehicleId, buyerId)`. This function will be responsible for orchestrating the ownership transfer.
   - Inside `transferVehicleToBuyer`, utilize `db.runTransaction(async (transaction) => { ... })` to ensure atomicity of all operations.
   - Within the transaction, perform the following steps:
     - Obtain document references for `vehicles/{vehicleId}` and `consultation_requests/{consultationId}`.
     - Read both documents using `transaction.get()`.
     - **Validation**: Before proceeding, validate that the `vehicle` document exists and its current `status` is not already 'sold'. If it is, throw a `FirebaseFirestoreTypes.NativeFirebaseError` with a descriptive message.
     - **Update `vehicles/{vehicleId}` document**:
       - Set `currentOwnerId` to `buyerId`.
       - Change `status` to `'sold'` (as defined in Task 47).
       - Add `soldDate: FieldValue.serverTimestamp()`.
     - **Update `consultation_requests/{consultationId}` document**:
       - Set `isOwnershipTransferred: true` (as defined in Task 47).
       - Set `consultationStatus: 'completed'`.
     - **Create new document in `ownership_transfers` collection**:
       - Use `transaction.set()` to create a new document in the `ownership_transfers` collection (as defined in Task 47).
       - Fields to include: `vehicleId`, `previousOwnerId` (retrieved from the vehicle document's `currentOwnerId` before update), `newOwnerId` (`buyerId`), `transferDate: FieldValue.serverTimestamp()`, and `consultationId`.
   - Ensure robust error handling for the transaction, catching specific Firestore errors and re-throwing custom application errors where appropriate.

**2. `CompleteDealModal.js` modifications (for purchase consultations):**
   - Locate the handler for confirming a purchase (e.g., a 'Confirm Deal' button press).
   - When the purchase is confirmed for a 'buy' consultation:
     - Extract the necessary `consultationId`, `vehicleId`, and `buyerId` (the currently authenticated user's UID).
     - Call the new `transferVehicleToBuyer` function with these parameters.
     - While the transaction is in progress, display a loading indicator or disable UI elements.
     - On successful completion of `transferVehicleToBuyer`:
       - Dismiss the modal.
       - Show a success notification (e.g., using a `Toast` component).
       - Refresh any relevant UI data (e.g., consultation lists, vehicle details) or navigate away.
     - On failure of `transferVehicleToBuyer`:
       - Display an error notification (e.g., `Toast`) with the error message.
       - The modal might remain open for user retry or specific error handling.

**3. `VehicleDetailScreen.js` modifications:**
   - Update the component to fetch and monitor the `status` field of the displayed vehicle. This requires ensuring the `Vehicle` type includes `status` (from Task 47).
   - Modify the conditional rendering of the "Consultation Request" button:
     - If the `vehicle.status` is `'sold'`:
       - Disable the "Consultation Request" button.
       - Display a prominent message (e.g., using `theme.typography.Body` with `color: theme.colors.text.error`) stating "이미 판매된 차량입니다" (This vehicle has already been sold) below or near the button.
     - Otherwise (if `status` is not 'sold'), the button should remain active.

**Test Strategy:**

A comprehensive testing strategy should cover both the backend transaction logic and the frontend UI integration:

**1. Unit/Integration Tests for `transferVehicleToBuyer` (using Firebase Emulators):**
   - **Setup**: Initialize the Firebase Emulator Suite. Create mock documents in Firestore for `vehicles` (with initial `status: 'available'`, `currentOwnerId: 'sellerId'`) and `consultation_requests` (with `consultationStatus: 'pending'`).
   - **Success Scenario**: Call `transferVehicleToBuyer` with valid `consultationId`, `vehicleId`, and a new `buyerId`. Assert the following:
     - The `vehicles/{vehicleId}` document has `currentOwnerId` updated to `buyerId`, `status` is `'sold'`, and `soldDate` is a valid timestamp.
     - The `consultation_requests/{consultationId}` document has `isOwnershipTransferred: true` and `consultationStatus: 'completed'`.
     - A new document exists in the `ownership_transfers` collection with correct `vehicleId`, `previousOwnerId`, `newOwnerId`, `transferDate`, and `consultationId`.
   - **Failure Scenario (Vehicle Already Sold)**: Create a mock vehicle with `status: 'sold'`. Call `transferVehicleToBuyer` and assert that it throws a specific error (e.g., 'Vehicle already sold').
   - **Failure Scenario (Invalid IDs)**: Call `transferVehicleToBuyer` with non-existent `consultationId` or `vehicleId`. Assert appropriate error handling.
   - **Concurrency Test**: Simulate two concurrent attempts to transfer the same vehicle to different buyers. Assert that only one transaction succeeds and the other fails gracefully due to optimistic concurrency control.

**2. UI Integration Test for `CompleteDealModal.js`:**
   - **Happy Path**: Navigate to a screen displaying a 'buy' consultation that is eligible for completion. Trigger the `CompleteDealModal`. Click the "Confirm Purchase" action.
     - Verify that a loading indicator is displayed.
     - Verify that a success `Toast` message appears after the transaction completes.
     - Verify the modal closes automatically.
     - Manually verify in Firestore that the `vehicles`, `consultation_requests`, and `ownership_transfers` documents are updated correctly.
   - **Error Path**: Introduce a controlled error (e.g., by temporarily modifying security rules to deny the write operation during testing) in the `transferVehicleToBuyer` function.
     - Trigger the `CompleteDealModal` and attempt to confirm.
     - Verify that an error `Toast` message is displayed.
     - Verify that the modal's state is handled gracefully (e.g., it remains open, allowing the user to retry).

**3. UI Integration Test for `VehicleDetailScreen.js`:**
   - **Sold Vehicle**: After a vehicle has been successfully transferred and marked 'sold' via the `CompleteDealModal` flow, navigate to its `VehicleDetailScreen`.
     - Verify that the "Consultation Request" button is disabled.
     - Verify that the message "이미 판매된 차량입니다" is prominently displayed.
   - **Available Vehicle**: Navigate to the `VehicleDetailScreen` of a vehicle that is still 'available'.
     - Verify that the "Consultation Request" button is enabled.
     - Verify that the "이미 판매된 차량입니다" message is NOT displayed.

**4. Security Rules Review**: While this task focuses on implementation, ensure that the Firebase Security Rules (from Task 2 and Task 44) will allow the `currentOwnerId` update on `vehicles`, the `isOwnershipTransferred` and `consultationStatus` updates on `consultation_requests`, and the creation of documents in the `ownership_transfers` collection by the appropriate user roles (e.g., authenticated buyers for creating the `ownership_transfers` record, or the system/admin user for updating vehicle status). If not, a follow-up task for security rule updates will be necessary.
