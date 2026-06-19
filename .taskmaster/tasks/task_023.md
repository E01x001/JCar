# Task ID: 23

**Title:** Fix Permission-Denied Error on Logout from Uncleaned Firestore Listeners

**Status:** done

**Dependencies:** 2 ✓, 20 ✓

**Priority:** high

**Description:** Resolve a 'permission-denied' error that occurs on user logout by refactoring useEffect hooks in multiple screens to ensure Firestore snapshot listeners are always properly unsubscribed.

**Details:**

A 'permission-denied' error is being thrown from Firestore when a user logs out because active snapshot listeners are not being cleaned up. This happens in useEffect hooks that have an early return when the user object becomes null, which prevents the cleanup function from being registered. The fix is to refactor all affected hooks to ensure they always return a cleanup function. 

Problematic Pattern:
```javascript
useEffect(() => {
  if (!user) {
    return; // This prevents the cleanup function for the previous effect from running
  }
  const unsubscribe = onSnapshot(query, ...);
  return () => {
    unsubscribe();
  };
}, [user]);
```

Required Refactor:
```javascript
useEffect(() => {
  if (!user) {
    return () => {}; // Always return a function, even if it's empty
  }
  const unsubscribe = onSnapshot(query, ...);
  return () => {
    unsubscribe();
  };
}, [user]);
```

Affected Files:
- src/screens/MyPageScreen.js (2 listeners: vehicles, consultations)
- src/screens/AdminConsultationScreen.js (1 listener)
- src/screens/AdminPageScreen.js (1 listener)
- src/screens/AdminScheduleScreen.js (1 listener)
- src/screens/MyVehiclesScreen.js (1 listener)

**Test Strategy:**

1. Before applying the fix, enable verbose Firestore logging in your development environment. 
2. Log in to the application.
3. Navigate to each of the affected screens: MyPage, the Admin screens, and MyVehicles. 
4. Log out of the application.
5. Observe the console logs for a 'permission-denied' error originating from Firestore. This confirms the bug is reproducible.
6. After applying the code changes to all affected files, repeat steps 2-4.
7. Verify that no 'permission-denied' errors appear in the console upon logout.
8. Additionally, confirm that data is still fetched and displayed correctly on these screens when a user is logged in, ensuring the listeners still function as intended.

## Subtasks

### 23.1. Refactor Vehicles and Consultations Listeners in MyPageScreen.js

**Status:** done  
**Dependencies:** None  

Modify the two useEffect hooks in `src/screens/MyPageScreen.js` that fetch user vehicles and consultations to prevent listener leaks on logout. Both hooks currently have an early return that blocks the unsubscribe function.

**Details:**

In `src/screens/MyPageScreen.js`, locate the two useEffect hooks that set up onSnapshot listeners. In each hook, change the early `return;` inside the `if (!user)` block to `return () => {};` to ensure the cleanup function from the previous render is always executed.

### 23.2. Refactor Firestore Listener in AdminConsultationScreen.js

**Status:** done  
**Dependencies:** None  

Apply the required useEffect refactor to the Firestore listener in `src/screens/AdminConsultationScreen.js` to ensure it is properly cleaned up on admin logout.

**Details:**

In the `AdminConsultationScreen.js` file, identify the useEffect hook managing the Firestore snapshot listener. Change the logic to always return a cleanup function by replacing the early `return;` with `return () => {};` when the user is not present.

### 23.3. Refactor Firestore Listener in AdminPageScreen.js

**Status:** done  
**Dependencies:** None  

Modify the useEffect hook in `src/screens/AdminPageScreen.js` to fix the uncleaned listener issue that occurs on user logout.

**Details:**

Locate the useEffect hook in `src/screens/AdminPageScreen.js` that establishes a Firestore listener. Replace the `if (!user) { return; }` pattern with `if (!user) { return () => {}; }` to guarantee the listener's cleanup function is called upon unmount or re-render.

### 23.4. Refactor Firestore Listeners in AdminScheduleScreen.js and MyVehiclesScreen.js

**Status:** done  
**Dependencies:** None  

Apply the listener cleanup fix to the useEffect hooks in both `src/screens/AdminScheduleScreen.js` and `src/screens/MyVehiclesScreen.js`.

**Details:**

For both `AdminScheduleScreen.js` and `MyVehiclesScreen.js`, find the respective useEffect hooks with Firestore listeners. Change their early `return;` statements to `return () => {};` to ensure the unsubscribe function is consistently called on logout.

### 23.5. Final Verification and Testing Across All Affected Screens

**Status:** done  
**Dependencies:** 23.1, 23.2, 23.3, 23.4  

Perform a comprehensive test of the logout process across all modified screens to confirm that the 'permission-denied' error has been completely resolved and no regressions were introduced.

**Details:**

Follow the full test plan from the parent task. Enable verbose Firestore logging. Log in as a regular user and navigate to MyPage and MyVehicles. Log out. Log in as an admin and navigate to AdminConsultationScreen, AdminPageScreen, and AdminScheduleScreen. Log out again. Meticulously check the console logs after each logout to confirm the complete absence of 'permission-denied' errors.
