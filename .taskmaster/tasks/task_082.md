# Task ID: 82

**Title:** Implement Cloud Function for Consultation Creation Rate Limiting

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Develop a Firebase Cloud Function to prevent excessive consultation request creation by individual users.

**Details:**

Create a new Firebase Cloud Function (e.g., an `onCall` function) that is invoked before a user can submit a new consultation request. Implement logic within this function to track the number of consultation requests made by a specific `userId` within a defined time window (e.g., 5 requests per hour). If the limit is exceeded, reject the request with an appropriate error message.

**Test Strategy:**

Test locally with the Firebase emulator. Make multiple consultation requests within the defined time limit. Verify that once the limit is reached, subsequent requests are blocked by the Cloud Function, and an appropriate error is returned to the client.
