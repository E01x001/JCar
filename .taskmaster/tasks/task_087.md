# Task ID: 87

**Title:** Implement Cursor-Based Pagination for Large Firestore Datasets (Vehicles, Consultations)

**Status:** pending

**Dependencies:** 86 ✓

**Priority:** high

**Description:** Integrate cursor-based pagination for displaying large lists of vehicles and consultations to improve load times and user experience.

**Details:**

Extend the server-side queries (from Task 86) to include `limit()` and `startAfter()` or `startAt()` clauses for cursor-based pagination. Update the UI components responsible for displaying lists (e.g., `FlatList` in `VehiclesListScreen`, consultation screens) to support loading data in chunks. Implement 'Load More' functionality or infinite scrolling when the end of the current page is reached.

**Test Strategy:**

Test pagination by verifying that only a limited number of items load initially. Scroll to the end of the list and confirm that the next page of data loads correctly. Verify that pagination works for both vehicle and consultation listings and that no duplicates or missing items occur across pages. Monitor Firestore reads to ensure only necessary documents are fetched per page.
