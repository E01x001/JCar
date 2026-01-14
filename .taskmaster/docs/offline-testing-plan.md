# Offline Behavior Testing Plan

**Task 106.4**: Thoroughly Test Offline Behavior Under Various Network Conditions

## Test Environment Setup

### Prerequisites
- React Native development environment
- Android device or emulator (recommended) or iOS device/simulator
- Firestore console access
- Network conditioning tools

### Network Conditioning Tools

**Android:**
- Settings → Developer Options → Network Throttling
- Or use `adb shell` commands:
  ```bash
  # Enable airplane mode
  adb shell cmd connectivity airplane-mode enable

  # Disable airplane mode
  adb shell cmd connectivity airplane-mode disable
  ```

**iOS:**
- Settings → Developer → Network Link Conditioner

**Alternative:**
- Use device's airplane mode toggle
- Use WiFi on/off toggle

## Test Scenarios

### Scenario 1: Basic Offline Vehicle Registration

**Objective**: Verify vehicle can be registered while offline and syncs when online

**Steps:**
1. Start app with internet connection
2. Log in and navigate to Vehicle Registration screen
3. Enable airplane mode
4. Fill in vehicle information:
   - Vehicle Number: 서울12가 3456
   - Owner Name: Test User
   - Vehicle Type: 승용차
   - Fetch vehicle info
5. Select an image (optional)
6. Click "Save" button

**Expected Results:**
- ✅ Success toast appears immediately
- ✅ Form clears immediately
- ✅ Can navigate to MyPage
- ✅ New vehicle appears in MyPage list with pending status
- ✅ Vehicle has visual indicator it's optimistic (optional UI feature)

**Reconnection Test:**
1. Disable airplane mode
2. Wait 5-10 seconds for sync

**Expected Results:**
- ✅ Vehicle successfully syncs to Firestore
- ✅ Optimistic vehicle replaced with real data from server
- ✅ No duplicate vehicles in list
- ✅ Console shows "✅ Vehicle saved successfully with ID: [real-id]"

---

### Scenario 2: Failed Vehicle Registration (Permission Error)

**Objective**: Verify rollback when Firestore write fails

**Setup:**
1. Modify Firestore rules to reject vehicle creation temporarily:
   ```
   match /vehicles/{vehicleId} {
     allow create: if false; // Force rejection
   }
   ```

**Steps:**
1. Start app offline
2. Navigate to Vehicle Registration
3. Fill in vehicle information
4. Click "Save"
5. Reconnect to internet

**Expected Results:**
- ✅ Success toast appears immediately (optimistic)
- ✅ Form clears
- ✅ Vehicle appears in MyPage list temporarily
- ✅ After reconnection, vehicle disappears from list
- ✅ Error toast appears: "차량 정보 저장 중 문제가 발생했습니다"
- ✅ Console shows "❌ Firestore write failed"

**Cleanup:**
- Restore Firestore rules to allow vehicle creation

---

### Scenario 3: Offline Consultation Request

**Objective**: Verify consultation requests work offline

**Steps:**
1. Start app with connection
2. Browse vehicles, select one
3. Click consultation request
4. Enable airplane mode
5. Select date and time
6. Click submit

**Expected Results:**
- ✅ Success alert appears immediately
- ✅ Navigates back to previous screen
- ✅ Consultation appears in MyPage consultations list

**Reconnection Test:**
1. Disable airplane mode
2. Check MyPage consultations

**Expected Results:**
- ✅ Consultation syncs successfully
- ✅ Status changes from optimistic to real
- ✅ Admin can see consultation in admin panel

---

### Scenario 4: Multiple Offline Operations

**Objective**: Verify multiple writes queue and sync correctly

**Steps:**
1. Start app offline
2. Register Vehicle A
3. Register Vehicle B
4. Request consultation for existing vehicle
5. Check MyPage - should show 2 vehicles + 1 consultation
6. Reconnect to internet

**Expected Results:**
- ✅ All 3 operations appear immediately in UI
- ✅ All 3 operations sync successfully after reconnection
- ✅ Items appear in correct order
- ✅ No data loss
- ✅ No duplicate items

---

### Scenario 5: App Restart While Offline

**Objective**: Verify offline persistence across app restarts

**Steps:**
1. Start app offline
2. Register a vehicle
3. Force close app (swipe away from recent apps)
4. Reopen app while still offline
5. Navigate to MyPage

**Expected Results:**
- ⚠️ Optimistic vehicle will NOT appear (it was only in memory)
- ✅ This is expected behavior - Firestore offline persistence caches existing data, not pending writes

**Note**: To persist pending writes across restarts, would need to implement local queue (SQLite/AsyncStorage). This is beyond scope of Task 106.

---

