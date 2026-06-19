# Task ID: 115

**Title:** Implement Temporary Account Suspension: Cloud Function for Auto-Reactivation and Notifications

**Status:** pending

**Dependencies:** 114

**Priority:** medium

**Description:** Create a scheduled Firebase Cloud Function to automatically reactivate suspended user accounts and send notifications upon suspension and reactivation.

**Details:**

Develop a scheduled Firebase Cloud Function (e.g., running daily or hourly) that queries the `users` collection for accounts with `accountStatus: 'suspended'` and where `suspendedUntil` is in the past. For such accounts, update `accountStatus` back to 'active' and clear `suspendedUntil`/`suspensionReason`. Implement logic to send email or push notifications to users when their account is suspended, informing them of the reason and duration, and another notification upon auto-reactivation. This task requires prior implementation of notification services.

**Test Strategy:**

Suspend a test user for a short duration (e.g., 5 minutes). Verify that the suspension notification is sent. Monitor the Cloud Function logs to confirm it runs and automatically reactivates the user's account after the `suspendedUntil` period. Verify that the reactivation notification is sent. Attempt to log in as the user after auto-reactivation.
