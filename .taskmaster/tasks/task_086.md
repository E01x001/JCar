# Task ID: 86

**Title:** Migrate All Client-Side Filtering to Server-Side Firestore Compound Queries with Optimized Indexes

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Refactor all data filtering operations from client-side processing to server-side Firestore compound queries for improved performance and reduced data transfer.

**Details:**

Identify all instances where data is fetched entirely from Firestore and then filtered locally in JavaScript (e.g., `firebaseService.js:818-844` for month, status, and type filters). Redesign these operations to use Firestore `where()` clauses for status, type, and date range filters directly in the query. For compound queries involving multiple `where` clauses, design and create the necessary composite indexes in `firestore.indexes.json` and deploy them to Firebase.

**Test Strategy:**

Verify that all filters function correctly. Use the Firebase Console's 'Usage' tab and 'Firestore' section to monitor query performance and confirm that client-side data transfer is significantly reduced. Validate that the correct indexes are being used for queries, avoiding full collection scans.
