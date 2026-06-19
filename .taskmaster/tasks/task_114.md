# Task ID: 114

**Title:** Implement Temporary Account Suspension: Add User Fields and Admin UI

**Status:** pending

**Dependencies:** None

**Priority:** medium

**Description:** Introduce temporary account suspension functionality by adding relevant fields to user documents and developing an administrative interface for managing suspensions.

**Details:**

Add new fields to the `users` Firestore collection: `accountStatus` (e.g., 'active', 'suspended'), `suspendedUntil` (timestamp), and `suspensionReason` (string). Develop a basic administrative UI (e.g., within an Admin panel or `AdminUsersListScreen`) that allows authorized administrators to select a user and apply a temporary suspension, specifying the duration (1-30 days) or making it permanent, along with a reason. Ensure the admin UI updates the user document with these fields.

**Test Strategy:**

As an admin user, access the new suspension UI. Suspend a test user for various durations (e.g., 1 day, 7 days, permanent) and with different reasons. Verify in Firestore that the user document's `accountStatus`, `suspendedUntil`, and `suspensionReason` fields are correctly updated. Attempt to log in as the suspended user and verify that they are blocked from accessing the application with an appropriate message.
