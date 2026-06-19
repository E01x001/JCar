# Task ID: 90

**Title:** Implement Repository Pattern: Create UserRepository and Integrate Caching

**Status:** pending

**Dependencies:** 89

**Priority:** high

**Description:** Create a `UserRepository` to abstract user data access and integrate an in-memory caching mechanism for user profiles.

**Details:**

Implement a `UserRepository` class similar to other repositories, encapsulating all Firestore interactions for the `users` collection. Integrate an in-memory caching layer (e.g., using a simple Map or LRU cache) within `UserRepository` for frequently accessed read operations, such as fetching a user's profile by ID. This cache should have a short expiry (e.g., 5 minutes) and be updated on writes.

**Test Strategy:**

Write unit tests for `UserRepository`, mocking Firestore. Verify that `getById` attempts to read from cache first, then Firestore. Test cache invalidation on user profile updates. Monitor performance difference on repeated user profile fetches during development.
