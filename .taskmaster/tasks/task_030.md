# Task ID: 30

**Title:** Add Statistics Dashboard Cards to List Screens

**Status:** done

**Dependencies:** 25 ✓, 27 ✓

**Priority:** low

**Description:** Display high-level summary statistics on the AdminVehiclesListScreen and AdminConsultationScreen using `Card` components to give admins a quick overview of key metrics like total counts and status breakdowns.

**Details:**

On `AdminVehiclesListScreen`, fetch aggregate data from Firestore. This may require a separate query or could be calculated client-side if the dataset is small. Display the counts (Total, Pending, Approved, Rejected) in a horizontal `ScrollView` of `<Card>` components at the top of the screen. Each card should contain an icon from `@expo/vector-icons/MaterialIcons` (e.g., 'directions-car' for total) and the statistic. Repeat this process for `AdminConsultationScreen`, showing counts for total consultations and breakdowns by status. The data should update in real-time by listening to Firestore collection changes.

**Test Strategy:**

Load the AdminVehiclesListScreen and AdminConsultationScreen. Verify that the statistics cards are displayed at the top. Confirm the numbers shown are accurate by manually counting items in the database or list. Add, update, or delete a vehicle/consultation and verify that the corresponding statistic card updates in real-time without a manual refresh. Check that icons and colors are applied correctly according to the design system.

## Subtasks

### 30.1. Create Reusable StatisticsCard Component

**Status:** done  
**Dependencies:** None  

Develop a reusable `StatisticsCard` component that displays an icon, a label, and a numerical value. This component will be used to show key metrics on the admin list screens.

**Details:**

The component should accept `iconName`, `label`, and `count` as props. It will use the base `Card` component for its container and `MaterialIcons` from `@expo/vector-icons` for the icon. Style it for clarity and visual appeal, ensuring it is consistent with the app's design system.

### 30.2. Implement Real-time Vehicle Statistics Logic

**Status:** done  
**Dependencies:** None  

Create a custom hook (e.g., `useVehicleStats`) to fetch vehicle data from Firestore in real-time and calculate aggregate statistics for total count and status breakdowns (Pending, Approved, Rejected).

**Details:**

Use Firestore's `onSnapshot` listener on the 'vehicles' collection. The hook should process the collection snapshot to derive the counts for each status client-side. It should return a state object like `{ total: number, pending: number, approved: number, rejected: number, loading: boolean }`.

### 30.3. Integrate Statistics Cards into AdminVehiclesListScreen

**Status:** done  
**Dependencies:** 30.1, 30.2  

Add a statistics dashboard section to the top of the `AdminVehiclesListScreen` to display the real-time vehicle counts using the newly created components and logic.

**Details:**

In `AdminVehiclesListScreen`, use the `useVehicleStats` hook to get the data. Render the statistics inside a horizontal `ScrollView` placed above the main vehicle list. Use the `StatisticsCard` component for each metric (Total, Pending, Approved, Rejected).

### 30.4. Implement Real-time Consultation Statistics Logic

**Status:** done  
**Dependencies:** None  

Create a custom hook (e.g., `useConsultationStats`) to fetch consultation data from Firestore in real-time and calculate aggregate statistics based on their status.

**Details:**

Similar to the vehicle stats hook, use Firestore's `onSnapshot` listener on the 'consultations' collection. The hook should process the snapshot to derive the total count and counts for each relevant status (e.g., pending, confirmed, completed). Return a state object with the counts and loading status.

### 30.5. Integrate Statistics Cards into AdminConsultationScreen

**Status:** done  
**Dependencies:** 30.1, 30.4  

Add a statistics dashboard section to the top of the `AdminConsultationScreen` to display real-time consultation counts.

**Details:**

In `AdminConsultationScreen`, use the `useConsultationStats` hook. Render the `StatisticsCard` components for each metric inside a horizontal `ScrollView`. This section should be placed above the `TabView` component that handles the tabbed lists.
