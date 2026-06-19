# Task ID: 43

**Title:** Create `AdminOwnedVehicleDetailScreen`

**Status:** done

**Dependencies:** 42 ✓

**Priority:** medium

**Description:** Build a new screen to show detailed information about an admin-owned vehicle and allow the admin to mark it as sold.

**Details:**

Create a new screen component `AdminOwnedVehicleDetailScreen`. This screen receives an `vehicleId` as a navigation parameter. It will fetch and display all data for that vehicle from the `admin_owned_vehicles` collection. Include a button '[판매완료 처리]'. Tapping this button will open a modal to input the `soldPrice`. On confirmation, update the vehicle's document in Firestore, setting `status` to 'sold', and adding `soldPrice` and `soldDate`.

**Test Strategy:**

Navigate to the detail screen from the `OwnedVehiclesList` on the admin page. Verify all information is displayed correctly. Use the '판매완료 처리' button and modal to sell a vehicle. Check Firestore to confirm the document's status and sold fields are updated. After selling, confirm the vehicle is no longer visible in the `OwnedVehiclesList` on `AdminPageScreen`.

## Subtasks

### 43.1. Create AdminOwnedVehicleDetailScreen File and Configure Navigation

**Status:** done  
**Dependencies:** None  

Create the basic file structure for the new screen component, `AdminOwnedVehicleDetailScreen`, and add it to the admin navigation stack to make it accessible within the app.

**Details:**

Create a new file at `src/screens/admin/AdminOwnedVehicleDetailScreen.js`. Define a basic functional component. Import this screen into the admin navigator (e.g., `AdminStackNavigator.js`) and add it as a new `Stack.Screen` so that it can be navigated to from the vehicle list.

### 43.2. Fetch and Display Vehicle Details from Firestore

**Status:** done  
**Dependencies:** 43.1  

Implement the data fetching logic to retrieve the specific vehicle's details from the `admin_owned_vehicles` collection in Firestore using the `vehicleId` passed through navigation parameters, and then display this information on the screen.

**Details:**

Inside `AdminOwnedVehicleDetailScreen`, use the `useRoute` hook to get the `vehicleId` parameter. Use a `useEffect` hook to fetch the document from `firestore().collection('admin_owned_vehicles').doc(vehicleId)`. Manage loading and error states. Render the vehicle's data using appropriate components like `Text` and `View` within a `ScrollView`.

### 43.3. Add '판매완료 처리' Button and 'Sold Price' Modal

**Status:** done  
**Dependencies:** 43.2  

Implement the UI for the '[판매완료 처리]' (Mark as Sold) button. Pressing this button should display a modal asking the admin to input the final selling price (`soldPrice`).

**Details:**

Add a `TouchableOpacity` or a custom button component to the screen with the label '[판매완료 처리]'. Use `useState` to manage the visibility of a `Modal` component. The modal should contain a `TextInput` for the `soldPrice` (with `keyboardType='numeric'`), a 'Confirm' button, and a 'Cancel' button.

### 43.4. Implement Firestore Update Logic for Selling Vehicle

**Status:** done  
**Dependencies:** 43.3  

Develop the function that executes when the admin confirms the sale in the modal. This function will update the corresponding vehicle document in Firestore with the new status, sold price, and sold date.

**Details:**

Create an asynchronous function that will be called by the modal's 'Confirm' button. This function should perform a `firestore().collection('admin_owned_vehicles').doc(vehicleId).update()` operation. The data to update is `{ status: 'sold', soldPrice: <price_from_input>, soldDate: firestore.FieldValue.serverTimestamp() }`.

### 43.5. Add Post-Update Feedback and Navigation

**Status:** done  
**Dependencies:** 43.4  

After successfully updating the vehicle's status to 'sold' in Firestore, provide feedback to the user and navigate them away from the detail screen.

**Details:**

Upon a successful Firestore update, close the modal, display a success message to the admin (e.g., using a toast or an alert), and then use the `navigation.goBack()` method to return the user to the previous screen (the vehicle list). Implement error handling for the update operation.
