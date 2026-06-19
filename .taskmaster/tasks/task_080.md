# Task ID: 80

**Title:** Implement Field-Level Security Rules for Public and Sensitive Vehicle Data

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Create Firestore security rules to differentiate access between public and sensitive fields within vehicle documents.

**Details:**

Modify `firestore.rules` to define separate read permissions. Public users should only be able to read fields like `vehicleName`, `manufacturer`, `year`, `price`, `imageUrls`, and `status`. Sensitive fields such as `sellerId`, `currentOwnerId`, and `sellerPhone` must be restricted, readable only by the vehicle owner and authenticated administrators. Ensure rules handle nested data correctly.

**Test Strategy:**

Create test accounts for different roles: public (unauthenticated), authenticated non-owner, vehicle owner, and admin. Attempt to read vehicle documents using each account and verify that only authorized fields are accessible to each role. Use Firebase Security Rules Playground for rapid iteration and testing.
