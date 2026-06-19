# Task ID: 75

**Title:** Implement Firebase Storage Image Cleanup in cascadeDeleteUser

**Status:** pending

**Dependencies:** 74 ✓

**Priority:** high

**Description:** Extend the `cascadeDeleteUser` Cloud Function to delete all images uploaded by the user from Firebase Storage.

**Details:**

Integrate Firebase Storage deletion logic into the `cascadeDeleteUser` function. This involves iterating through the `imageUrls` of the deleted vehicles (from Task 74) or any other user-specific storage paths. Use the Firebase Admin SDK to delete the corresponding image files from Firebase Storage buckets.

**Test Strategy:**

Upload several images linked to a test user's vehicles. Trigger the user account deletion. Verify in the Firebase Storage console that all images associated with the deleted user's vehicles are successfully removed from their respective buckets.
