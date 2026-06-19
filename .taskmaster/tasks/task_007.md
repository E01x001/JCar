# Task ID: 7

**Title:** Enhance Admin Management Features

**Status:** done

**Dependencies:** 2 ✓

**Priority:** medium

**Description:** Implement high-priority admin features, including emergency vehicle deletion and a user management interface for suspending or activating accounts.

**Details:**

1. **Emergency Delete**: In the admin panel's vehicle view, add a 'Delete' button. On click, it should trigger a Firebase Function that performs a hard delete of the vehicle document and its associated images in Firebase Storage. This action should be logged in an admin activity log collection. 2. **User Management**: Create a new screen in the admin panel to list all users. Implement functionality to search and filter users. Each user item should have a toggle/button to change a `status` field in their user document (e.g., from 'active' to 'suspended'). Firestore security rules must be updated to deny writes from suspended users.

**Test Strategy:**

1. As an admin, delete a test vehicle and verify its document and storage files are removed. 2. As an admin, suspend a test user account. Log in as the suspended user and verify they are blocked from performing key actions (e.g., creating a consultation). 3. Verify all admin actions are correctly recorded in the activity log.

## Subtasks

### 7.1. Create Firebase Function for Emergency Vehicle Deletion

**Status:** done  
**Dependencies:** None  

Develop and deploy an HTTPS callable Firebase Function that hard-deletes a specified vehicle document from Firestore, removes its associated images from Firebase Storage, and logs the action in an 'admin_activity_log' collection.

**Details:**

The function should accept a `vehicleId` as input. It must first authenticate the request to ensure the caller is an admin. It will then fetch the vehicle document to get image URLs, delete files from the default storage bucket, delete the Firestore document, and finally create a log entry with admin UID, target vehicleId, and timestamp.

### 7.2. Implement 'Delete Vehicle' Button in Admin Panel UI

**Status:** done  
**Dependencies:** 7.1  

In the admin's vehicle management screen, add a 'Delete' button to each vehicle entry. This button will trigger a confirmation modal and, upon confirmation, call the vehicle deletion Firebase Function.

**Details:**

Locate the component responsible for rendering the list of vehicles for admins. Add a styled 'Delete' button. Implement an `Alert` or a custom modal to confirm the deletion. On confirmation, use the Firebase Functions SDK to call the `deleteVehicle` function, passing the `vehicleId`.

### 7.3. Build User Management Screen UI

**Status:** done  
**Dependencies:** None  

Create a new screen in the admin panel to display a list of all application users. The screen should include a search bar to find users by email or name.

**Details:**

Create a new screen component, e.g., `UserManagementScreen.js`. Add it to the admin navigation stack. Fetch all documents from the 'users' collection and display them in a `FlatList`. Each list item should show key user details (name, email, status). Implement a search input that filters the displayed list client-side or by re-querying Firestore.

### 7.4. Implement User Account Suspend/Activate Functionality

**Status:** done  
**Dependencies:** 7.3  

In the User Management screen, add a toggle switch or button to each user item that allows an admin to change the user's status between 'active' and 'suspended'.

**Details:**

For each user in the list, add a `Switch` or `Button` component that reflects the user's current `status` from Firestore. When the admin interacts with the control, it should trigger a Firestore update operation to change the `status` field on the corresponding user document. The UI should optimistically update or refetch data to show the new status.

### 7.5. Update Firestore Security Rules to Restrict Suspended Users

**Status:** done  
**Dependencies:** 7.4  

Modify `firestore.rules` to deny write access to key collections (e.g., 'consultation_requests', 'vehicles') for users whose `status` field in their own user document is set to 'suspended'.

**Details:**

Edit the `firestore.rules` file. For relevant collections, update the `allow write` conditions to include a check against the requesting user's document. The rule should look something like: `allow create: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'active';`
