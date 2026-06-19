# Task ID: 113

**Title:** Refactor Navigation to Use Nested Navigators and Preserve State Across Auth/Role Changes

**Status:** pending

**Dependencies:** None

**Priority:** medium

**Description:** Improve navigation stability and user experience by refactoring `AppNavigator.js` to use nested navigators, ensuring state preservation across authentication and role changes.

**Details:**

Analyze `AppNavigator.js:136-180` and replace conditional rendering of navigators with the official React Navigation pattern of nested navigators (e.g., `AuthStack`, `AppStack`, possibly an `AdminStack`). Implement proper authentication flow management within navigation, ensuring that navigation state is preserved when a user logs in, logs out, or switches roles. Add support for deep linking to specific screens within the application. Configure navigation state persistence if required.

**Test Strategy:**

Test login/logout flows thoroughly, verifying that navigation state is correctly preserved and there is no UI flicker or unexpected navigation behavior. Test role switching if applicable. Verify that deep links (e.g., from an email or a web link) correctly navigate to the intended screen within the app. Ensure consistent navigation behavior across various app states.
