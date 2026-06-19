# Task ID: 72

**Title:** Generate and Revoke Exposed API Keys

**Status:** in-progress

**Dependencies:** 71 ✓

**Priority:** high

**Description:** Generate new API keys and revoke any previously exposed or hardcoded ones to mitigate security risks.

**Details:**

Coordinate with the backend or API provider to generate a new set of API keys. Once generated, update the `.env` file created in Task 71 with these new keys. Ensure all old, potentially compromised keys are formally revoked through the appropriate service management console.

**Test Strategy:**

Verify with the API provider that the old keys are no longer functional and that the new keys are correctly recognized by the API. Test app functionality end-to-end to ensure API calls are successful with the new keys.
