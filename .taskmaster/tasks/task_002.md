# Task ID: 2

**Title:** Implement Firestore Security Rules

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Define and apply Firestore security rules for the users, vehicles, and consultation_requests collections to enforce proper access control and data validation.

**Details:**

Develop and deploy `firestore.rules`. The rules should enforce that: 
- `users`: A user can only read/write their own document (`allow read, write: if request.auth.uid == userId;`). Publicly readable fields should be explicitly allowed. 
- `vehicles`: Any authenticated user can read vehicle documents. Only authorized admins or the vehicle owner (if allowed) can create/update/delete. Writes should validate data types (e.g., `price` is a number). 
- `consultation_requests`: Users can only create requests for themselves. They can only read their own requests. Admins should have read/write access to all requests. 
- `Firebase Storage`: Rules for image uploads should ensure that only authenticated users can upload images and that file size and type are validated.

**Test Strategy:**

1. Use the Firebase Emulator Suite to test rules locally. 2. Write unit tests for security rules using the `@firebase/rules-unit-testing` library. 3. Create test cases for authenticated users, unauthenticated users, and admins attempting valid and invalid read/write operations on each collection.

## Subtasks

### 2.1. Initialize Firestore and Storage Rules Files and Configure Emulator

**Status:** done  
**Dependencies:** None  

Create the `firestore.rules` and `storage.rules` files. Set up the basic rules structure with a default deny-all policy. Configure the Firebase Emulator Suite for local testing of these rules.

**Details:**

Create `firestore.rules` and `storage.rules` in the project root. In `firestore.rules`, add `rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if false; } } }`. A similar deny-all rule should be added to `storage.rules`. This establishes a secure baseline before adding specific permissions.
<info added on 2025-11-27T01:00:25.182Z>
Updated firebase.json with firestore, storage, and emulator configurations. The emulator ports are now set to auth: 9099, firestore: 8080, storage: 9199, and ui: 4000. Firebase CLI v14.26.0 is installed and ready for local testing.
</info added on 2025-11-27T01:00:25.182Z>

### 2.2. Implement Security Rules for the 'users' Collection

**Status:** done  
**Dependencies:** 2.1  

Define security rules for the `users` collection to ensure a user can only read and write to their own document. This will also include creating a reusable function to check for admin privileges for use in other rules.

**Details:**

In `firestore.rules`, add a match block for `/users/{userId}`. Implement the rule `allow read, write: if request.auth.uid == userId;`. Also, create a global helper function `isAdmin()` which checks if the requesting user has an `isAdmin: true` field in their own user document: `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true`.
<info added on 2025-11-27T01:01:51.019Z>
The implementation in `firestore.rules` for the `/users/{userId}` path is complete. The `isAdmin()` helper function was created to check if the requesting user's document contains `role == 'admin'`. The final rules allow a user to read and write their own document, but also grant read access to any user document for users with the 'admin' role. The logic is effectively `allow read: if request.auth.uid == userId || isAdmin();` and `allow write: if request.auth.uid == userId;`.
</info added on 2025-11-27T01:01:51.019Z>

### 2.3. Implement Security Rules for the 'vehicles' Collection

**Status:** done  
**Dependencies:** 2.1, 2.2  

Define security rules for the `vehicles` collection. These rules should allow any authenticated user to read vehicle data but restrict create, update, and delete operations to admins. Data validation must be enforced on writes.

**Details:**

In `firestore.rules`, add a match block for `/vehicles/{vehicleId}`. Implement `allow read: if request.auth != null;`. For writes, use `allow create, update, delete: if isAdmin();`. Add data validation to ensure incoming data (`request.resource.data`) contains required fields and that `price` and `year` are numbers.
<info added on 2025-11-27T01:04:14.575Z>
Implemented security rules for vehicles collection in firestore.rules. Authenticated users can read all vehicle data. Only admins can create, update, or delete vehicles. Data validation ensures vehicleId, vehicleName, manufacturer, and sellerId are strings during create/update operations.
</info added on 2025-11-27T01:04:14.575Z>

### 2.4. Implement Security Rules for the 'consultation_requests' Collection

**Status:** done  
**Dependencies:** 2.1, 2.2  

Define security rules for the `consultation_requests` collection. Users must only be able to create requests for themselves and read their own requests. Admins require full read/write access to all requests.

**Details:**

Add a match block for `/consultation_requests/{requestId}`. The `read` rule should be `allow read: if request.auth.uid == resource.data.userId || isAdmin();`. The `create` rule should be `allow create: if request.auth.uid == request.resource.data.userId;`. The `update` and `delete` rules should be `allow update, delete: if isAdmin();`.
<info added on 2025-11-27T01:05:39.109Z>
Implemented the security rules for the `consultation_requests` collection in `firestore.rules`. The rules ensure that a user can read only their own requests, while an admin can read all. A user can only create a request for themselves (where their `auth.uid` matches the `userId` in the document). Updates and deletions are restricted to admins only.
</info added on 2025-11-27T01:05:39.109Z>

### 2.5. Implement Firebase Storage Security Rules for Image Uploads

**Status:** done  
**Dependencies:** 2.1  

Define security rules in `storage.rules` to manage file uploads for vehicle images. The rules must ensure that only authenticated users can upload files, and validate the file size and content type.

**Details:**

In the `storage.rules` file, create a match block for vehicle images, e.g., `match /vehicle-images/{userId}/{imageId}`. The write rule should be `allow write: if request.auth != null && request.auth.uid == userId;`. Add validation checks to limit file size (e.g., `request.resource.size < 5 * 1024 * 1024`) and content type (`request.resource.contentType.matches('image/.*')`).
<info added on 2025-11-27T01:06:51.729Z>
Implemented security rules in the `storage.rules` file for the `/vehicles/{filename}` path. The new rules allow public read access to all images. Write operations are restricted to authenticated users and include validation to ensure the file size is under 5MB and the content type is an image.
</info added on 2025-11-27T01:06:51.729Z>
