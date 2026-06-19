# Task ID: 111

**Title:** Enable and Configure Firebase Performance Monitoring with Custom Traces

**Status:** pending

**Dependencies:** None

**Priority:** medium

**Description:** Activate Firebase Performance Monitoring and define custom traces for critical application workflows to identify and resolve performance bottlenecks.

**Details:**

Enable Firebase Performance Monitoring in the Firebase console and integrate the SDK into the React Native project. Implement custom traces using the Performance Monitoring SDK for key user flows: 'vehicle registration flow', 'image upload duration', 'consultation creation time', and 'login flow duration'. Monitor HTTP/network requests automatically. Define performance budgets for these traces to receive alerts when thresholds are exceeded.

**Test Strategy:**

Perform the actions corresponding to the custom traces (e.g., register a vehicle, log in, upload images). Monitor the Firebase Performance Monitoring dashboard to verify that custom traces are appearing, reporting accurate durations, and HTTP requests are being monitored. Set up a test performance budget and verify that alerts are triggered if the app's performance drops below the defined threshold.
