# Task ID: 94

**Title:** Add Request Timeout and Implement Offline Network Status Detection

**Status:** pending

**Dependencies:** 93

**Priority:** high

**Description:** Configure a global request timeout for all external API calls and implement network status detection to inform users about offline connectivity.

**Details:**

Set a global request timeout of 10 seconds for all HTTP requests made using `axios` to prevent hanging requests. Integrate `@react-native-community/netinfo` to monitor the device's network connectivity status. Based on the network status, display a prominent 'offline' banner or indicator in the application UI when the device is disconnected from the internet. This indicator should disappear when connectivity is restored.

**Test Strategy:**

Disable Wi-Fi/cellular data on the testing device. Verify that the offline banner appears promptly. Attempt to make an API request while offline and observe that it times out after 10 seconds, rather than hanging indefinitely. Reconnect network and ensure the offline banner disappears and requests can be made again.
