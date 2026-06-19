# Task ID: 34

**Title:** Create One-Time Data Migration Script

**Status:** done

**Dependencies:** 33 ✓

**Priority:** medium

**Description:** Write and execute a script to migrate existing documents in the `consultation_requests` collection to the new data structure, ensuring backward compatibility and data integrity.

**Details:**

Using Firebase Admin SDK (e.g., in a Node.js environment), create a script that: 1. Fetches all documents from `consultation_requests`. 2. For each document, maps the old `status` ('pending', 'approved', 'rejected') to the new `consultationStatus` ('pending', 'confirmed', 'rejected'). 3. Adds the new fields (`completedAt`, `completedBy`, `dealAmount`, `adminNotes`) with default `null` values. 4. Uses a batched write to update all documents efficiently. The script should be run once.

**Test Strategy:**

Run the script on a staging/development Firestore instance first. Verify a sample of documents before and after the migration to ensure the mapping is correct and no data is lost. Check that all documents now contain the new fields with appropriate default values.

## Subtasks

### 34.1. Setup Node.js Environment and Firebase Admin SDK for Migration Script

**Status:** done  
**Dependencies:** None  

Initialize a Node.js environment for the migration script. This includes installing the `firebase-admin` SDK and setting up Firebase service account credentials for secure access to the Firestore database.

**Details:**

Create a new directory (e.g., `scripts/migrations`). Initialize it with `npm init -y`. Install `firebase-admin` via npm. Obtain the service account key JSON file from the Firebase project console and ensure it's accessible to the script but excluded from version control via `.gitignore`. Create the main script file, `migrateConsultations.js`.

### 34.2. Implement Logic to Fetch All `consultation_requests` Documents

**Status:** done  
**Dependencies:** 34.1  

Write the code within the migration script to connect to Firestore and retrieve all documents currently present in the `consultation_requests` collection.

**Details:**

Using the initialized `firebase-admin` instance, get a reference to the `consultation_requests` collection. Use the `.get()` method to fetch the collection snapshot. Add logging to display the total number of documents fetched to confirm the connection is working and data is being read.

### 34.3. Define and Implement the Data Transformation Logic

**Status:** done  
**Dependencies:** 34.2  

For each fetched document, implement the function that transforms the data from the old structure to the new one. This involves mapping the status field and adding several new fields with default null values.

**Details:**

Create a function that accepts a document's data. Inside, map the `status` field ('pending' -> 'pending', 'approved' -> 'confirmed', 'rejected' -> 'rejected') to a new field named `consultationStatus`. Add the new fields `completedAt`, `completedBy`, `dealAmount`, and `adminNotes`, all with an initial value of `null`.

### 34.4. Implement Batched Writes to Firestore for Efficient Updates

**Status:** done  
**Dependencies:** 34.3  

Refactor the script to use Firestore's `WriteBatch` feature to group update operations. This will ensure the migration runs efficiently, avoids rate-limiting issues, and minimizes costs.

**Details:**

Initialize a `WriteBatch` object. Inside the loop that processes documents, add an `update` operation for each transformed document to the batch instead of writing it individually. Keep a counter and commit the batch when it reaches a predefined size (e.g., 450 documents). Remember to commit the final batch which may be smaller.

### 34.5. Add Logging, Error Handling, and Execute on Staging Environment

**Status:** done  
**Dependencies:** 34.4  

Finalize the script by adding comprehensive logging for progress tracking and robust error handling. After thorough testing, execute the script on the staging database and verify the migration's success.

**Details:**

Wrap the main migration logic in a try/catch block to handle any potential failures during the process. Add `console.log` statements to indicate start, progress (e.g., 'Batch X of Y committed'), and completion. Before running with writes enabled, perform a final dry-run. Then, execute the script against the staging database.
