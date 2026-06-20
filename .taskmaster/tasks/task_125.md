# Task ID: 125

**Title:** Remove seller PII from publicly-readable vehicle documents

**Status:** pending

**Dependencies:** None

**Priority:** high

**Description:** Vehicle docs store sellerPhone/sellerEmail/sellerName/ownerName/regiNumber/VIN, and security rules allow any authenticated user to read approved vehicles, so all seller PII is scrapeable. Firestore rules cannot filter fields, so this needs a data-model change.

**Details:**

Options: (a) move contact/PII fields to a restricted subcollection vehicles/{id}/private/{owner-or-admin-only}, or a separate collection keyed by vehicleId readable only by owner/admin; (b) expose seller contact only via a Cloud Function once a consultation is approved. Update VehicleRegistrationScreen (write path), VehicleDetailScreen/AdminVehicleDetailScreen (read path), and security rules. Consider a backfill/migration for existing vehicle docs. Confirm regiNumber/VIN exposure requirements (these may be acceptable publicly for listings, but phone/email are not). Reference: firestore.rules vehicles read rule comment acknowledges client-side filtering is currently relied upon.

**Test Strategy:**

Verify a non-owner authenticated user can read public vehicle fields but NOT sellerPhone/sellerEmail. Owner and admin still see full data. Consultation flow still surfaces contact info to the right parties. Security rules validate.
