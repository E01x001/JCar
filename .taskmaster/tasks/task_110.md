# Task ID: 110

**Title:** Implement Firebase Analytics for Key User Events and Properties

**Status:** pending

**Dependencies:** None

**Priority:** medium

**Description:** Integrate Firebase Analytics to track critical user interactions and properties, enabling data-driven insights and feature improvements.

**Details:**

Create a wrapper utility `utils/analytics.js` for Firebase Analytics functions. Instrument the application to log key user events: `login_success` / `login_failure`, `vehicle_view` (include `vehicleId`, `vehicleName`), `vehicle_registration` (include `manufacturer`, `year`), `consultation_request` (include `vehicleId`, `type`), `consultation_status_change` (include `from`, `to`), `search_performed` (include `query`, `results_count`), `image_upload` (include `count`, `total_size`). Set user properties such as `role` and `signup_date` on user login/registration. Ensure screen views are tracked automatically or manually if needed.

**Test Strategy:**

Perform various user actions (login, view vehicle, register vehicle, request consultation, search, upload image) in a development build. Monitor the Firebase Analytics DebugView and the Firebase Analytics dashboard to confirm that all specified events and user properties are being logged correctly. Verify that screen views are being tracked as expected.
