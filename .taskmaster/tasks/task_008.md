# Task ID: 8

**Title:** Implement Advanced Vehicle Search and Filters

**Status:** done

**Dependencies:** None

**Priority:** medium

**Description:** Develop an advanced search interface allowing users to filter and sort the vehicle list by multiple criteria such as price range, year, and manufacturer.

**Details:**

1. Create a 'Filter' modal or screen accessible from the main vehicle list. 2. Add UI components for filtering: sliders for price/year range, multi-select pickers for manufacturers. 3. When the user applies filters, construct a composite Firestore query. For example: `firestore().collection('vehicles').where('price', '>=', minPrice).where('price', '<=', maxPrice).orderBy('price').limit(20)`. Note Firestore's limitations on composite queries may require data duplication or a more advanced search solution like Algolia if complexity increases. 4. Implement sorting options (e.g., Price: Low to High) which will modify the `orderBy()` clause of the Firestore query.

**Test Strategy:**

1. Unit test the query construction logic. 2. Manually test the UI by applying various filter combinations and verifying that the returned vehicle list is accurate. 3. Test edge cases, such as a filter combination that yields no results, ensuring a user-friendly message is displayed.

## Subtasks

### 8.1. Create Filter Modal UI and Navigation Trigger

**Status:** done  
**Dependencies:** None  

Create a new modal component for the advanced search filters and add a 'Filter' button to the main vehicle list screen to open it.

**Details:**

In the `VehicleListScreen.tsx`, add a new `Button` or `TouchableOpacity` component that, when pressed, will present the `FilterModal`. The `FilterModal` component should be created as a new file, e.g., `src/components/modals/FilterModal.tsx`. Initially, it can be a simple shell with a title, a close button, and an 'Apply Filters' button.

### 8.2. Develop UI Components for Filtering Criteria

**Status:** done  
**Dependencies:** 8.1  

Implement the UI components inside the filter modal for price range, year range, and manufacturer selection.

**Details:**

Inside `FilterModal.tsx`, add the necessary UI controls. Use a slider component (e.g., from `@react-native-community/slider`) for price and year ranges. For manufacturers, implement a multi-select list. Fetch the list of unique manufacturers from the Firestore 'vehicles' collection once. Use `useState` within the modal to manage the temporary state of these inputs before they are applied.

### 8.3. Implement Filter State Management

**Status:** done  
**Dependencies:** 8.1  

Establish a mechanism, likely using React Context or a global state manager, to hold the applied filter values and make them accessible to the vehicle list screen.

**Details:**

Create a `FilterContext` to manage the state of active filters. The context provider should wrap the main navigator or at least the `VehicleListScreen`. The `FilterModal` will use the context's updater function when the 'Apply Filters' button is pressed. The `VehicleListScreen` will consume this context to get the current filter criteria.

### 8.4. Build Dynamic Firestore Query Construction Service

**Status:** done  
**Dependencies:** None  

Create a utility function or service that takes a filter object and dynamically constructs a Firestore query with the appropriate 'where' and 'orderBy' clauses.

**Details:**

Create a new file, e.g., `src/services/firestoreQueryBuilder.ts`. This file will export a function `buildVehicleQuery(filters)` which accepts an object like `{ minPrice, maxPrice, manufacturers, sortBy }`. The function will start with `firestore().collection('vehicles')` and conditionally chain `.where()` and `.orderBy()` methods based on the provided filters. It must handle cases where filters are not set. Note Firestore's limitation: range filters can only be on one field per query.

### 8.5. Integrate Filtering Logic into Vehicle List Screen

**Status:** done  
**Dependencies:** 8.2, 8.3, 8.4  

Connect the filter state and the query builder to the vehicle list screen to fetch and display the filtered and sorted data from Firestore.

**Details:**

In `VehicleListScreen.tsx`, use the `FilterContext` to get the current filters. Use a `useEffect` hook that listens for changes to these filters. When filters change, call the `buildVehicleQuery` service with the new filter state, execute the resulting query against Firestore, and update the component's state with the new list of vehicles. Also, implement a loading indicator and a message for when no results are found.
