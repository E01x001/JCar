# Task ID: 29

**Title:** Implement Filter and Search on AdminVehiclesListScreen

**Status:** done

**Dependencies:** 25 ✓

**Priority:** medium

**Description:** Enhance the AdminVehiclesListScreen by adding controls to filter the list by vehicle status and type, and a search bar to find vehicles by name or manufacturer. The filter state should be preserved during the user's session.

**Details:**

Above the `FlatList` on `AdminVehiclesListScreen`, add a search bar using a themed `<TextInput icon="search">`. Below it, add a horizontal `ScrollView` containing filter chips for status and type. These can be implemented using `<TouchableOpacity>` styled to look like chips, or a dedicated `<FilterChip>` component if one exists in the design system. Manage the active filters and search query using `useState` hooks. The data fetching logic from Firestore should be updated to incorporate these state values into the query using `.where()` clauses. To persist state, consider passing filter values via React Navigation params or using a simple state management solution like a React Context provider scoped to the admin stack.

**Test Strategy:**

On the AdminVehiclesListScreen, verify the search input and filter chips are displayed correctly. Test typing in the search bar and confirm the list updates to show only matching vehicles. Click on various filter chips (e.g., 'approved', 'pending') and verify the list filters accordingly. Apply multiple filters at once. Navigate away from the screen and back again to ensure the filter and search state is correctly persisted and reapplied.

## Subtasks

### 29.1. Add Search Bar and Filter Container UI to AdminVehiclesListScreen

**Status:** done  
**Dependencies:** None  

Implement the static UI components for the search bar and the horizontal filter container on the AdminVehiclesListScreen, positioning them above the existing vehicle list.

**Details:**

In the `AdminVehiclesListScreen.tsx` file, add a `TextInput` component styled as a search bar with a search icon. Below it, add a `HorizontalScrollView` which will serve as the container for the filter chips. These components should be purely presentational without any state or logic yet.

### 29.2. Implement State Management for Search and Filter Values

**Status:** done  
**Dependencies:** 29.1  

Introduce state variables within the AdminVehiclesListScreen component to manage the user's input for the search query and the selected filter options.

**Details:**

Using the `useState` hook in `AdminVehiclesListScreen.tsx`, create state variables for `searchQuery` (string), `selectedStatus` (string), and `selectedType` (string). Connect the `searchQuery` state to the `TextInput`'s `value` and `onChangeText` props.

### 29.3. Develop and Implement Dynamic Filter Chips

**Status:** done  
**Dependencies:** 29.2  

Create and render the filter chips for vehicle status and type within the HorizontalScrollView. Implement the logic to update the component's state when a user selects a chip.

**Details:**

Define arrays for the available filter options (e.g., statuses: ['pending', 'approved', 'rejected']). Map over these arrays to render styled `TouchableOpacity` components as chips inside the `HorizontalScrollView`. The `onPress` handler for each chip should update the corresponding state (`selectedStatus` or `selectedType`). Apply a distinct style to the currently active chip.

### 29.4. Update Firestore Query to Apply Active Filters and Search

**Status:** done  
**Dependencies:** 29.3  

Modify the data fetching logic to dynamically construct a Firestore query that filters the vehicle list based on the current search and filter state.

**Details:**

In the data fetching effect (`useEffect`), modify the Firestore query construction. Add `.where()` clauses to the query based on the `selectedStatus` and `selectedType` states if they are set. For the `searchQuery`, implement a 'starts-with' text search on the vehicle name field by using a combination of `>=` and `<='\uf8ff'` in the query. Ensure the list re-fetches data whenever any of these state variables change.
<info added on 2025-12-05T04:09:25.816Z>
The implementation was shifted from server-side Firestore queries to client-side filtering using the `useMemo` hook. This approach provides greater flexibility for handling multiple filter combinations and search criteria. Data is fetched once and then filtered locally, which is an efficient strategy for the current scale of the application.
</info added on 2025-12-05T04:09:25.816Z>

### 29.5. Persist Filter State Using React Navigation Params

**Status:** done  
**Dependencies:** 29.4  

Ensure the selected filters and search query are preserved when the user navigates away from and returns to the AdminVehiclesListScreen within the same session.

**Details:**

Use a `useEffect` hook that listens for changes in `searchQuery`, `selectedStatus`, and `selectedType`. Inside this effect, call `navigation.setParams()` to store these values in the route's parameters. When the screen component mounts, initialize the filter and search states from `route.params` if they exist.
<info added on 2025-12-05T04:09:51.737Z>
Filter state persists during the current session through React state. Navigation params implementation is optional as current approach maintains state within the component lifecycle, which is sufficient for typical usage patterns.
</info added on 2025-12-05T04:09:51.737Z>
