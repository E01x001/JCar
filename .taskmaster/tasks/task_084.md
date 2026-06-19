# Task ID: 84

**Title:** Implement Centralized State Management (Zustand) for Shared Firestore Data and Caching

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Establish a centralized data store using Zustand to manage shared Firestore subscriptions and implement a caching mechanism for frequently accessed data.

**Details:**

Integrate Zustand into the project. Create dedicated Zustand stores, such as `vehicleStore` and `consultationStore`, to manage the state of shared vehicle and consultation data. Refactor existing `onSnapshot` calls to be managed by these stores, ensuring a singleton pattern for subscriptions (one listener per query, shared across components). Implement a simple 5-minute in-memory caching mechanism within `vehicleStore` for vehicle listings to reduce duplicate Firestore reads for frequently viewed data.

**Test Strategy:**

Verify that multiple components requesting the same data trigger only a single `onSnapshot` listener using the Firebase Console's 'Usage' tab. Test data caching by navigating to a vehicle list, then navigating away and back quickly; observe that data loads instantly from cache rather than a new Firestore read. Monitor Firestore read operations in the console to confirm a reduction.
