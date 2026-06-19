# Task ID: 109

**Title:** Add Search Functionality to VehiclesListScreen with Debounce and Multiple Criteria

**Status:** pending

**Dependencies:** None

**Priority:** medium

**Description:** Implement a search bar on `VehiclesListScreen` allowing users to filter vehicles by various criteria with debounced input.

**Details:**

Add a search input component to the `VehiclesListScreen` UI. Implement client-side search logic that filters the currently displayed list of vehicles. The search should support multiple criteria, including `vehicleName`, `manufacturer`, `year range`, and `price range`. Apply a debounce mechanism (e.g., 300ms) to the search input to prevent excessive filtering operations during typing, optimizing performance.

**Test Strategy:**

Enter search queries in the search bar. Verify that results filter instantly but with a slight delay due to debouncing. Test searching by various combinations of criteria (e.g., 'Tesla 2020', 'SUV under 50000'). Ensure that search results are accurate and comprehensive based on the specified criteria.
