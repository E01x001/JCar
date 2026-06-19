# Task ID: 54

**Title:** Update Security Rules and Implement Client-side Permission Checks

**Status:** done

**Dependencies:** 2 ✓, 47 ✓, 51 ✓

**Priority:** medium

**Description:** Enhance Firestore Security Rules for `vehicles`, `ownership_transfers`, and `consultation_requests` collections, and implement client-side UI and error handling based on user roles and permissions.

**Details:**

This task involves both server-side Firestore Security Rules updates and client-side logic to enforce role-based access control.

**1. Firestore Security Rules Update (in `firestore.rules`):**

   *   **`vehicles` collection:**
        *   Modify existing rules to allow `update` operations only if `request.auth.uid` is an administrator (by checking the `users` collection for `role: 'admin'`) OR `request.auth.uid == resource.data.currentOwnerId`.
        *   Ensure that a non-admin user (even the `currentOwnerId`) cannot modify the `currentOwnerId` field itself. All other critical fields should also be validated.
   *   **`ownership_transfers` collection:**
        *   Define new rules to allow `read` and `create` operations exclusively if `request.auth.uid` is an administrator.
        *   Explicitly deny `update` and `delete` operations for all users.
   *   **`consultation_requests` collection:**
        *   Update `read` rules to allow access if `request.auth.uid` is `resource.data.requesterId`, `resource.data.sellerId` (if applicable), or an administrator.
        *   Refine `update` rules to permit administrators to modify any field, while allowing `requesterId` or `sellerId` to update specific status fields (e.g., `consultationStatus`) with strict validation.
        *   Ensure new fields from Task 33 and Task 47 (e.g., `consultationStatus`, `dealAmount`, `transferId`) are correctly validated on write operations by authorized users.
   *   **Admin Role Check Function:** Implement a reusable function within `firestore.rules` (e.g., `function isAdmin() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'; }`) to centralize admin role verification.

**2. Client-side Permission Checks & UI Branching:**

   *   **Ownership Transfer Button Control:** In relevant UI components (e.g., `src/screens/VehicleDetailScreen.js` or `src/components/AdminActions.js`), retrieve the current user's role from the authentication context or a user service. If the user's role is not 'admin', hide or disable the button that initiates vehicle ownership transfers (related to functionality from Task 51).
   *   **Unauthorized Request Error Handling:** Implement global or specific error handling for Firestore operations. Catch `FirebaseError` instances with `code: 'permission-denied'` or `code: 'unauthenticated'`. Display a user-friendly message using the toast notification system (if available, otherwise an alert) such as "Access denied: You do not have permission to perform this action." This should prevent app crashes from unauthorized requests.
   *   **Role-based UI Branching:** Identify other UI elements that should only be visible or active for administrators (e.g., specific navigation items, tabs, editable fields). Implement conditional rendering or disabling based on the `currentUser.role` property. Reference existing `AdminPageScreen` (Task 42) for examples of admin-specific UI integration.

**Test Strategy:**

Testing will cover both server-side security rules and client-side UI/logic.

**1. Firestore Security Rules Testing:**

   *   **Firebase Emulator Suite:** Thoroughly test rules locally using the Firebase Emulator Suite.
   *   **Unit Tests (`@firebase/rules-unit-testing`):**
        *   **`vehicles`:** Create test cases for `update` operations: as `currentOwnerId` (success), as an admin (success), as a non-owner/non-admin (fail), as any user attempting to change `currentOwnerId` (fail).
        *   **`ownership_transfers`:** Test `read` and `create` operations: as an admin (success), as a regular user (fail). Test `update` and `delete` as any user (fail).
        *   **`consultation_requests`:** Test `read` as `requesterId`, `sellerId`, and admin (success). Test `read` as an unrelated authenticated user (fail). Test `update` by an admin (success). Test `update` by a `requesterId` for allowed fields (success) and disallowed fields (fail).
   *   **Deployment Verification:** After deploying the rules, use actual test user accounts (admin, regular user, unauthenticated) in a live test environment to perform various read/write operations and confirm the rules are enforced correctly.

**2. Client-side Permission Checks Testing:**

   *   **Admin User Scenario:** Log in as an administrator. Verify that the ownership transfer button is visible and active. Attempt to perform an action that would normally be restricted and verify it succeeds (if rules allow). Attempt an explicitly unauthorized action and confirm the client-side error handler catches it gracefully.
   *   **Regular User Scenario:** Log in as a non-administrator. Verify that the ownership transfer button is hidden or disabled. Attempt to perform an action restricted to admins (e.g., a direct Firestore write that would violate server rules). Confirm that the client-side error handling displays an "Access Denied" message and the application remains stable.
   *   **Unauthenticated User Scenario:** Test the application while unauthenticated. Verify that all admin-specific UI elements are hidden/disabled and that any attempt to access protected data or functionality results in appropriate client-side error handling.
   *   **UI Branching:** Systematically navigate through the application with both admin and regular user accounts to ensure all role-based UI elements (tabs, navigation, editable fields) are displayed or hidden correctly as per requirements.
