# Task ID: 60

**Title:** Add Comprehensive Monitoring and Analytics for Ownership Transfers

**Status:** done

**Dependencies:** 33 ✓, 39 ✓, 44 ✓, 52 ✓, 53 ✓, 55 ✓

**Priority:** medium

**Description:** Implement detailed event tracking, performance monitoring, and enhanced dashboard metrics for vehicle ownership transfer operations, alongside robust logging for audit trails and critical alert mechanisms.

**Details:**

This task involves a multi-faceted approach to gain deep visibility into the ownership transfer process. Key integration points will be `src/services/ownershipTransferService.js` and `src/components/modals/CompleteDealModal.js` (and potentially `src/components/modals/OwnershipTransferConfirmModal.js`).

1.  **Firebase Analytics Event Tracking:**
    *   Integrate `@react-native-firebase/analytics` to log custom events at key transfer milestones.
    *   **`ownership_transfer_initiated`:** Log when a user starts the transfer process. This should be integrated into `CompleteDealModal.js` or `OwnershipTransferConfirmModal.js` right before the backend call. Include parameters: `type` (e.g., 'toAdmin', 'toBuyer'), `vehicleId`, `price`, `consultationId`.
    *   **`ownership_transfer_completed`:** Log upon successful completion of `transferVehicleToAdmin` or `transferVehicleToBuyer` in `ownershipTransferService.js`. Include parameters: `duration` (calculated from initiation), `success` (true), `vehicleId`, `dealAmount`.
    *   **`ownership_transfer_failed`:** Log within error handling blocks in `ownershipTransferService.js` for `transferVehicleToAdmin` and `transferVehicleToBuyer`. Include parameters: `errorCode`, `errorMessage`, `step` (e.g., 'firestore_update', 'payment_gateway'), `vehicleId`, `consultationId`.
    *   **`ownership_modal_opened` / `ownership_modal_closed`:** Track user engagement with the `CompleteDealModal.js` (or `OwnershipTransferConfirmModal.js`) lifecycle.

2.  **Firebase Performance Monitoring Integration:**
    *   Integrate `@react-native-firebase/perf` to monitor the performance of critical backend operations.
    *   Create custom traces for `ownershipTransferService.transferVehicleToAdmin` and `ownershipTransferService.transferVehicleToBuyer` to measure their end-to-end execution duration.
    *   Monitor Firestore read/write latencies automatically via Firebase Performance Monitoring for all relevant collections (`ownership_transfers`, `vehicles`, `users`, `consultation_requests`).

3.  **Admin Dashboard Metrics Enhancement:**
    *   Extend the `AdminOwnershipHistoryScreen.js` (Task 53) or create a new dedicated dashboard section to display advanced analytics.
    *   Implement logic to calculate and display:
        *   **Total Transfers:** Daily, weekly, monthly counts.
        *   **Average Completion Time:** For successful transfers.
        *   **Failure Rate:** Overall and broken down by `errorCode` or `errorMessage`.
        *   **Revenue Metrics:** Total `dealAmount` from completed transfers (daily, weekly, monthly).
    *   Consider storing aggregated metrics in a new Firestore document (e.g., `admin_metrics/ownership_transfer_summary`) for efficient dashboard loading, updated via a scheduled Firebase Function or daily batch process.

4.  **Detailed Logging for Audit Trail:**
    *   Enhance existing logging within `ownershipTransferService.js` to create a comprehensive audit trail.
    *   Log all attempts to `transferVehicleToAdmin` and `transferVehicleToBuyer` (including initiation, success, and failure) to a new Firestore collection `ownership_transfer_audit_logs`.
    *   Each log entry should include: `timestamp`, `userId`, `vehicleId`, `consultationId`, `transferType`, `status` (initiated, completed, failed), `dealAmount` (if applicable), and crucially, `beforeState` and `afterState` (JSON snapshots of the `vehicle` and `consultation` documents involved in the transfer for debugging and auditing).

5.  **Critical Issue Alerting:**
    *   Implement Firebase Cloud Functions that trigger alerts based on specific monitoring data.
    *   **Failure Rate Alert:** Trigger if the `ownership_transfer_failed` event rate exceeds a defined threshold (e.g., 5% within a 15-minute window).
    *   **Transaction Timeout Alert:** Trigger if custom performance traces for `transfer_vehicle_to_admin_transaction` or `transfer_vehicle_to_buyer_transaction` exceed a defined duration (e.g., > 10 seconds).
    *   **Permission Denied Spike:** Monitor Firestore logs for a spike in 'permission denied' errors related to collections involved in ownership transfers.
    *   Alerts should be sent to designated channels (e.g., email, Slack) with relevant contextual information.

**Test Strategy:**

1.  **Firebase Analytics Verification:**
    *   Perform a full cycle of simulated ownership transfers (initiate, complete successfully, attempt and fail, open/close modal) through the application.
    *   Monitor Firebase DebugView in the Firebase Console to confirm all specified Analytics events (`ownership_transfer_initiated`, `ownership_transfer_completed`, `ownership_transfer_failed`, `ownership_modal_opened`, `ownership_modal_closed`) are logged with the correct parameters and values.
    *   Verify these events appear in the Firebase Analytics dashboard within 24-48 hours.
2.  **Firebase Performance Monitoring Verification:**
    *   Execute multiple successful and failed ownership transfers (`transferVehicleToAdmin`, `transferVehicleToBuyer`).
    *   Check the Firebase Performance Monitoring dashboard in the Firebase Console to ensure custom traces for `transfer_vehicle_to_admin_transaction` and `transfer_vehicle_to_buyer_transaction` are present and capturing accurate duration metrics.
    *   Verify that network requests related to Firestore operations during transfers are being monitored.
3.  **Admin Dashboard Metrics Verification:**
    *   Perform a diverse set of ownership transfer operations (successes and failures, varying dates and amounts).
    *   Navigate to the Admin Dashboard (specifically `AdminOwnershipHistoryScreen` or the new metrics section).
    *   Cross-reference the displayed metrics (Total Transfers, Average Completion Time, Failure Rate, Revenue Metrics) against raw data in the `ownership_transfers` and `ownership_transfer_audit_logs` collections in Firestore. Ensure accuracy for daily, weekly, and monthly aggregations.
    *   Verify any filtering or date range selections on the dashboard correctly update the displayed analytics.
4.  **Logging Verification:**
    *   Trigger various ownership transfer scenarios, including successful completions and different types of failures.
    *   Inspect the `ownership_transfer_audit_logs` collection in Firestore. Confirm that each transfer attempt has a corresponding log entry with `timestamp`, `userId`, `vehicleId`, `consultationId`, `transferType`, `status`, `dealAmount`, and correctly populated `beforeState` and `afterState` JSON snapshots.
5.  **Alerting Verification:**
    *   (In a development/staging environment) Simulate conditions that would trigger the defined alerts (e.g., intentionally cause multiple rapid transfer failures to exceed the failure rate threshold).
    *   Verify that alerts are triggered as expected and notifications are sent to the configured channels (e.g., check email inbox or Slack channel).
    *   Confirm that alert messages contain relevant contextual information for debugging.
