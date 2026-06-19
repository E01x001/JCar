# Task ID: 81

**Title:** Strengthen Security Rules for Consultation Requests

**Status:** pending

**Dependencies:** 80 ✓

**Priority:** high

**Description:** Enhance Firestore security rules for consultation requests to restrict read access and validate status transitions.

**Details:**

Update `firestore.rules` for the `consultations` collection. Restrict read access to only the `requesterId`, the `vehicleOwnerId` (derived from the vehicle referenced), and administrators. Implement validation rules for write operations to ensure valid `status` transitions (e.g., `pending` to `approved` or `rejected`, but not `approved` to `pending`). Also, protect admin-only fields like `adminMemo` from being modified by regular users.

**Test Strategy:**

Test with different user roles (requester, vehicle owner, non-involved user, admin). Attempt unauthorized reads/writes on consultation documents. Try to transition consultation status incorrectly (e.g., 'approved' to 'pending'). Verify that the rules successfully deny invalid operations.