### Scenario 6: Slow/Flaky Network

**Objective**: Verify behavior with poor connectivity

**Setup:**
- Enable network throttling: "Slow 3G" or "2G" profile

**Steps:**
1. Navigate to Vehicle Registration
2. Fill in form and save
3. Observe behavior with slow connection

**Expected Results:**
- ✅ UI remains responsive
- ✅ User can continue using app
- ✅ Success feedback appears immediately
- ✅ Write eventually succeeds in background
- ✅ No UI blocking or freezing

---

### Scenario 7: Rapid On/Off Network Toggling

**Objective**: Verify stability under unstable network

**Steps:**
1. Register vehicle while online
2. Toggle airplane mode on/off rapidly 5 times
3. Check MyPage and Firestore console

**Expected Results:**
- ✅ Vehicle saves successfully
- ✅ No duplicate vehicles
- ✅ No corrupted data
- ✅ App doesn't crash

---

### Scenario 8: Firestore Listener Behavior

**Objective**: Verify real-time listeners work with offline persistence

**Steps:**
1. User A registers vehicle while online
2. User B views vehicle list
3. User B goes offline
4. User A approves vehicle (admin action)
5. User B goes back online

**Expected Results:**
- ✅ User B sees vehicle before going offline (cached)
- ✅ User B can still view cached vehicles while offline
- ✅ User B sees updated status after reconnecting
- ✅ onSnapshot listener fires with updated data

---

## Data Consistency Checks

After each test scenario, verify:

1. **Firestore Console**:
   - Check correct number of documents
   - Verify no duplicate documents
   - Check document structure is correct
   - Verify serverTimestamp fields are populated

2. **Local App State**:
   - Check Zustand store has correct data
   - Verify no optimistic items remain after sync
   - Confirm cache is properly updated

3. **UI Display**:
   - Items appear in correct lists
   - Correct status indicators shown
   - No ghost items from failed writes
   - Loading states work correctly

---

## Performance Benchmarks

Measure and document:

1. **Time to UI Update** (should be < 100ms):
   - Time from button click to success message
   - Time from button click to list update

2. **Sync Time** after reconnection:
   - Time for optimistic→real data replacement
   - Time for onSnapshot to fire with updates

3. **App Responsiveness**:
   - FPS during offline operations
   - Memory usage with pending writes
   - Battery impact

---

## Edge Cases to Test

### Edge Case 1: Duplicate Prevention
**Steps:**
1. Go offline
2. Submit consultation request
3. Immediately submit same request again

**Expected**:
- ✅ Local duplicate check prevents second request
- ✅ Only one consultation created

### Edge Case 2: Optimistic Data in Queries
**Steps:**
1. Register vehicle offline
2. Try to search for that vehicle
3. Try to view vehicle detail

**Expected**:
- ⚠️ Optimistic vehicle may not appear in searches (pending status)
- ✅ After sync, vehicle appears correctly

### Edge Case 3: Concurrent Writes
**Steps:**
1. Open app on 2 devices with same user
2. Both register different vehicles offline
3. Both reconnect

**Expected**:
- ✅ Both vehicles save successfully
- ✅ No data corruption
- ✅ Both devices see both vehicles

---

## Automated Testing (Future Enhancement)

Consider implementing:
- Jest tests for optimistic helpers
- Integration tests with Firestore emulator
- E2E tests with Detox
- Network condition mocking in tests

---

## Rollback Verification

For each failed write scenario, verify:
1. ✅ Optimistic data removed from store
2. ✅ UI returns to correct state
3. ✅ Error message shown to user
4. ✅ User can retry operation
5. ✅ No lingering effects

---

## Sign-off Checklist

Before marking Task 106 complete, verify:

- [ ] All 8 scenarios tested and passing
- [ ] Data consistency checks passed
- [ ] Performance benchmarks documented
- [ ] Edge cases handled correctly
- [ ] Rollback mechanisms verified
- [ ] Console logs show correct flow
- [ ] Firestore rules don't block legitimate operations
- [ ] User experience is smooth and responsive
- [ ] No regressions in existing functionality
- [ ] Documentation updated (this file committed)

---

## Known Limitations

1. **Pending writes don't persist across app restarts**: This is expected behavior with current implementation. Would require local queue implementation to change.

2. **Optimistic items not in real-time sync**: Optimistic items are local-only until write completes. Other users won't see them until sync.

3. **Large images may delay optimistic update**: Image upload must complete before optimistic add, as we need the URL.

4. **Network errors may not be user-friendly**: Some Firestore errors may need better error messages for end users.

---

## References

- [Firestore Offline Persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [React Native Firebase Offline Support](https://rnfirebase.io/database/offline-support)
- [Optimistic UI Best Practices](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
