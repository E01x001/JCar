# Task ID: 56

**Title:** Optimize Completed Consultations Query with Composite Index and Client-Side Sorting

**Status:** done

**Dependencies:** 36 ✓, 33 ✓

**Priority:** medium

**Description:** Optimize the Firestore query for completed consultations by removing redundant server-side sorting, ensuring efficient client-side ordering, and defining a necessary composite index.

**Details:**

This task focuses on improving the performance and correctness of the `subscribeToCompletedConsultations` function within `src/services/firebaseService.js`. The current implementation has an inefficient double-sorting mechanism.

**Implementation Steps:**
1.  **Modify Firestore Query:** Locate the `subscribeToCompletedConsultations` function in `src/services/firebaseService.js`. Remove the `orderBy('createdAt', 'desc')` clause from the Firestore query. This eliminates redundant server-side sorting.
2.  **Retain Client-Side Sorting:** Confirm that the existing client-side JavaScript `sort()` logic, which orders consultations by `archivedAt || completedAt` (most recent first), remains active and correctly applied after the Firestore data is fetched. This will be the primary sorting mechanism for completed/archived consultations.
3.  **Define Composite Index:** Analyze the `where` clauses used in `subscribeToCompletedConsultations` (especially if an `in` query is present) to determine the exact fields required for an efficient composite index. Create or update the `firestore.indexes.json` file in the project root with the definition for this composite index. This index is crucial for supporting the remaining server-side filtering efficiently, even without server-side sorting.
4.  **Update Documentation:** Add clear inline comments within the `subscribeToCompletedConsultations` function explaining the rationale for client-side sorting (e.g., small dataset, custom `archivedAt || completedAt` logic). Also, document the new composite index, its purpose, and its definition location (`firestore.indexes.json`), making it clear it's a performance recommendation.

**Considerations:**
*   The decision to use client-side sorting is based on the assumption that the dataset of completed/archived consultations remains relatively small. Monitor this data size; if it grows significantly, a future task for server-side pagination and sorting will be necessary.

**Test Strategy:**

1.  **Code Review:** Verify that `orderBy('createdAt', 'desc')` has been removed from the Firestore query in `subscribeToCompletedConsultations`.
2.  **Functional Testing:** Create or modify several completed/archived consultation documents in Firestore with varying `createdAt`, `completedAt`, and `archivedAt` timestamps to ensure diverse data for sorting.
3.  **UI Verification:** Navigate to the '거래완료' tab in the application. Confirm that the consultations are correctly sorted by `archivedAt` (if present) or `completedAt` in descending order (most recent first).
4.  **Firestore Index Verification:** After deploying the `firestore.indexes.json`, check the Firestore console under 'Indexes' to confirm that the new composite index has been successfully created and is serving queries. Monitor for any index-related errors or warnings.
5.  **Performance Check:** Observe the loading time of the '거래완료' tab to ensure there is no performance degradation, and ideally, an improvement.
6.  **Documentation Check:** Confirm that the inline comments and/or relevant documentation files clearly explain the client-side sorting rationale and the details of the new composite index.
