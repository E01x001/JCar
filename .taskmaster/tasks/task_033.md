# Task ID: 33

**Title:** Update Firestore Schema: `consultation_requests` and `admin_owned_vehicles`

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Update the `consultation_requests` collection with new fields for detailed status tracking and create the new `admin_owned_vehicles` collection to manage vehicles acquired by the admin.

**Details:**

In your Firestore service files, update the type definitions/interfaces for `ConsultationRequest` to include `consultationStatus`, `completedAt`, `completedBy`, `dealAmount`, and `adminNotes`. Create a new service file and type definition for `AdminOwnedVehicle` with fields: `vehicleId`, `vehicleName`, `purchasePrice`, `purchaseDate`, `consultationId`, `previousOwnerId`, `previousOwnerName`, `status`, `soldDate`, `soldPrice`, and `createdAt`. This task does not involve migrating existing data, only defining the new structures and service file setup.

**Test Strategy:**

Manually create new documents in the Firestore console for both collections to verify all fields are correctly typed and stored. Write unit tests for the new service functions to ensure they correctly interact with the new schemas.
