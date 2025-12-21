# FCM Push Notification Implementation PRD

## Overview
Implement server-side Firebase Cloud Functions to send push notifications to users for key events in the JCar application. The client-side FCM integration is already complete with token management, message handlers, and permissions properly configured.

## Current State
- ✅ Client-side FCM SDK integrated (@react-native-firebase/messaging v23.5.0)
- ✅ FCM token storage in Firestore users collection
- ✅ Token refresh listener implemented in AuthContext
- ✅ Foreground/background/quit message handlers in App.js and index.js
- ✅ Android notification permissions configured in AndroidManifest.xml
- ❌ Server-side Cloud Functions not implemented (functions/index.js is empty)

## Objectives
1. Set up Firebase Functions environment with FCM Admin SDK
2. Implement Firestore triggers to send push notifications for critical user events
3. Ensure proper error handling and logging for notification delivery
4. Test notification delivery in all app states (foreground, background, quit)

## Requirements

### 1. Firebase Functions Environment Setup
**Priority: Critical**
- Verify firebase-admin and firebase-functions package versions in functions/package.json
- Initialize Firebase Admin SDK with proper service account credentials
- Create utility module for FCM operations (functions/utils/fcm.js)
- Set up proper logging and error handling

**Deliverables:**
- functions/utils/fcm.js with:
  - `initializeAdmin()` - Initialize Firebase Admin SDK
  - `sendPushNotification(fcmToken, title, body, data)` - Send notification to single token
  - `getUserFcmToken(userId)` - Fetch user FCM token from Firestore
  - `sendNotificationToUser(userId, title, body, data)` - High-level helper

### 2. Consultation Approval Notification
**Priority: High**
**Trigger:** Firestore onUpdate when `consultation_requests/{id}` changes consultationStatus from 'pending' to 'approved'

**Notification:**
- Title: "상담 승인"
- Body: "{preferredDate} {preferredTime} 상담이 승인되었습니다."
- Data:
  - type: "consultation_approved"
  - consultationId: "{consultationId}"
  - screen: "UserConsultationDetail"

**Implementation:**
- functions/triggers/consultationNotifications.js
- Function name: `onConsultationApproved`
- Recipient: consultation.userId
- Handle missing FCM token gracefully

### 3. Consultation Rejection Notification
**Priority: High**
**Trigger:** Firestore onUpdate when `consultation_requests/{id}` changes consultationStatus to 'rejected'

**Notification:**
- Title: "상담 거절"
- Body: "상담 요청이 거절되었습니다. {rejectionReason}"
- Data:
  - type: "consultation_rejected"
  - consultationId: "{consultationId}"
  - screen: "UserConsultationDetail"

**Implementation:**
- Same file as approval (consultationNotifications.js)
- Function name: `onConsultationRejected`
- Include rejectionReason if available
- Recipient: consultation.userId

### 4. Alternative Time Slots Suggestion Notification
**Priority: Medium**
**Trigger:** Firestore onUpdate when `consultation_requests/{id}` has alternativeSlots field added/modified

**Notification:**
- Title: "대체 시간 제안"
- Body: "관리자가 대체 상담 시간을 제안했습니다. 확인해주세요."
- Data:
  - type: "alternative_slots_suggested"
  - consultationId: "{consultationId}"
  - screen: "UserConsultationDetail"

**Implementation:**
- Same file (consultationNotifications.js)
- Function name: `onAlternativeSlotsSuggested`
- Detect when alternativeSlots field changes
- Recipient: consultation.userId

### 5. Consultation Completion Notification
**Priority: Medium**
**Trigger:** Firestore onUpdate when `consultation_requests/{id}` changes consultationStatus to 'completed'

**Notification:**
- Title: "상담 완료"
- Body: "상담이 완료되었습니다. 거래 금액: {dealAmount}원"
- Data:
  - type: "consultation_completed"
  - consultationId: "{consultationId}"
  - screen: "UserConsultationDetail"

**Implementation:**
- Same file (consultationNotifications.js)
- Function name: `onConsultationCompleted`
- Include dealAmount if available
- Recipient: consultation.userId

### 6. Vehicle Approval/Rejection Notification
**Priority: High**
**Trigger:** Firestore onUpdate when `vehicles/{id}` changes status from 'pending' to 'approved' or 'rejected'

