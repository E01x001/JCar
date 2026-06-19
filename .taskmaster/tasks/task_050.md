# Task ID: 50

**Title:** Implement Consultation Status Archiving and Admin View Filter

**Status:** done

**Dependencies:** 33 ✓, 35 ✓, 38 ✓, 48 ✓, 49 ✓

**Priority:** medium

**Description:** Develop a mechanism to 'archive' consultation requests by updating their status to 'archived', integrate this into vehicle ownership transfer transactions, and modify the admin screen to display archived consultations separately.

**Details:**

This task involves creating a new 'archived' status for consultation requests and updating the UI to reflect this change.

1.  **`src/services/firebaseService.js` modifications:**
    *   **No new `resetConsultationStatus` function is explicitly needed as a separate transaction.** Instead, the 'archived' status update will be integrated directly into the existing ownership transfer transactions to maintain atomicity and prevent nested transactions. The prompt's request for a `resetConsultationStatus` function will be fulfilled by making sure the status update logic is handled and reusable.
2.  **Integrate Status Archiving into Ownership Transfer Functions:**
    *   Locate the `transferVehicleToAdmin` (from Task 48) and `transferVehicleToBuyer` (from Task 49) functions in `src/services/firebaseService.js`. Both functions utilize `db.runTransaction`.
    *   Within the transaction block of *each* of these functions, add an `transaction.update()` call for the respective `consultation_requests` document.
    *   Set `consultationStatus` to `'archived'` and `archivedAt` to `FieldValue.serverTimestamp()` (Firestore's server timestamp) for the `consultation_requests` document that initiated the transfer. This ensures the consultation is marked as completed and archived as an atomic part of the vehicle ownership transfer.
    *   Example snippet within the transaction for `transferVehicleToAdmin`:
        `transaction.update(consultationRef, { consultationStatus: 'archived', archivedAt: FieldValue.serverTimestamp() });`
3.  **`src/screens/AdminConsultationScreen.js` modifications:**
    *   Update the `AdminConsultationScreen` (refactored in Task 35) to handle the new `'archived'` status.
    *   **Filtering 'archived' consultations:** Modify the data fetching/filtering logic for the '구매상담' (Buy Consultation) and '판매상담' (Sell Consultation) tabs to explicitly *exclude* consultations with `consultationStatus: 'archived'`. These tabs should only show active or pending consultations.
    *   **Displaying 'archived' consultations:** Decide on the best approach for displaying 'archived' consultations:
        *   **Option A (Preferred):** Modify the existing '거래완료' (Completed) tab to include both `completed` and `archived` consultations. This might involve updating the query filter for this tab to fetch consultations where `consultationStatus` is either `'completed'` or `'archived'`. Consider renaming the tab to '완료 및 보관' (Completed & Archived) if this option is chosen to reflect its content accurately.
        *   **Option B (Alternative):** Add a completely new tab, e.g., '보관' (Archived), to the `TabView` component. This new tab will render a `ConsultationList` component specifically configured to fetch consultations where `consultationStatus === 'archived'`.

**Test Strategy:**

1.  **Backend Transaction Tests (using Firebase Emulators):**
    *   Set up Firebase Emulators. Create mock `consultation_requests`, `vehicles`, and `users` documents with appropriate data.
    *   Execute `transferVehicleToAdmin` with a valid `consultationId`, `vehicleId`, and `adminId`. Verify in the Firestore emulator that:
        *   The `vehicles` document's `currentOwnerId` is updated to the admin's ID.
        *   A new document is created in `admin_owned_vehicles`.
        *   The initiating `consultation_requests` document's `consultationStatus` is updated to `'archived'` and `archivedAt` is a valid server timestamp.
    *   Repeat the above steps for `transferVehicleToBuyer`, ensuring the `vehicles` document's `currentOwnerId` is updated to the buyer's ID and the `consultation_requests` document is archived.
    *   Test edge cases: Attempt to call transfer functions with non-existent `consultationId` or `vehicleId` to ensure the transactions rollback and no partial updates occur.

2.  **Frontend `AdminConsultationScreen` UI Tests:**
    *   **Data Preparation:** Ensure there are test consultations in Firestore with various statuses, including 'pending', 'confirmed', 'completed', and crucially, 'archived'.
    *   **Active Consultations Filtering:** Log in as an admin and navigate to the `AdminConsultationScreen`. Select the '구매상담' and '판매상담' tabs. Verify that *no* consultations with `consultationStatus: 'archived'` are displayed in these tabs.
    *   **Archived Consultations Display:**
        *   **If Option A (Modified '거래완료' tab) was implemented:** Navigate to the '거래완료' tab. Verify that consultations with both `consultationStatus: 'completed'` and `consultationStatus: 'archived'` are correctly listed.
        *   **If Option B (New '보관' tab) was implemented:** Verify a new '보관' tab is present. Navigate to this tab and confirm that *only* consultations with `consultationStatus: 'archived'` are displayed there.
    *   Confirm UI responsiveness and correct rendering across different consultation statuses after the archival process.
