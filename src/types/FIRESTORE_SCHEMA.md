# Firestore Collections Schema

This document describes the structure of all Firestore collections in the JCar application.

## Collections Overview

- `users` - User accounts and profiles
- `vehicles` - Vehicle listings
- `consultation_requests` - Consultation requests from users
- `admin_owned_vehicles` - Vehicles currently/previously owned by admin
- **`ownership_transfers`** - **(NEW)** Vehicle ownership transfer records

---

## `vehicles` Collection

Stores all vehicle listings in the system.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `vehicleId` | string | Yes | Unique identifier (document ID) |
| `vehicleName` | string | Yes | Vehicle name/model |
| `manufacturer` | string | Yes | Manufacturer/brand |
| `year` | number | Yes | Manufacturing year |
| `imageUrl` | string[] | Yes | Array of image URLs |
| `status` | string | Yes | 검수 축: 'pending', 'approved', 'rejected', 'sold' |
| `dealStage` | string | No | 거래 축(C2B2C): 'listed', 'acquiring', 'in_stock', 'sold'. 승인 시 'listed' 세팅 |
| `price` | number | Yes | Vehicle price (소유자 본인·관리자에게만 표시) |
| `mileage` | number | Yes | Vehicle mileage (km) |
| `fuelType` | string | No | Fuel type |
| `transmission` | string | No | Transmission type |
| `color` | string | No | Vehicle color |
| `description` | string | No | Vehicle description |
| `createdAt` | Timestamp | Yes | Creation timestamp |

### **New Fields for Ownership Transfer (Task 47)**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `currentOwnerId` | string \| null | No | null | UID of current owner (replaces `sellerId`) |
| `ownershipHistory` | OwnershipHistoryEntry[] | No | [] | Array of ownership change records |
| `isAdminOwned` | boolean | No | false | Whether vehicle is currently admin-owned |
| `availableForPurchase` | boolean | No | true | Whether vehicle is available for purchase |

#### `OwnershipHistoryEntry` Object Structure

```javascript
{
  transferId: string,           // Reference to ownership_transfers document
  transferredAt: Timestamp,      // Transfer timestamp
  fromUserId: string | null,     // Previous owner UID
  toUserId: string | null,       // New owner UID
  transferType: 'sell_to_admin' | 'admin_to_buyer',
  price: number                  // Transfer price
}
```

### Migration Notes

- `sellerId` field is DEPRECATED and will be replaced by `currentOwnerId`
- Existing vehicles will need migration to populate `currentOwnerId` from `sellerId`
- `ownershipHistory` will be empty array for existing vehicles until first transfer

---

## `ownership_transfers` Collection ⭐ **NEW**

**Purpose**: Track all vehicle ownership transfers in the system.

### Document Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transferId` | string | Yes | Document ID (auto-generated) |
| `vehicleId` | string | Yes | Reference to vehicles collection |
| `consultationId` | string \| null | No | Reference to consultation_requests (nullable) |
| `fromUserId` | string \| null | No | UID of seller (null if admin seller) |
| `toUserId` | string \| null | No | UID of buyer (null if admin buyer) |
| `transferType` | string | Yes | 'sell_to_admin' or 'admin_to_buyer' |
| `transferredAt` | Timestamp | Yes | Transfer timestamp |
| `price` | number | Yes | Transfer amount (KRW) |
| `notes` | string \| null | No | Optional transfer notes |

### Transfer Types

#### `sell_to_admin`
- User sells vehicle to admin
- `fromUserId`: seller's UID
- `toUserId`: null (or admin UID)
- Vehicle's `currentOwnerId` → admin UID
- Vehicle's `isAdminOwned` → true
- Vehicle's `availableForPurchase` → true

#### `admin_to_buyer`
- Admin sells vehicle to buyer
- `fromUserId`: null (or admin UID)
- `toUserId`: buyer's UID
- Vehicle's `currentOwnerId` → buyer's UID
- Vehicle's `isAdminOwned` → false
- Vehicle's `status` → 'sold'

### Example Document

