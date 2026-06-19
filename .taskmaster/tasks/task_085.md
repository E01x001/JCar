# Task ID: 85

**Title:** Audit and Implement Proper Cleanup for All Firestore onSnapshot Listeners

**Status:** pending

**Dependencies:** 84 ✓

**Priority:** high

**Description:** Ensure all Firestore `onSnapshot` listeners are properly unsubscribed when their respective components unmount to prevent memory leaks and unnecessary resource consumption.

**Details:**

Conduct a comprehensive audit of the codebase to identify every instance of `firestore().collection().onSnapshot()`. For each instance, ensure that the returned unsubscribe function is called within the `useEffect` cleanup function or equivalent lifecycle method (`componentWillUnmount`). This prevents active listeners from persisting after a component is no longer active.

**Test Strategy:**

Use React DevTools to monitor component lifecycles. Navigate through various screens, triggering different listeners, then navigate away (e.g., unmount the component). Observe network activity or use a custom hook to track active listeners to ensure they are all properly closed upon unmount. Look for memory leak warnings.
