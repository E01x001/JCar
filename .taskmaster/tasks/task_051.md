# Task ID: 51

**Title:** Implement Firestore Transactions for Vehicle Ownership Transfer

**Status:** done

**Dependencies:** 47 ✓

**Priority:** medium

**Description:** Implement two Firestore transactions, `transferVehicleToAdmin` and `transferVehicleToBuyer`, to ensure atomic updates for vehicle ownership changes, including updating vehicle, ownership transfer, and consultation request documents.

**Details:**

The core of this task is to implement robust, atomic updates for vehicle ownership using Firestore transactions. This will ensure data consistency across multiple collections. The implementation should reside in a new dedicated service file, for example, `src/services/ownershipTransferService.ts`, to manage the complexity and separation of concerns.

1.  **`transferVehicleToAdmin` Transaction Implementation:**
    *   **Function Signature:** `async transferVehicleToAdmin(vehicleId: string, sellerId: string, consultationRequestId: string, adminId: string)`
    *   **Transaction Context:** Utilize `firestore().runTransaction(async (transaction) => { ... })` for atomic operations.
    *   **Document Reads (within transaction):**
        *   Read the `vehicle` document using `transaction.get(vehicleRef)` (e.g., `firestore().collection('vehicles').doc(vehicleId)`).
        *   Read the `consultation_request` document using `transaction.get(consultationRequestRef)` (e.g., `firestore().collection('consultation_requests').doc(consultationRequestId)`).
    *   **Validation:**
        *   Verify both `vehicle` and `consultation_request` documents exist.
        *   Verify `vehicle.currentOwnerId` (as defined in Task 47) matches the provided `sellerId`.
        *   Verify the `consultation_request.consultationStatus` is not already `'archived'` or `'completed'`.
    *   **`ownership_transfers` Document Creation:**
        *   Generate a new unique ID for the `ownership_transfers` document.
        *   Create a new document in the `ownership_transfers` collection (as per schema from Task 47) with fields:
            *   `transferType: 'toAdmin'`
            *   `vehicleId`
            *   `previousOwnerId: sellerId`
            *   `newOwnerId: adminId`
            *   `transferDate: FieldValue.serverTimestamp()`
            *   `consultationId: consultationRequestId`
            *   Other relevant fields from Task 47 (e.g., `dealAmount`, `notes` if applicable).
        *   Use `transaction.set(ownershipTransferRef, {...})`.
    *   **`vehicles` Document Update:**
        *   Update the `vehicle` document (`vehicleRef`) with:
            *   `currentOwnerId: adminId`
            *   `isAdminOwned: true`
            *   Append to `ownershipHistory` array: `{ ownerId: adminId, fromDate: FieldValue.serverTimestamp(), transferId: newOwnershipTransferId }` (following Task 47 schema).
        *   Use `transaction.update(vehicleRef, {...})`.
    *   **`consultation_requests` Document Update:**
        *   Update the `consultation_request` document (`consultationRequestRef`) with:
            *   `consultationStatus: 'archived'`
            *   `isOwnershipTransferred: true`
            *   `transferId: newOwnershipTransferId`
        *   Use `transaction.update(consultationRequestRef, {...})`.

2.  **`transferVehicleToBuyer` Transaction Implementation:**
    *   **Function Signature:** `async transferVehicleToBuyer(vehicleId: string, adminId: string, buyerId: string, consultationRequestId: string, soldPrice: number)`
    *   **Transaction Context:** Similar `firestore().runTransaction` structure.
    *   **Document Reads (within transaction):** Read `vehicle` and `consultation_request` documents.
    *   **Validation:**
        *   Verify documents exist.
        *   Verify `vehicle.currentOwnerId` matches the provided `adminId` and `vehicle.isAdminOwned` is `true`.
        *   Verify the `consultation_request.consultationStatus` is not already `'archived'` or `'completed'`.
    *   **`ownership_transfers` Document Creation:**
        *   Generate a new ID.
        *   Create document with `transferType: 'toBuyer'`, `vehicleId`, `previousOwnerId: adminId`, `newOwnerId: buyerId`, `transferDate: FieldValue.serverTimestamp()`, `consultationId: consultationRequestId`, `dealAmount: soldPrice` (from Task 33 and Task 47), and other relevant fields.
        *   Use `transaction.set(ownershipTransferRef, {...})`.
    *   **`vehicles` Document Update:**
        *   Update `vehicle` document (`vehicleRef`) with:
            *   `currentOwnerId: buyerId`
            *   `isAdminOwned: false`
            *   `status: 'sold'` (ensure this status is available in the Vehicle schema).
            *   Append to `ownershipHistory` array: `{ ownerId: buyerId, fromDate: FieldValue.serverTimestamp(), transferId: newOwnershipTransferId }`.
        *   Use `transaction.update(vehicleRef, {...})`.
    *   **`consultation_requests` Document Update:**
        *   Update `consultation_request` document (`consultationRequestRef`) with:
            *   `consultationStatus: 'archived'`
            *   `isOwnershipTransferred: true`
            *   `transferId: newOwnershipTransferId`
            *   `dealAmount: soldPrice`.
        *   Use `transaction.update(consultationRequestRef, {...})`.

