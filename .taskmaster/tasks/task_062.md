# Task ID: 62

**Title:** Migrate Firebase Namespaced API to Modular API

**Status:** done

**Dependencies:** 36 ✓, 51 ✓, 59 ✓, 61 ✓

**Priority:** medium

**Description:** This critical task involves updating all Firebase client-side code, specifically 74 occurrences across 24 files, from the deprecated namespaced API (e.g., firebase.firestore()) to the new modular API (e.g., getFirestore()).

**Details:**

The migration requires a systematic approach to replace deprecated Firebase API calls with their modular counterparts, ensuring all imports are updated and functionalities remain intact. This specifically targets the Firebase client SDK, version 9 and above, often used in src/services/firebaseService.js or dedicated Firestore service files like src/services/firestoreService.js.1. Firebase Initialization: Update the main Firebase initialization file (e.g., src/firebaseConfig.js or src/services/firebaseService.js) to use initializeApp from firebase/app and getFirestore from firebase/firestore. Example: // Old // import firebase from 'firebase/app'; // import 'firebase/firestore'; // const app = firebase.initializeApp(firebaseConfig); // const db = app.firestore(); // New import { initializeApp } from 'firebase/app'; import { getFirestore } from 'firebase/firestore'; const app = initializeApp(firebaseConfig); const db = getFirestore(app);2. Firestore API Calls: Replace firestore() calls: All instances of firestore() will be replaced by the db instance obtained from getFirestore().Collection and Document References: Replace db.collection('collectionName') with collection(db, 'collectionName'). Replace db.collection('collectionName').doc('docId') with doc(db, 'collectionName', 'docId').CRUD Operations: addDoc(collectionRef, data) (replaces collectionRef.add(data)) setDoc(docRef, data, { merge: true/false }) (replaces docRef.set(data, { merge: true/false })) updateDoc(docRef, data) (replaces docRef.update(data)) getDoc(docRef) (replaces docRef.get()) deleteDoc(docRef) (replaces docRef.delete())Queries: Imports: query, where, orderBy, limit, etc. from firebase/firestore. Usage: query(collectionRef, where('field', '==', 'value'), orderBy('field'), limit(10)). getDocs(queryRef) (replaces queryRef.get())Real-time Listeners (onSnapshot): Import onSnapshot from firebase/firestore. Usage: onSnapshot(queryRef, (snapshot) => { ... }) or onSnapshot(docRef, (snapshot) => { ... }). This is particularly relevant for Task 59.Transactions: Import runTransaction from firebase/firestore. Usage: runTransaction(db, async (transaction) => { ... }). Inside the transaction, use transaction.get(docRef) and transaction.update(docRef, data). This is relevant for Task 51 and Task 61.3. Authentication (if present): While the focus is Firestore, ensure that Firebase Auth initializations are also modular. getAuth from firebase/auth. onAuthStateChanged(auth, (user) => { ... }).4. File Scan and Refactoring: Perform a global search (grep) for firebase.firestore(), .firestore(), db.collection, and other namespaced patterns to identify all affected files. The user specified 24 files with 74 occurrences. Prioritize core Firebase service files (e.g., src/services/firebaseService.js, src/services/consultationService.js, src/services/vehicleService.js). Update import statements in each affected file from import 'firebase/firestore' or import firebase from 'firebase/app' to specific modular imports (e.g., import { collection, query, where } from 'firebase/firestore';).5. Error Handling: Ensure existing error handling mechanisms are compatible with potential new error formats from the modular API.

**Test Strategy:**

1. Local Development Environment: Ensure the Firebase Emulator Suite is running locally to facilitate rapid testing without affecting production data.2. Deprecation Warning Verification: Run the application in development mode and carefully monitor the console for any lingering Firebase deprecation warnings related to the namespaced API. There should be none after the migration.3. Comprehensive Feature Regression Testing: Consultation Features (related to Task 36, 59, 61): Verify that all consultation tabs ('구매상담', '판매상담', '거래완료') correctly fetch and display data. Test real-time updates for consultations by making changes in the Firestore console and observing UI reflection. Test optimistic UI for consultation archiving in the AdminConsultation tabs and CompleteDealModal, ensuring correct updates and rollback on simulated failure. Verify robust error handling and retry logic for Firestore listeners.Vehicle Ownership Transfer (related to Task 51): Perform vehicle ownership transfers (to admin, to buyer) and verify that all related data (vehicles, consultation_requests, admin_owned_vehicles) are updated atomically and correctly. Test edge cases for transactions (e.g., concurrent updates, network issues) using the emulator.General CRUD Operations: Perform create, read, update, and delete operations across various collections (e.g., users, vehicles, consultation_requests) from different parts of the application. Ensure data consistency and correct behavior for all forms and data displays.4. Unit and Integration Tests: Run the existing suite of unit and integration tests (especially those covering firebaseService.js as mentioned in Task 6). Update any test mocks or setup that relied on the namespaced API. Ensure all tests pass.5. Code Review: Conduct a thorough code review focusing on: Correctness of modular imports. Proper use of modular API functions (getFirestore, collection, doc, etc.). Absence of any deprecated API calls. Consistency in API usage across the codebase.6. Performance Check: Briefly monitor the application's performance to ensure the migration hasn't introduced any significant regressions in load times or responsiveness.

## Subtasks

### 62.1. Migrate Firebase Initialization and Core Firestore Instance

