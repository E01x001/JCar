# Task ID: 41

**Title:** Implement 'Completed Deals' Tab with Filtering and Statistics

**Status:** done

**Dependencies:** 36 ✓

**Priority:** medium

**Description:** Build the UI and logic for the '거래완료' tab, including monthly and type filters, and a summary card displaying key statistics for the selected period.

**Details:**

In the '거래완료' tab component, add two filter controls: a dropdown for the month (e.g., `react-native-picker-select`) and segmented controls for the type (All/Buy/Sell). Create a state to hold the filter values. Modify the Firestore query to filter by `completedAt` (for the selected month) and `type`. On the client-side, calculate the required statistics (total deals, total amount, etc.) from the fetched data and display them in a JCar `Card` component at the top of the list.

**Test Strategy:**

Populate Firestore with completed deals across several months and of both types. Test the month filter to ensure it correctly shows data only for the selected month. Test the type filter. Verify that the statistics displayed in the header card are calculated correctly and update when filters change.

## Subtasks

### 41.1. Add Month and Type Filter UI to 'Completed Deals' Tab

**Status:** done  
**Dependencies:** None  

Implement the user interface for filtering completed deals. This includes a dropdown for selecting the month and a segmented control for the deal type (All, Buy, Sell).

**Details:**

In the '거래완료' tab component file, add a `react-native-picker-select` component for month selection and a segmented control component for deal type. Position these controls above the list of deals.

### 41.2. Implement State Management for Filters

**Status:** done  
**Dependencies:** 41.1  

Create and manage the state for the selected month and deal type using React's `useState` hook. Connect the UI components from the previous task to update this state when their values change.

**Details:**

In the '거래완료' screen component, declare two state variables, for example: `const [selectedMonth, setSelectedMonth] = useState(new Date());` and `const [selectedType, setSelectedType] = useState('All');`. Wire these to the filter components' `onValueChange` props.

### 41.3. Modify Firestore Query to Apply Filters

**Status:** done  
**Dependencies:** 41.2  

Update the Firestore query hook or service function to filter the 'deals' collection based on the `selectedMonth` and `selectedType` state. The query must dynamically adjust to the selected filters.

**Details:**

The query logic must construct a date range for the `completedAt` timestamp field, covering the start and end of the `selectedMonth`. If `selectedType` is not 'All', add a `where('type', '==', selectedType)` clause to the query.

### 41.4. Calculate and Memoize Deal Statistics

**Status:** done  
**Dependencies:** 41.3  

Create logic to calculate key statistics (total deals, total purchase amount, total sales amount, net profit) from the filtered list of completed deals. Memoize the result to prevent unnecessary recalculations on re-renders.

**Details:**

Use the `useMemo` hook to process the array of fetched deals. The hook's dependency array must include the fetched data. The function should iterate through the deals, summing prices based on type to calculate total sales, purchases, and net profit.

### 41.5. Display Statistics in a Summary Card

**Status:** done  
**Dependencies:** 41.4  

Develop and integrate a UI component, using the existing JCar `Card` component as a base, to display the calculated statistics at the top of the 'Completed Deals' list.

**Details:**

Create a new component, e.g., `DealsSummaryCard`, that accepts the calculated statistics as props. This component will render a `Card` containing styled `Text` elements for each statistic. Place this component within the `ListHeaderComponent` of the `FlatList`.