3.  **Error Handling and Logging:**
    *   Wrap each transaction call in `try...catch` blocks.
    *   In the catch block, use Firebase Crashlytics (e.g., `@react-native-firebase/crashlytics` if in a React Native client, or `firebase-admin` if in a Cloud Function context) to log the error details:
        *   `crashlytics().recordError(error, 'Firestore transaction failed');`
        *   Include context: `crashlytics().log('Context: transferVehicleToAdmin for vehicle ' + vehicleId + ' failed.');`
    *   Throw a custom, user-friendly error message that can be displayed to the user (e.g., "차량 소유권 이전 중 오류가 발생했습니다. 다시 시도해 주세요.").

**Test Strategy:**

1.  **Unit Tests (Firebase Emulator):**
    *   Set up and run the Firebase Emulator Suite for Firestore locally.
    *   Create mock data in the emulator: `vehicles`, `consultation_requests`, and `users` documents to represent various scenarios.
    *   **`transferVehicleToAdmin` Tests:**
        *   **Success Case:** Call `transferVehicleToAdmin` with valid `vehicleId`, `sellerId`, `consultationRequestId`, and `adminId`. Verify that:
            *   A new document is created in the `ownership_transfers` collection with correct `transferType: 'toAdmin'`, `vehicleId`, `previousOwnerId`, `newOwnerId` (adminId), `consultationId`, and `transferDate`.
            *   The target `vehicle` document is updated: `currentOwnerId` is `adminId`, `isAdminOwned` is `true`, and `ownershipHistory` contains the new entry with the correct `transferId`.
            *   The `consultation_request` document is updated: `consultationStatus` is `archived`, `isOwnershipTransferred` is `true`, and `transferId` matches the new ownership transfer ID.
        *   **Failure Cases:**
            *   Call with an invalid `vehicleId` or `consultationRequestId` (non-existent).
            *   Call where `sellerId` does not match `vehicle.currentOwnerId`.
            *   Call where `consultation_request.consultationStatus` is already `archived` or `completed`.
            *   Verify the transaction rolls back, no data changes occur, and an appropriate error is thrown (and logged to Crashlytics if mocked).
    *   **`transferVehicleToBuyer` Tests:**
        *   **Success Case:** Prepare a vehicle as admin-owned (`isAdminOwned: true`, `currentOwnerId: adminId`). Call `transferVehicleToBuyer` with valid `vehicleId`, `adminId`, `buyerId`, `consultationRequestId`, and `soldPrice`. Verify that:
            *   A new document is created in `ownership_transfers` with `transferType: 'toBuyer'`, `previousOwnerId` (adminId), `newOwnerId` (buyerId), `soldPrice`, and other correct fields.
            *   The target `vehicle` document is updated: `currentOwnerId` is `buyerId`, `isAdminOwned` is `false`, `status` is `sold`, and `ownershipHistory` contains the new entry.
            *   The `consultation_request` document is updated: `consultationStatus` is `archived`, `isOwnershipTransferred` is `true`, `transferId` matches, and `dealAmount` equals `soldPrice`.
        *   **Failure Cases:**
            *   Call with an invalid `vehicleId`, `adminId`, `buyerId`, `consultationRequestId`, or `soldPrice` (e.g., negative).
            *   Call where the vehicle is not currently owned by the `adminId` or `isAdminOwned` is `false`.
            *   Call where `consultation_request.consultationStatus` is already `archived` or `completed`.
            *   Verify transaction rollback and error handling.

2.  **Crashlytics Integration Test (Manual/Mocked):**
    *   Trigger a known transaction failure condition (e.g., by providing invalid data that causes a validation error or by simulating a Firestore permission denial).
    *   Verify that an error report is logged to Firebase Crashlytics (check the Crashlytics dashboard or mock Crashlytics behavior in tests).