**Notification (Approved):**
- Title: "차량 등록 승인"
- Body: "{vehicleName} 차량이 승인되어 판매 가능합니다."
- Data:
  - type: "vehicle_approved"
  - vehicleId: "{vehicleId}"
  - screen: "VehicleDetail"

**Notification (Rejected):**
- Title: "차량 등록 거절"
- Body: "{vehicleName} 차량 등록이 거절되었습니다."
- Data:
  - type: "vehicle_rejected"
  - vehicleId: "{vehicleId}"
  - screen: "MyPage"

**Implementation:**
- functions/triggers/vehicleNotifications.js
- Function name: `onVehicleStatusChanged`
- Recipient: vehicle.sellerId (need to map to userId)

### 7. Admin Memo Update Notification (Optional)
**Priority: Low**
**Trigger:** Firestore onUpdate when `consultation_requests/{id}` has adminMemo field updated

**Notification:**
- Title: "관리자 메모"
- Body: "상담에 새로운 메모가 추가되었습니다."
- Data:
  - type: "admin_memo_added"
  - consultationId: "{consultationId}"
  - screen: "UserConsultationDetail"

**Implementation:**
- Optional enhancement
- Only notify if memo is meaningful (non-empty)

## Technical Specifications

### Function Structure
```
functions/
├── index.js                           # Main entry point, exports all functions
├── utils/
│   └── fcm.js                         # FCM utility functions
└── triggers/
    ├── consultationNotifications.js   # All consultation-related notifications
    └── vehicleNotifications.js        # Vehicle status notifications
```

### Error Handling
- Log all FCM errors to Cloud Functions logs
- Handle invalid/expired FCM tokens gracefully (don't throw)
- Use try-catch blocks around all notification sends
- Report critical errors to Crashlytics if possible

### Performance Considerations
- Use Firestore triggers (onUpdate) to minimize function invocations
- Check field changes before sending notifications (avoid duplicate sends)
- Set maxInstances: 10 to control costs (already configured in index.js)
- Use batched sends for multiple recipients if needed in future

## Testing Strategy

### Unit Testing
- Test FCM utility functions with mock tokens
- Test notification payload generation
- Test error handling for missing tokens

### Integration Testing
- Deploy to Firebase project
- Test each notification trigger manually:
  1. Update consultation status in Firestore Console
  2. Verify notification received in app
  3. Test in foreground, background, and quit states
  4. Verify deep linking to correct screen

### Edge Cases
- User with no FCM token (new user, token not saved yet)
- Expired FCM token (token refresh needed)
- User uninstalled app (token invalid)
- Multiple status changes in quick succession
- Network failures

## Deployment Plan

### Phase 1: Setup and Utilities
1. Verify functions/package.json dependencies
2. Create functions/utils/fcm.js with core utilities
3. Test Admin SDK initialization locally with Firebase Emulator

### Phase 2: Critical Notifications
1. Implement consultation approval/rejection notifications
2. Implement vehicle approval/rejection notifications
3. Deploy to Firebase project
4. Test with real devices

### Phase 3: Additional Notifications
1. Implement alternative slots suggestion notification
2. Implement consultation completion notification
3. Test and verify all flows

### Phase 4: Polish and Monitoring
1. Add comprehensive error logging
2. Monitor Cloud Functions logs for issues
3. Optimize function performance if needed
4. Document notification types for team reference

## Success Criteria
- ✅ All 6 notification types successfully send to users
- ✅ Notifications received in foreground, background, and quit states
- ✅ Deep linking works correctly (tapping notification opens correct screen)
- ✅ No errors for missing/invalid FCM tokens
- ✅ Cloud Functions logs show successful sends
- ✅ Notification delivery rate > 95% for valid tokens

## Dependencies
- Firebase Blaze plan (required for Cloud Functions)
- Service account credentials configured
- Firebase project admin access for deployment

## Timeline Estimate
- Phase 1 (Setup): 2-3 hours
- Phase 2 (Critical): 3-4 hours
- Phase 3 (Additional): 2-3 hours
- Phase 4 (Polish): 1-2 hours
- **Total: 8-12 hours**

## Notes
- Client-side notification handler in App.js already supports navigation via data.screen
- FCM token is stored in Firestore users/{uid}/fcmToken
- All Firebase packages are v23.5.0 (latest stable)
- Android notification permissions already configured
- iOS notification permissions handled via Firebase Messaging requestPermission
