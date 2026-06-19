# Task ID: 57

**Title:** Configure Firestore Composite Indexes for Consultation Queries

**Status:** done

**Dependencies:** 36 ✓

**Priority:** medium

**Description:** Create the `firestore.indexes.json` file to define required composite indexes for consultation queries, and document index requirements and deployment procedures.

**Details:**

This task involves creating and documenting the necessary Firestore composite indexes for various consultation query patterns used in the application. These indexes are crucial for optimizing query performance and ensuring queries execute without error.

**1. Create `firestore.indexes.json`:**
   - At the project root (`./`), create a new file named `firestore.indexes.json`.
   - This file will contain the array of index definitions.

**2. Define Composite Indexes for `consultation_requests` collection:**
   - **Index for general consultation lists (e.g., admin overview):**
     ```json
     {
       "collectionGroup": "consultation_requests",
       "queryScope": "COLLECTION",
       "fields": [
         { "fieldPath": "consultationStatus", "order": "ASCENDING" },
         { "fieldPath": "createdAt", "order": "DESCENDING" }
       ]
     }
     ```
     This index supports queries like `.where('consultationStatus', 'in', [...]).orderBy('createdAt', 'desc')`.
   - **Index for 'Buy/Sell Consultation' tabs:**
     ```json
     {
       "collectionGroup": "consultation_requests",
       "queryScope": "COLLECTION",
       "fields": [
         { "fieldPath": "type", "order": "ASCENDING" },
         { "fieldPath": "consultationStatus", "order": "ASCENDING" }
       ]
     }
     ```
     This supports queries similar to those in `Task 36`, e.g., `.where('type', '==', 'buy').where('consultationStatus', '!=', 'completed')`.
   - **Index for user-specific consultations (if applicable):**
     ```json
     {
       "collectionGroup": "consultation_requests",
       "queryScope": "COLLECTION",
       "fields": [
         { "fieldPath": "userId", "order": "ASCENDING" },
         { "fieldPath": "consultationStatus", "order": "ASCENDING" }
       ]
     }
     ```
     Add this if there are queries filtering by `userId` and `consultationStatus`.

**3. Document Index Requirements and Deployment:**
   - Create a new Markdown file: `docs/FIRESTORE_INDEXES.md` (or update `CLAUDE.md` if preferred, but a dedicated file is recommended).
   - **Content to include:**
     - **Deployment Instructions:** Clearly state the Firebase CLI command: `firebase deploy --only firestore:indexes`.
     - **Explanation of each index:** For each defined index, explain which specific query pattern it supports and why it's necessary (e.g., 'This index supports filtering by consultation status and ordering by creation date'). Reference relevant parts of `firestore.indexes.json`.
     - **Performance Considerations:** Briefly discuss the impact of indexes on read/write costs and query speed.
     - **Maintenance Notes:** Guidance on how to add or modify indexes in the future.

**4. Update Deployment Checklist:**
   - Add a step to the main deployment checklist (e.g., in a `DEPLOYMENT.md` or similar file) to "Verify Firestore indexes are deployed and up-to-date" using `firebase deploy --only firestore:indexes`.

**Test Strategy:**

1. **Deploy Indexes:** Execute `firebase deploy --only firestore:indexes` and verify in the Firebase Console (Firestore -> Indexes tab) that all defined composite indexes are successfully created and 'Enabled'.
2. **Query Verification:** Run the application and navigate to all screens that display consultation data (e.g., admin consultation list, buy/sell tabs from `Task 36`). Ensure these sections load data correctly without any Firestore 'missing index' errors. Monitor network requests to confirm queries are using the newly created indexes.
3. **Documentation Review:** Read `docs/FIRESTORE_INDEXES.md` (or relevant section in `CLAUDE.md`) to ensure the instructions are clear, accurate, and comprehensive. Verify that the explanation for each index explicitly links to its purpose and required query patterns.
4. **Deployment Checklist Review:** Confirm that the deployment checklist has been updated with a clear step for index deployment and verification.
