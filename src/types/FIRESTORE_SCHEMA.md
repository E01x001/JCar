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
| `status` | string | Yes | 'pending', 'approved', 'rejected', 'sold' |
| `price` | number | Yes | Vehicle price |
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
| `createdAt` | Timestamp | Yes | Account creation timestamp |

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

## Notes

- All timestamps use `firebase.firestore.Timestamp` type
- Prices are stored in KRW (Korean Won) as numbers
- `transferType` is an enum with only two values: `'sell_to_admin'` | `'admin_to_buyer'`
- `consultationStatus: 'archived'` replaces need for 'confirmed' status
- Ownership history is append-only; never modify existing entries
