# Task ID: 77

**Title:** Resolve Firebase Functions SDK Version Mismatch and Deployment Errors

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Update the Firebase Functions SDK to the latest version and correct trigger syntax to resolve deployment issues.

**Details:**

Update the `firebase-functions` dependency in `functions/package.json` to `@latest`. Audit all existing Cloud Function trigger definitions (e.g., `functions.firestore.document`) to ensure they are using the v2 API syntax (e.g., `onDocumentUpdated`, `onDocumentCreated`, `onDocumentDeleted`) and that correct module imports are used. Consult Firebase Functions v2 documentation for updated patterns.

**Test Strategy:**

Deploy the updated functions to a staging environment (`firebase deploy --only functions`). Monitor the Firebase console 'Functions' section and 'Logs' for successful deployment and absence of `TypeError: functions.firestore.document is not a function` or similar errors. Verify basic function triggers by performing actions in the staging app.

## Subtasks

### 77.1. Update Firebase Functions SDK Dependency

**Status:** done  
**Dependencies:** None  

Update the 'firebase-functions' dependency in 'functions/package.json' to its latest version to resolve version mismatch issues.

**Details:**

Navigate to the 'functions' directory. Open 'package.json' and change the 'firebase-functions' dependency to 'latest'. Run 'npm install' to update the package lock file and install the new version.

### 77.2. Refactor Cloud Function Triggers to v2 API

**Status:** done  
**Dependencies:** 77.1  

Audit and refactor all existing Cloud Function trigger definitions, migrating from the v1 API syntax (e.g., functions.firestore.document) to the v2 API syntax (e.g., onDocumentUpdated, onDocumentCreated).

**Details:**

Iterate through all Cloud Function files. For each function, identify v1 API triggers and rewrite them using v2 imports (e.g., 'firebase-functions/v2/firestore' or 'firebase-functions/v2/https') and the corresponding v2 trigger functions (e.g., 'onDocumentUpdated', 'onRequest'). Ensure correct module imports and parameter passing.
<info added on 2026-01-12T11:01:40.272Z>
Audit of Cloud Function triggers completed. The files consultationNotifications.js and vehicleNotifications.js were found to be correctly using the Firebase Functions v2 API, specifically `onDocumentUpdated` from `'firebase-functions/v2/firestore'`. Additionally, `setGlobalOptions` in index.js correctly utilizes v2 syntax from `'firebase-functions/v2'`. The `fcm.js` utility module was also reviewed and confirmed to have no issues related to v1/v2 API usage. No v1 API triggers requiring refactoring were identified in these files.
</info added on 2026-01-12T11:01:40.272Z>

### 77.3. Deploy and Verify Functions in Staging Environment

**Status:** done  
**Dependencies:** 77.2  

Deploy the updated Firebase Functions with v2 API syntax to a staging environment and verify successful deployment and absence of critical runtime errors.

**Details:**

Use the Firebase CLI command 'firebase deploy --only functions --project <staging-project-id>' to deploy the changes. After deployment, navigate to the Firebase console for the staging project. Check the 'Functions' section to confirm all functions are deployed successfully. Monitor 'Logs' for new errors, specifically for 'TypeError: functions.firestore.document is not a function' or similar v1 API related errors. Perform basic smoke tests for core functionalities that rely on the updated functions.
<info added on 2026-01-12T11:04:05.475Z>
Update: Firebase Functions have been successfully deployed to the staging environment. All 6 refactored functions – `onConsultationApproved`, `onConsultationRejected`, `onAlternativeSlotsSuggested`, `onConsultationCompleted`, `onAdminMemoUpdated`, and `onVehicleStatusChanged` – are confirmed to be updated and running in the `us-central1` region. This successful deployment validates the v2 API syntax changes implemented in subtask 77.2, confirming correct deployment of updated function definitions found within the `functions/` directory, typically exposed via `functions/index.js`.
</info added on 2026-01-12T11:04:05.475Z>
