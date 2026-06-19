# Task ID: 97

**Title:** Centralize All "Magic Strings" into Structured Constants Modules

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Replace hardcoded string literals with centralized constants for improved maintainability, readability, and type safety.

**Details:**

Create a `src/constants/` directory. Within this directory, create separate modules for different domains: `consultation.js` (for status values, types), `vehicle.js` (for status values, types, categories), `user.js` (for roles, account statuses), and `navigation.js` (for screen names). Create an `index.js` barrel file to export all constants. Systematically find and replace all hardcoded string literals throughout the application with their respective constants. Update all import paths to use the new constants.

**Test Strategy:**

Perform a global search for common magic strings (e.g., 'pending', 'approved', 'admin', screen names) to verify their replacement with constants. Conduct code reviews to ensure consistency. Verify all application features continue to work as expected, ensuring no constant names were mistyped or misapplied.