**Status:** done  
**Dependencies:** None  

Update the main Firebase initialization file(s) to use the modular API for `initializeApp` and `getFirestore`. This is the foundational step for all subsequent Firebase migrations.

**Details:**

Identify the primary Firebase configuration file (e.g., 'src/firebaseConfig.js' or 'src/services/firebaseService.js'). Replace `import firebase from 'firebase/app'; import 'firebase/firestore';` with `import { initializeApp } from 'firebase/app'; import { getFirestore } from 'firebase/firestore';`. Update `firebase.initializeApp(firebaseConfig)` to `initializeApp(firebaseConfig)` and `app.firestore()` to `getFirestore(app)`.

### 62.2. Refactor Basic Firestore CRUD Operations

**Status:** done  
**Dependencies:** 62.1  

Migrate all basic Create, Read, Update, Delete (CRUD) operations for collections and documents from the namespaced API to their modular counterparts.

**Details:**

Globally search for `.collection()`, `.doc()`, `.add()`, `.set()`, `.update()`, `.get()`, `.delete()` on `db` or collection/doc references. Replace `db.collection('collectionName')` with `collection(db, 'collectionName')`. Replace `db.collection('c').doc('d')` with `doc(db, 'c', 'd')`. Update `collectionRef.add(data)` to `addDoc(collectionRef, data)`, `docRef.set(data)` to `setDoc(docRef, data)`, `docRef.update(data)` to `updateDoc(docRef, data)`, `docRef.get()` to `getDoc(docRef)`, and `docRef.delete()` to `deleteDoc(docRef)`. Ensure appropriate modular imports like `collection`, `doc`, `addDoc`, `setDoc`, `updateDoc`, `getDoc`, `deleteDoc` from `firebase/firestore` are added.

### 62.3. Refactor Firestore Queries and Real-time Listeners

**Status:** done  
**Dependencies:** 62.1, 62.2  

Update Firestore queries using `where`, `orderBy`, `limit`, etc., and real-time listeners (`onSnapshot`) to use the modular API, particularly relevant for Task 36 and 59.

**Details:**

Search for instances of `queryRef.where()`, `queryRef.orderBy()`, `queryRef.limit()`, and `queryRef.get()`. Migrate these to use `query(collectionRef, where('field', '==', 'value'), orderBy('field'), limit(10))` and `getDocs(queryRef)`. Update `collectionRef.onSnapshot()` or `docRef.onSnapshot()` to `onSnapshot(queryRef, (snapshot) => { ... })` or `onSnapshot(docRef, (snapshot) => { ... })`. Ensure modular imports like `query`, `where`, `orderBy`, `limit`, `getDocs`, `onSnapshot` are added from `firebase/firestore`.

### 62.4. Migrate Firestore Transactions and Authentication API

**Status:** done  
**Dependencies:** 62.1, 62.2  

Refactor Firestore transactions (relevant for Task 51 and 61) and Firebase Authentication initializations and calls to the modular API.

**Details:**

Identify transaction blocks. Replace `db.runTransaction(async (transaction) => { ... })` with `runTransaction(db, async (transaction) => { ... })`. Inside transactions, update `transaction.get(docRef)` and `transaction.update(docRef, data)` as per modular syntax. For authentication, if present, replace `firebase.auth()` with `getAuth(app)` and `firebase.auth().onAuthStateChanged` with `onAuthStateChanged(getAuth(app), (user) => { ... })`. Add modular imports like `runTransaction` from `firebase/firestore` and `getAuth`, `onAuthStateChanged` from `firebase/auth`.

### 62.5. Perform Global Refactoring, Import Cleanup, and Error Handling Verification

**Status:** done  
**Dependencies:** 62.1, 62.2, 62.3, 62.4  

Conduct a final global search and replace to ensure all old namespaced Firebase API calls are removed, imports are consolidated and cleaned, and error handling is compatible with the new modular API.

**Details:**

Perform a comprehensive global search across all 24 identified files (and potentially others) for any remaining instances of `firebase.firestore()`, `.firestore()`, or other deprecated patterns. Update all import statements to use specific modular imports (e.g., `import { collection, query } from 'firebase/firestore';` instead of `import 'firebase/firestore'`). Review existing error handling blocks (`try-catch`) to ensure they correctly capture and process errors potentially returned by the modular Firebase API. Remove any redundant or unused old Firebase imports.
<info added on 2025-12-19T10:58:36.855Z>
Completed a comprehensive global cleanup and verification based on the migration to Firebase Modular API. All deprecated patterns including `firestore()` calls, `auth()` calls, old-style `.collection()` chaining, and old-style `.doc()` chaining have been successfully removed, with zero instances remaining across the codebase.

Performed targeted import cleanup:
- In `src/components/UpdateChecker.js`, removed unused Firebase imports (`DeviceInfo`, `getFirestore`, `collection`, `doc`, `getDoc`). Also removed an unused `setUpdateInfo` function and added `eslint-disable` directives for specific console statements to manage linting rules.
- In `src/screens/AdminOwnedVehicleDetailScreen.js`, removed an unused `collection` import.

Verified that `crashlytics()` usage remains valid and is not subject to deprecation within the context of the modular migration. All aspects of the Firebase Modular API migration work are now complete, and the application is ready for testing.
</info added on 2025-12-19T10:58:36.855Z>
