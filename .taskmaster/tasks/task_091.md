# Task ID: 91

**Title:** Update All New Service Modules to Consume Data via the Repository Pattern

**Status:** pending

**Dependencies:** 90

**Priority:** high

**Description:** Refactor all new service modules to use the recently implemented repository layer for all data access operations.

**Details:**

Modify `vehicleService.js`, `consultationService.js`, `accountService.js`, and other services to inject and use instances of `VehicleRepository`, `ConsultationRepository`, and `UserRepository` (or their interfaces). Remove all direct `firestore().collection().doc()...` calls from the service layer, ensuring all data access is routed through the repositories. This will enhance testability and separation of concerns.

**Test Strategy:**

Perform a full system regression test. Ensure all features dependent on data access (e.g., displaying vehicle lists, creating consultations, updating user profiles) function correctly. Verify through code review that no direct Firestore calls remain within the service layer.
