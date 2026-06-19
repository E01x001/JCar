# Task ID: 74

**Title:** Implement Data Cascade for User's Vehicles and Consultations

**Status:** done

**Dependencies:** 73 ✓

**Priority:** high

**Description:** Extend the `cascadeDeleteUser` Cloud Function to delete all vehicles and consultation requests associated with the user.

**Details:**

Within the `cascadeDeleteUser` Cloud Function, implement logic to query Firestore for all `vehicles` documents where `sellerId` or `currentOwnerId` matches the deleting user's ID. Delete these vehicle documents. Subsequently, query and delete all `consultations` documents where the user is either the `requesterId` or the `sellerId` (owner of the vehicle).

**Test Strategy:**

Create a test user with multiple vehicles and consultation requests (both as a buyer and seller). Trigger the account deletion process for this user. Verify in Firestore that all associated vehicle and consultation records are completely removed.
