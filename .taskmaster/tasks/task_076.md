# Task ID: 76

**Title:** Implement Soft Delete and Confirmation Email for Account Deletion

**Status:** pending

**Dependencies:** 75

**Priority:** high

**Description:** Implement a soft delete mechanism for user accounts with a 30-day recovery period, and integrate a confirmation email workflow.

**Details:**

Modify the user deletion process to initially mark a user account for 'soft delete' with a `deletedAt` timestamp and a `status` field in their Firestore document. Send a confirmation email to the user, explaining the soft delete and providing an option to reverse the deletion within the 30-day window. The `cascadeDeleteUser` Cloud Function (Tasks 74, 75) should only proceed to permanent deletion after this recovery period, possibly triggered by a scheduled Cloud Function.

**Test Strategy:**

Initiate a soft delete for a test user. Verify that the user's `status` field in Firestore is updated (e.g., to 'pending_deletion') and a `deletedAt` timestamp is recorded. Check that a confirmation email is sent with a valid recovery link. Attempt to log in with the soft-deleted account and verify the expected behavior (e.g., access denied with a message about pending deletion).
