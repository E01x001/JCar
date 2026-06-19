# Task ID: 88

**Title:** Split firebaseService.js into Modular Service Files Based on Responsibility

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Break down the monolithic `firebaseService.js` into smaller, single-responsibility service modules for improved maintainability and testability.

**Details:**

Create the following directory structure and files under `src/services/`: `auth/authService.js`, `auth/sessionService.js`, `auth/accountService.js`, `vehicle/vehicleService.js`, `vehicle/vehicleApprovalService.js`, `vehicle/vehicleQueryService.js`, `consultation/consultationService.js`, `consultation/consultationQueryService.js`, `consultation/consultationValidation.js`, `notification/fcmService.js`, `notification/notificationService.js`, `storage/imageService.js`. Migrate all relevant functions from `firebaseService.js` into their respective new modules. Update all import paths throughout the application.

**Test Strategy:**

Perform a comprehensive manual test of all major features (authentication, vehicle CRUD, consultation flows, image upload) to ensure they still function correctly after refactoring. Verify that each new service file is under 300 lines of code and has a clear single responsibility. Conduct code reviews to ensure logical separation.

## Subtasks

### 88.1. Define and Create Modular Service File Structure

**Status:** done  
**Dependencies:** None  

Create the specified directory structure and empty service files under src/services/ as per the architectural refactoring plan to improve maintainability and testability.

**Details:**

Create the following directory structure and files under `src/services/`: `auth/authService.js`, `auth/sessionService.js`, `auth/accountService.js`, `vehicle/vehicleService.js`, `vehicle/vehicleApprovalService.js`, `vehicle/vehicleQueryService.js`, `consultation/consultationService.js`, `consultation/consultationQueryService.js`, `consultation/consultationValidation.js`, `notification/fcmService.js`, `notification/notificationService.js`, `storage/imageService.js`.

### 88.2. Migrate Functions from Monolithic firebaseService.js to New Modules

**Status:** done  
**Dependencies:** 88.1  

Systematically move all relevant functions and logic from the monolithic `firebaseService.js` into their newly created, single-responsibility service modules.

**Details:**

Go through `firebaseService.js` function by function. Identify the correct destination module for each function based on its responsibility (e.g., auth-related functions to `authService.js`, vehicle-related to `vehicleService.js`). Cut and paste code, ensuring all internal dependencies within the services are handled during migration.

### 88.3. Update Application-Wide Import Paths for New Services

**Status:** done  
**Dependencies:** 88.2  

Adjust all import statements across the entire application codebase that previously referenced `firebaseService.js` to point to the new, specific service modules.

**Details:**

Use a project-wide search and replace (e.g., VS Code's global search) to find all occurrences of `import { ... } from 'src/services/firebaseService';`. Update these imports to reference the correct new service modules (e.g., `import { login } from 'src/services/auth/authService';`).

### 88.4. Conduct Comprehensive Regression Testing of Refactored Services

**Status:** done  
**Dependencies:** 88.3  

Execute a comprehensive suite of manual and automated tests to ensure all core functionalities remain intact and bug-free after the service refactoring.

**Details:**

Perform a comprehensive manual test of all major features, including but not limited to authentication flows (login, logout, registration), vehicle CRUD operations, consultation flows, and image upload functionality. Verify that all features function correctly after refactoring.

### 88.5. Implement ESLint Rules for Service Modularity Enforcement

**Status:** done  
**Dependencies:** 88.4  

Introduce or update ESLint rules to enforce the new service modularity, ensuring future code adheres to the single-responsibility principle and prevents the re-creation of monolithic service files.

**Details:**

Review current ESLint configurations and add new rules or configure existing ones (e.g., file size limits, cyclomatic complexity, number of exports) to discourage the growth of large, multi-responsibility service files and ensure adherence to modular design principles.
