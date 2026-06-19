# Task ID: 58

**Title:** Implement Pagination for Completed Consultations Tab

**Status:** done

**Dependencies:** 35 ✓, 12 ✓

**Priority:** medium

**Description:** Refactor the `subscribeToCompletedConsultations` service function to support pagination and integrate an infinite scroll/load-more mechanism into `CompletedConsultationsTab` for improved scalability.

**Details:**

This task involves modifying the data fetching layer and the UI component to handle large datasets efficiently. 

**1. Refactor `subscribeToCompletedConsultations` (src/services/firebaseService.js):**
- Update the function signature to accept an optional `limit` parameter (number, default to 50) and an optional `startAfterDoc` parameter (Firestore `DocumentSnapshot` or a document ID string). 
- Construct the Firestore query using `.limit(limit)` and conditionally applying `.startAfter(startAfterDoc)` when provided. 
- The function should return an object containing:
    - `consultations`: An array of consultation data for the current page.
    - `lastVisibleDoc`: The `DocumentSnapshot` of the last document fetched in the current query result. This will serve as the cursor for the next page.
    - `hasMore`: A boolean indicating if there are more documents to fetch.
- Ensure existing filter functionality (if any) is correctly integrated and reset when filters change.

**2. Update `CompletedConsultationsTab` (src/screens/AdminConsultation/tabs/CompletedConsultationsTab.js):**
- Introduce new state variables to manage:
    - `consultationsData`: An array to store and append paginated consultation items.
    - `lastVisibleDoc`: The cursor for the next page, passed to the service function.
    - `loadingMore`: A boolean to indicate when more data is being fetched (for loading indicators).
    - `hasMore`: A boolean derived from the service response to control the visibility of the 'Load More' button/infinite scroll.
- Implement a `loadMoreConsultations` function (or similar) that:
    - Calls the paginated `subscribeToCompletedConsultations` with the current `limit` and `lastVisibleDoc`.
    - Updates `consultationsData` by appending new data.
    - Updates `lastVisibleDoc` with the new cursor and `hasMore` based on the response.
    - Manages the `loadingMore` state.
- Render a 'Load More' button at the bottom of the list, visible only if `hasMore` is true and not `loadingMore`. Utilize the `Button` component from Task 12 for consistency.
- Display a loading indicator (e.g., `ActivityIndicator` or `LoadingOverlay`) when `loadingMore` is true during subsequent page loads.
- When filters are changed, reset the `consultationsData`, `lastVisibleDoc`, and `hasMore` states, then initiate a fresh fetch for the first page with the new filters.
- Consider implementing `FlatList` with `onEndReached` and `onEndReachedThreshold` for a smoother infinite scroll experience, ensuring proper loading state handling.
- Handle edge cases gracefully:
    - No more data to load: Hide the 'Load More' button.
    - Network errors during pagination: Display an error message and provide a retry mechanism.

**Test Strategy:**

1. Navigate to the Admin Consultation screen and select the '거래완료' (Completed Consultations) tab.
2. Verify that initially, only the first page (default limit of 50 or configured test limit) of consultations is displayed.
3. Scroll to the bottom of the list. Confirm that a 'Load More' button appears if more data is available.
4. Tap the 'Load More' button. Observe that new consultations are appended to the list, and a loading indicator is briefly displayed.
5. Repeatedly tap 'Load More' until all consultations are loaded. Verify that the 'Load More' button disappears when no more data is available (`hasMore` is false).
6. If filters are implemented, apply a filter. Confirm the list resets to the first page of filtered data, and pagination restarts correctly.
7. Use a small `limit` (e.g., 5-10) during development/testing to easily verify pagination logic with fewer items.
8. Simulate network errors during a 'Load More' operation (e.g., by temporarily disabling network connectivity) and verify the UI handles this gracefully (e.g., displays an error message, offers a retry).
9. Ensure the display and interaction with individual consultation items remain functional after pagination.
