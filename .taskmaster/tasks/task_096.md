# Task ID: 96

**Title:** Implement Environment-Aware Logger Utility and Eliminate Production Console Logs

**Status:** pending

**Dependencies:** None

**Priority:** medium

**Description:** Create a custom logger utility that provides environment-aware logging and replace all direct `console.log` statements in the codebase.

**Details:**

Create `utils/logger.js`. This utility should conditionally log messages to `console` only in development and staging environments. In production builds, `Logger.debug()` and `Logger.warn()` should be suppressed, while `Logger.error()` should forward to Firebase Crashlytics. Replace all existing `console.log`, `console.warn`, `console.error` calls throughout the codebase with their `Logger` equivalents. Implement an ESLint rule to prevent the accidental introduction of `console` statements in production builds.

**Test Strategy:**

Build the application in both development and production modes. In development, verify that logger messages appear in the console. In production, confirm that no `console.log` or `console.warn` output is present in device logs, and that `Logger.error()` calls correctly send errors to Crashlytics. Run ESLint to ensure the `no-console` rule is enforced.
