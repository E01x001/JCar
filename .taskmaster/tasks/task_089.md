# Task ID: 89

**Title:** Implement Repository Pattern: Create VehicleRepository and ConsultationRepository

**Status:** pending

**Dependencies:** 88 ✓

**Priority:** high

**Description:** Abstract direct Firestore operations for vehicles and consultations behind dedicated repository classes.

**Details:**

Define abstract interfaces for data repositories (e.g., `IVehicleRepository`). Implement `VehicleRepository` and `ConsultationRepository` classes. These classes will encapsulate all direct interactions with Firestore for their respective collections, providing methods like `getById`, `getAll`, `add`, `update`, `delete`, and query methods. All services (e.g., `vehicleService`, `consultationService`) will interact with these repositories, not directly with Firestore.

**Test Strategy:**

Write unit tests for `VehicleRepository` and `ConsultationRepository`. Mock the underlying Firestore SDK calls to ensure that the repository methods correctly transform input/output and handle basic data operations. Verify that the repository's API is consistent and predictable.
