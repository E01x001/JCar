# Task ID: 42

**Title:** Add 'Owned Vehicles' Section to `AdminPageScreen`

**Status:** done

**Dependencies:** 40 ✓

**Priority:** medium

**Description:** Enhance the `AdminPageScreen` by adding a new section that displays a horizontally scrollable list of vehicles owned by the admin.

**Details:**

Create a new component, `OwnedVehiclesList`. This component will fetch data from the `admin_owned_vehicles` collection where `status` is 'owned'. Use a `FlatList` with `horizontal={true}`. Each item in the list will be a JCar `Card` component displaying the vehicle's image, name, purchase price, and purchase date. Integrate this `OwnedVehiclesList` component into the `AdminPageScreen` layout.

**Test Strategy:**

Ensure there are several documents with `status: 'owned'` in the `admin_owned_vehicles` collection. Navigate to the `AdminPageScreen` and verify the new section appears and correctly displays the owned vehicles. Test horizontal scrolling. Test the empty state using the `StateScreen` component if no vehicles are owned.

## Subtasks

### 42.1. Create OwnedVehiclesList Component and Set Up Data Fetching

**Status:** done  
**Dependencies:** None  

Create a new file for the `OwnedVehiclesList` component and implement the Firestore query to fetch vehicles from the `admin_owned_vehicles` collection where the status is 'owned'.

**Details:**

Create the file `src/components/admin/OwnedVehiclesList.js`. Inside, set up a functional component. Use the existing Firebase utility or hook to create a query on the `admin_owned_vehicles` collection with a `where('status', '==', 'owned')` clause. Manage the fetched data in the component's state.

### 42.2. Implement the Vehicle Item Card UI

**Status:** done  
**Dependencies:** 42.1  

Create the render function or sub-component responsible for displaying a single vehicle's information within a JCar `Card` component.

**Details:**

Within `OwnedVehiclesList`, create a function `renderVehicleItem({ item })`. This function will return a JCar `Card` component. The card should display the vehicle's image, name (e.g., `item.name`), purchase price, and purchase date using the JCar design system's typography components.

### 42.3. Build the Horizontal FlatList for Owned Vehicles

**Status:** done  
**Dependencies:** 42.1, 42.2  

Use the `FlatList` component to create a horizontally scrolling list of the vehicle item cards.

**Details:**

In the `OwnedVehiclesList` component, implement a `FlatList`. Set its `data` prop to the fetched vehicles state. Set the `renderItem` prop to the `renderVehicleItem` function created in the previous task. Configure it for horizontal scrolling by setting `horizontal={true}` and `showsHorizontalScrollIndicator={false}`. Add appropriate styling for padding and item spacing.

### 42.4. Handle Loading and Empty List States

**Status:** done  
**Dependencies:** 42.1  

Implement UI states for when the vehicle data is loading and when the fetched list is empty.

**Details:**

Check the status of the data fetching hook. While loading, display a `Spinner` or similar loading indicator. If the fetch is complete and the data array is empty, render the `StateScreen` component with an appropriate icon and message, such as 'No owned vehicles to display'.

### 42.5. Integrate OwnedVehiclesList into AdminPageScreen

**Status:** done  
**Dependencies:** 42.3, 42.4  

Import and render the `OwnedVehiclesList` component within the `AdminPageScreen` layout and implement navigation to the detail screen.

**Details:**

Open `src/screens/admin/AdminPageScreen.js`. Import the `OwnedVehiclesList` component. Add a section title (e.g., using `theme.typography.H4`) like 'Owned Vehicles' and place the `<OwnedVehiclesList />` component below it. Add an `onPress` handler to the `Card` in `renderVehicleItem` that navigates to `AdminOwnedVehicleDetailScreen`, passing the `item.id` as a route parameter.
