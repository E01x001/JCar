# Task ID: 48

**Title:** Complete Sell Consultation: Transfer Vehicle to Admin

**Status:** done

**Dependencies:** 47 ✓, 44 ✓, 40 ✓

**Priority:** medium

**Description:** Implement the logic to transfer a vehicle to admin ownership upon completing a sell consultation, including backend transaction, frontend integration, and UI display updates.

**Details:**

1.  **`src/services/firebaseService.js`:** Create a new asynchronous function `transferVehicleToAdmin(consultationRequestId, vehicleId, adminId)` that utilizes a Firestore transaction to ensure atomicity. Inside the transaction:
    *   Retrieve references for the `consultation_requests` document using `consultationRequestId` and the `vehicles` document using `vehicleId`.
    *   Read the current state of both documents. If either does not exist, throw an error to rollback the transaction.
    *   Update the `vehicles` document: Set `currentOwnerId` to `adminId`.
    *   Create a new document in the `ownership_transfers` collection (as designed in Task 47). The document should include `vehicleId`, `previousOwnerId` (from the vehicle's `currentOwnerId` before update), `newOwnerId` (`adminId`), `transferDate` (using `serverTimestamp()`), `consultationId`, and `transferType: 'admin_acquisition'`.
    *   Update the `consultation_requests` document: Set `isOwnershipTransferred` to `true`.
    *   Ensure robust error handling within the transaction and for the function itself.
2.  **`src/components/modals/CompleteDealModal.js`:** Modify the deal confirmation logic (e.g., in the `handleConfirm` function). After successfully marking the consultation as complete, if the deal involves a 'sell' type consultation and the checkbox to transfer ownership is confirmed:
    *   Call the newly created `transferVehicleToAdmin` function with the relevant `consultationId`, `vehicleId`, and the admin's `uid`.
    *   On success, display a user-friendly `Alert.alert('차량 이전 완료', '차량이 관리자에게 성공적으로 이전되었습니다.');` Implement a mechanism to refresh the consultation list displayed in the UI (e.g., by calling a callback prop `onConsultationCompleted`).
    *   On failure (catch block), display an error `Alert.alert('오류 발생', '차량 이전 중 오류가 발생했습니다.');` and log the error.
3.  **`src/screens/admin/AdminVehicleDetailScreen.js`:** Enhance the vehicle detail display to include ownership information.
    *   Fetch the `vehicle` document and display its `currentOwnerId`. If it matches the admin's ID, display "현재 소유자: 관리자". Otherwise, display the previous owner or "개인 소유" (if `currentOwnerId` is null).
    *   Implement logic to query the `ownership_transfers` collection for documents where `vehicleId` matches the currently viewed vehicle. This query should order results by `transferDate` descending.
    *   Display a chronological list of these ownership transfer records (e.g., "YYYY-MM-DD: From [Previous Owner Name/ID] to [New Owner Name/ID]"). Consider creating a reusable component for displaying transfer history.

**Test Strategy:**

1.  **Unit/Integration Test for `transferVehicleToAdmin`:** Using the Firebase Emulator Suite, set up mock `vehicles` and `consultation_requests` documents. Call `transferVehicleToAdmin` with valid data. Verify that: the `vehicles` document's `currentOwnerId` is updated to the admin's ID; a new document is created in `ownership_transfers` with correct fields (including `previousOwnerId`, `newOwnerId`, `vehicleId`, `consultationId`, `transferDate`, `transferType`); and the `consultation_requests` document's `isOwnershipTransferred` field is set to `true`. Test edge cases where `consultationId` or `vehicleId` are not found (expect transaction rollback/error). Test transaction failure by simulating an update conflict or rule violation (expect rollback).
2.  **UI Test for `CompleteDealModal.js`:** Navigate to a 'sell' type consultation that is ready for completion. Open the `CompleteDealModal`. Confirm the deal (and implicitly the ownership transfer). Verify that the "차량 이전 완료" alert appears. Verify that the consultation list refreshes and the completed consultation is no longer visible in active tabs or has its status updated. Check Firestore directly to confirm the vehicle, consultation, and ownership transfer documents are updated correctly. Test error scenarios (e.g., network error, backend failure) and ensure appropriate error alerts are shown.
3.  **UI Test for `AdminVehicleDetailScreen.js`:** Navigate to the `AdminVehicleDetailScreen` for a vehicle that has been transferred to the admin. Verify that "현재 소유자: 관리자" or equivalent is displayed correctly. If multiple transfers occurred for a vehicle, verify that the ownership transfer history section lists all transfers chronologically and accurately, showing previous and new owners. Test with a vehicle that has no transfer history to ensure the section handles empty states gracefully.
