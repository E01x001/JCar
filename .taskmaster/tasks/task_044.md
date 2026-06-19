# Task ID: 44

**Title:** Update Firebase Security Rules

**Status:** done

**Dependencies:** 33 ✓, 43 ✓

**Priority:** high

**Description:** Update and deploy Firebase Security Rules to secure the modified `consultation_requests` collection and the new `admin_owned_vehicles` collection.

**Details:**

Open the `firestore.rules` file. Update the rule for `/consultation_requests/{docId}` to reflect the logic in the PRD, allowing admins to write and users to update their own requests under specific conditions. Add a new rule block for `/admin_owned_vehicles/{docId}` that restricts all read and write access to authenticated users with an 'admin' role (`request.auth.token.role == 'admin'`).

**Test Strategy:**

Use the Firestore Rules Playground in the Firebase Console. Simulate various scenarios: 1. An unauthenticated user trying to read/write. 2. A non-admin user trying to read/write `admin_owned_vehicles`. 3. An admin user successfully reading/writing both collections. 4. A non-admin user trying to update another user's consultation request. All tests should pass or fail as expected.

## Subtasks

### 44.1. Analyze Existing Rules and New Schemas

**Status:** done  
**Dependencies:** None  

Review the current `firestore.rules` file to understand the existing security structure. Cross-reference the updated schema for `consultation_requests` and the new schema for `admin_owned_vehicles` from Task 33 to prepare for the rule implementation.

**Details:**

Locate the `firestore.rules` file in the project. Read the existing rules for `users`, `vehicles`, and `consultation_requests` to understand current patterns and any helper functions. This will ensure the new rules are consistent with the existing structure.

### 44.2. Implement Security Rules for `admin_owned_vehicles`

**Status:** done  
**Dependencies:** 44.1  

Add a new rule block in `firestore.rules` for the `admin_owned_vehicles` collection. This rule must restrict all read and write operations to authenticated users with a custom claim of `role == 'admin'`.

**Details:**

In `firestore.rules`, add a new match block: `match /admin_owned_vehicles/{vehicleId} { allow read, write: if request.auth.token.role == 'admin'; }`. This ensures that no other user type can access this sensitive data.

### 44.3. Update Security Rules for `consultation_requests`

**Status:** done  
**Dependencies:** 44.1  

Modify the existing security rules for the `/consultation_requests/{docId}` path to align with the new logic. Admins should have full write access, while users can only update their own requests under specific conditions.

**Details:**

Locate the `match /consultation_requests/{docId}` block. Update the `allow write` rule to be a combination of conditions: `(request.auth.token.role == 'admin') || (request.auth.uid == resource.data.userId && /* add other conditions from PRD */)`. Ensure the `create` rule still allows users to create their own requests.

### 44.4. Execute Local Testing via Emulator Suite

**Status:** done  
**Dependencies:** 44.2, 44.3  

Using the Firebase Emulator Suite and the project's testing framework, write and execute unit tests for the newly added and updated security rules. This ensures all access paths are explicitly tested before deployment.

**Details:**

In the existing security rules test file (e.g., `firestore.rules.spec.js`), add new test suites for `admin_owned_vehicles` and `consultation_requests`. Create mock data and simulate authenticated users (admin, non-admin) and unauthenticated users attempting valid and invalid operations.

### 44.5. Deploy `firestore.rules` and Verify in Console

**Status:** done  
**Dependencies:** 44.4  

Deploy the updated and tested `firestore.rules` file to the live Firebase project using the Firebase CLI. After deployment, perform a final verification using the Firebase Console.

**Details:**

From the project root directory, run the command `firebase deploy --only firestore:rules`. After the CLI reports a successful deployment, navigate to the Firestore Rules tab in the Firebase Console to confirm the new rules are visible and active.
