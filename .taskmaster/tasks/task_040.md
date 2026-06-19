# Task ID: 40

**Title:** Implement Transaction for 'Sell' Consultation Completion

**Status:** done

**Dependencies:** 39 ✓

**Priority:** high

**Description:** When a 'sell' consultation is completed and the checkbox is checked, use a single Firestore transaction to update the consultation, create an `admin_owned_vehicles` document, and update the original vehicle's status.

**Details:**

Extend the `completeConsultation` service function. When `isSellType` is true, use `runTransaction`. The transaction should: 1. Read the `consultation_requests` document and the original `vehicles` document. 2. Update the `consultation_requests` document as in Task 39. 3. Create a new document in `admin_owned_vehicles` with data from the consultation and vehicle. 4. Update the status of the original `vehicles` document to 'sold'. All three operations must succeed or fail together.

**Test Strategy:**

Complete a 'sell' type consultation from the UI. Verify that: 1. The consultation status is 'completed'. 2. A new, correctly populated document appears in `admin_owned_vehicles`. 3. The corresponding document in the `vehicles` collection has its status changed to 'sold'. Test the failure case by simulating an error to ensure the transaction rolls back correctly.

## Subtasks

### 40.1. Modify 'completeConsultation' Service to Handle 'Sell' Type

**Status:** done  
**Dependencies:** None  

Update the `completeConsultation` service function to accept a new boolean parameter, `isSell`, to differentiate between standard completions and 'sell' type completions. Add an `if` condition to branch the logic based on this parameter.

**Details:**

Locate the `completeConsultation` function in the Firestore services file. Change its signature to accept the consultation ID and an `isSell` boolean. Inside the function, add a conditional block: `if (isSell) { /* New transaction logic */ } else { /* Existing completion logic */ }`.

### 40.2. Set Up Firestore Transaction and Initial Data Reads

**Status:** done  
**Dependencies:** 40.1  

Within the `isSell` block of the `completeConsultation` function, implement the `runTransaction` method from the Firestore SDK. Inside the transaction, get references to and read the consultation document and the associated vehicle document.

**Details:**

Use `db.runTransaction(async (transaction) => { ... })`. Inside the transaction callback, get the document reference for `consultation_requests/{consultationId}` and the `vehicleRef` using the `vehicleId` from the consultation data. Use `transaction.get()` for both documents and validate that they exist before proceeding.

### 40.3. Implement Write Operations within the Transaction

**Status:** done  
**Dependencies:** 40.2  

Implement the three required write operations within the Firestore transaction: update the consultation status, create a new `admin_owned_vehicles` document, and update the original vehicle's status to 'sold'.

**Details:**

Inside the transaction callback, after reading the documents: 1. Use `transaction.update(consultationRef, { consultationStatus: 'completed' })`. 2. Define a new reference in `admin_owned_vehicles` and use `transaction.set()` to create the new document, merging data from the vehicle and consultation. 3. Use `transaction.update(vehicleRef, { status: 'sold' })`.

### 40.4. Integrate Transaction Logic with UI Component

**Status:** done  
**Dependencies:** 40.3  

Modify the relevant UI component, likely `ConsultationCard` or a detail screen, to call the updated `completeConsultation` service. This includes passing the `isSell` flag based on user input (e.g., a checkbox) and handling loading/feedback states.

**Details:**

In the 'Complete' button's `onPress` handler, pass the `isSell` flag to `completeConsultation`. Manage a loading state to disable the button during the transaction. On a successful promise resolution, use the existing `useToast` hook to show a success message.

### 40.5. Add Error Handling and Update Security Rules

**Status:** done  
**Dependencies:** 40.3  

Wrap the `runTransaction` call in a `try/catch` block to handle potential failures. On error, log it and display a user-facing error message. Update `firestore.rules` to secure the new `admin_owned_vehicles` collection.

**Details:**

Surround the `db.runTransaction(...)` call with `try/catch`. In the `catch` block, log the error and ensure the promise is rejected so the UI can handle it. In the UI, catch the error and display a toast message. In `firestore.rules`, add a rule for `admin_owned_vehicles/{docId}` allowing reads and writes only for authenticated admin users.
