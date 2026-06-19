# Task ID: 124

**Title:** Roll back auth account if Firestore write fails in registerUser

**Status:** in-progress

**Dependencies:** None

**Priority:** high

**Description:** registerUser creates the Firebase Auth user first, then writes users/{uid}. If the Firestore write fails, an orphan Auth account remains (can sign in but AuthContext never advances past Login).

**Details:**

In functions/accountManagement/registerUser.js, wrap the Firestore set in try/catch; on failure call admin.auth().deleteUser(uid) to roll back the just-created Auth account, then throw an HttpsError so the client surfaces a clear failure. Auth and Firestore are separate systems (no shared transaction), so compensating rollback is the correct pattern. Verify the client (RegisterScreen) shows the error and no partial account persists. Requires redeploy (functions:registerUser).

**Test Strategy:**

Simulate a Firestore write failure (e.g., temporary rules denial or forced error) and confirm no Auth user remains afterward. Happy path still creates both Auth user and users/{uid}. Verify RegisterScreen error toast on failure.