```javascript
{
  transferId: "auto-generated",
  vehicleId: "vehicle-123",
  consultationId: "consult-456",
  fromUserId: "user-abc",
  toUserId: null, // transferred to admin
  transferType: "sell_to_admin",
  transferredAt: Timestamp(2025, 0, 15),
  price: 25000000,
  notes: "Completed via consultation #456"
}
```

---

## `consultation_requests` Collection

Stores all consultation requests between users and admin.

### Existing Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Document ID |
| `userId` | string | Yes | User who requested |
| `userName` | string | Yes | User display name |
| `userPhone` | string | No | User phone number |
| `vehicleId` | string | Yes | Vehicle ID |
| `vehicleName` | string | Yes | Vehicle name |
| `preferredDate` | string | Yes | Preferred date (YYYY-MM-DD) |
| `preferredTime` | string | Yes | Preferred time (HH:MM) |
| `type` | string | Yes | 'buy' or 'sell' |
| `consultationStatus` | string | Yes | Status (see below) |
| `createdAt` | Timestamp | Yes | Creation timestamp |
| `rejectionReason` | string \| null | No | Reason if rejected |
| `alternativeSlots` | AlternativeSlot[] | No | Alternative time slots |
| `adminMemo` | string \| null | No | Admin notes |
| `dealAmount` | number \| null | No | Final deal amount |
| `completedAt` | Timestamp \| null | No | Completion timestamp |
| `completedBy` | string \| null | No | Admin who completed |

### **New Fields for Ownership Transfer (Task 47)**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `isOwnershipTransferred` | boolean | No | false | Whether ownership was transferred |
| `transferId` | string \| null | No | null | Reference to ownership_transfers document |

### Consultation Status Values

- `pending` - Awaiting admin review
- `approved` - Approved by admin
- `rejected` - Rejected by admin
- `completed` - Deal completed
- `cancelled` - Cancelled by user
- **`archived`** - **(NEW)** Completed with ownership transfer

### `AlternativeSlot` Object

```javascript
{
  date: string,  // YYYY-MM-DD
  time: string   // HH:MM
}
```

---

## `users` Collection

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uid` | string | Yes | User unique identifier |
| `name` | string | Yes | Display name |
| `email` | string | Yes | Email address |
| `phoneNumber` | string | Yes | Phone number |
| `role` | string | Yes | 'user' or 'admin' |
| `status` | string | No | Account status: 'active' (default) or 'suspended' |
| `statusUpdatedAt` | Timestamp \| null | No | Last status change timestamp |
| `fcmToken` | string \| null | No | Firebase Cloud Messaging token for push notifications |
| `createdAt` | Timestamp | Yes | Account creation timestamp |

### FCM Token Management

- **Purpose**: Store device FCM token for sending push notifications
- **Updated**: Token is saved/updated when user logs in (see `AuthContext.js`)
- **Lifecycle**:
  - Created: On user login via `saveFcmToken()` in `firebaseService.js`
  - Updated: When device token changes (app reinstall, token refresh)
  - Removed: Set to `null` when user logs out or uninstalls app
- **Security**: Token is device-specific and automatically invalidated by Firebase when device uninstalls app

---

## `admin_owned_vehicles` Collection

Tracks vehicles owned by the admin (current or historical).

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `vehicleId` | string | Yes | Reference to vehicles collection |
| `vehicleName` | string | Yes | Vehicle name (denormalized) |
| `purchasePrice` | number | Yes | Admin's purchase price |
| `acquiredAt` | Timestamp | Yes | Acquisition timestamp |
| `soldTo` | string \| null | No | Buyer's UID if sold |
| `soldPrice` | number \| null | No | Sale price if sold |
| `soldAt` | Timestamp \| null | No | Sale timestamp if sold |

---

## Relationships

```
User (seller)
  ↓
Vehicle (status: pending → approved)
  ↓
ConsultationRequest (type: sell, status: pending → approved)
  ↓
OwnershipTransfer (sell_to_admin)
  ↓
Vehicle (currentOwnerId: admin, isAdminOwned: true)
AdminOwnedVehicle (acquired)
ConsultationRequest (status: archived, isOwnershipTransferred: true)
  ↓
ConsultationRequest (type: buy, status: pending → approved)
  ↓
OwnershipTransfer (admin_to_buyer)
  ↓
Vehicle (currentOwnerId: buyer, status: sold, isAdminOwned: false)
AdminOwnedVehicle (soldTo: buyer, soldAt: timestamp)
ConsultationRequest (status: archived, isOwnershipTransferred: true)
```

---

## Security Considerations

### Firestore Security Rules (to be implemented in Task 54)

- **`vehicles`**: Only admin or `currentOwnerId` can update
- **`ownership_transfers`**: Only admin can read/create; no updates/deletes
- **`consultation_requests`**: Only requestor, seller, or admin can read/update
- **`admin_owned_vehicles`**: Only admin can read/write
- **`users`**: Users can only read/update their own document; admin can read all

---

## FCM Push Notifications (Tasks 64-70) ✅

### Overview

Firebase Cloud Functions automatically send push notifications when specific Firestore document changes occur. Notifications are sent to users via their FCM token stored in the `users` collection.

### Notification Triggers

#### **Consultation Notifications** (5 triggers)

| Trigger | Firestore Change | Recipient | Screen | Implementation |
|---------|-----------------|-----------|--------|----------------|
| **Consultation Approved** | `consultationStatus`: `pending` → `approved` | User (`userId`) | `UserConsultationDetail` | `onConsultationApproved` |
| **Consultation Rejected** | `consultationStatus` → `rejected` | User (`userId`) | `UserConsultationDetail` | `onConsultationRejected` |
| **Alternative Slots Suggested** | `alternativeSlots` field added/changed | User (`userId`) | `UserConsultationDetail` | `onAlternativeSlotsSuggested` |
| **Consultation Completed** | `consultationStatus` → `completed` | User (`userId`) | `UserConsultationDetail` | `onConsultationCompleted` |
| **Admin Memo Added** | `adminMemo` field added/changed | User (`userId`) | `UserConsultationDetail` | `onAdminMemoUpdated` |

#### **Vehicle Notifications** (1 trigger)

| Trigger | Firestore Change | Recipient | Screen | Implementation |
|---------|-----------------|-----------|--------|----------------|
| **Vehicle Status Changed** | `status`: `pending` → `approved`/`rejected` | Owner (`currentOwnerId` or `sellerId`) | `VehicleDetail` (approved) or `MyPage` (rejected) | `onVehicleStatusChanged` |

### Notification Data Payload

All notifications include a `data` object for deep linking:

```javascript
{
  type: string,              // Notification type (e.g., 'consultation_approved')
  consultationId?: string,   // Consultation document ID (if applicable)
  vehicleId?: string,        // Vehicle document ID (if applicable)
  screen: string            // Target screen name for navigation
}
```

### Deep Linking Flow

1. **Server**: Cloud Function sends notification with `data.screen` and relevant IDs
2. **Client**: App receives notification in foreground/background/quit state
3. **Navigation**: `handleNotificationNavigation()` in `App.js` routes to `data.screen` with parameters

```javascript
// Example: Consultation approved notification
{
  notification: {
    title: "상담 승인",
    body: "2025-01-15 14:00 구매 상담이 승인되었습니다."
  },
  data: {
    type: "consultation_approved",
    consultationId: "abc123",
    screen: "UserConsultationDetail"
  }
}
```

### Notification States

| State | Handler | Behavior | Implementation |
|-------|---------|----------|----------------|
| **Foreground** | `onMessage()` | Show Toast, tap to navigate | `App.js` line 69-105 |
| **Background** | `onNotificationOpenedApp()` | Auto-navigate on tap | `App.js` line 127-135 |
| **Quit** | `getInitialNotification()` | Auto-navigate on app open | `App.js` line 111-125 |

### Error Handling

- **Invalid FCM Token**: Logged, no retry (expected when user uninstalls app)
- **Missing User Document**: Logged, notification not sent
- **Missing FCM Token**: Logged, notification not sent
- **Navigation Failure**: Logged, no user-facing error

### Files

#### **Server-Side (Cloud Functions)**
- `functions/utils/fcm.js` - FCM utilities and token management
- `functions/triggers/consultationNotifications.js` - Consultation notification triggers
- `functions/triggers/vehicleNotifications.js` - Vehicle notification triggers
- `functions/index.js` - Function exports

#### **Client-Side (React Native)**
- `src/App.js` - Notification handlers and deep linking
- `src/services/firebaseService.js` - FCM token management
- `src/context/AuthContext.js` - Token save on login
- `src/navigation/AppNavigator.js` - Navigation ref for deep linking

### Testing

1. **Manual Testing**: Change Firestore documents via Firebase Console
2. **Expected Behavior**:
   - Notification appears in notification center
   - Foreground: Toast appears, tap to navigate
   - Background/Quit: Tap notification to auto-navigate
3. **Monitoring**: Check Cloud Functions logs for delivery status

---

## Data Migration Plan

### Phase 1: Schema Update (Task 47) ✅
- [x] Define new fields in schema documentation
- [x] Create JSDoc types in `src/types/firestore.js`
- [x] Document relationships and transfer flows

### Phase 2: Backend Implementation (Tasks 48-51)
- [ ] Implement `transferVehicleToAdmin` transaction
- [ ] Implement `transferVehicleToBuyer` transaction
- [ ] Integrate with `CompleteDealModal`
- [ ] Add archival logic for consultations

### Phase 3: Data Migration Script (Future)
- [ ] Migrate existing `sellerId` → `currentOwnerId`
- [ ] Initialize `ownershipHistory` as empty arrays
- [ ] Set `isAdminOwned` based on current ownership
- [ ] Verify data integrity

---

## Testing Strategy (Task 47)

### Using Firebase Emulator Suite

1. **Create Test Documents**:
   ```javascript
   // Vehicle with new fields
   {
     vehicleId: "test-vehicle-1",
     vehicleName: "Test Car",
     currentOwnerId: "user-123",
     ownershipHistory: [],
     isAdminOwned: false,
     availableForPurchase: true,
     // ... other fields
   }

   // Ownership Transfer
   {
     transferId: "transfer-1",
     vehicleId: "test-vehicle-1",
     consultationId: "consult-1",
     fromUserId: "user-123",
     toUserId: null,
     transferType: "sell_to_admin",
     transferredAt: Timestamp.now(),
     price: 20000000,
     notes: "Test transfer"
   }

   // Consultation Request with new fields
   {
     id: "consult-1",
     userId: "user-123",
     vehicleId: "test-vehicle-1",
     isOwnershipTransferred: true,
     transferId: "transfer-1",
     consultationStatus: "archived",
     // ... other fields
   }
   ```

2. **Verify Field Acceptance**: Ensure all new fields accept intended data types
3. **Test Relationships**: Create linked documents and verify references
4. **Validate Constraints**: Test nullable fields, enums, and default values

---

---

## `admin_activity_log` Collection

**Purpose**: Track all administrative actions for auditing and security monitoring.

### Document Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `adminUid` | string | Yes | UID of admin who performed the action |
| `action` | string | Yes | Type of action performed |
| `targetUserId` | string | No | UID of user affected by the action |
| `targetUserName` | string | No | Name of user affected (denormalized) |
| `previousStatus` | string | No | Previous account status (for status changes) |
| `newStatus` | string | No | New account status (for status changes) |
| `timestamp` | Timestamp | Yes | When the action was performed |

### Action Types

- `suspend_user` - User account suspended
- `activate_user` - User account reactivated
- `approve_vehicle` - Vehicle registration approved
- `reject_vehicle` - Vehicle registration rejected
- `approve_consultation` - Consultation request approved
- `reject_consultation` - Consultation request rejected

### Example Document

```javascript
{
  adminUid: "admin-uid-123",
  action: "suspend_user",
  targetUserId: "user-uid-456",
  targetUserName: "홍길동",
  previousStatus: "active",
  newStatus: "suspended",
  timestamp: Timestamp.now()
}
```

---

## Notes

- All timestamps use `firebase.firestore.Timestamp` type
- Prices are stored in KRW (Korean Won) as numbers
- `transferType` is an enum with only two values: `'sell_to_admin'` | `'admin_to_buyer'`
- `consultationStatus: 'archived'` replaces need for 'confirmed' status
- Ownership history is append-only; never modify existing entries
- User `status` defaults to 'active' if not specified
- Admin accounts cannot be suspended (enforced in AdminUserManagementScreen)
