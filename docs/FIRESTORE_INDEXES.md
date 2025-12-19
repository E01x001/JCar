# Firestore Composite Indexes Documentation

## Overview

This document describes the Firestore composite indexes required for optimal query performance in the JCar application. These indexes are defined in `firestore.indexes.json` and must be deployed to Firebase before production use.

## Why Composite Indexes Are Needed

Firebase Firestore automatically creates single-field indexes, but composite indexes (indexes on multiple fields) must be manually defined when queries use:
- Multiple `where()` clauses
- Combination of `where()` and `orderBy()` on different fields
- `in` operator with `orderBy()`

Without these indexes, queries will fail with a helpful error message containing a link to auto-create the index in Firebase Console.

## Index Definitions

### 1. Consultation Requests by Status and Creation Date

**Query Pattern**:
```javascript
.where('consultationStatus', 'in', ['completed', 'archived'])
.orderBy('createdAt', 'desc')
```

**Used In**:
- `src/services/firebaseService.js::subscribeToCompletedConsultations()`

**Index Definition**:
```json
{
  "collectionGroup": "consultation_requests",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "consultationStatus", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Purpose**: Efficiently retrieve completed and archived consultations in reverse chronological order for admin dashboard.

---

### 2. Consultation Requests by User and Creation Date

**Query Pattern**:
```javascript
.where('userId', '==', currentUserId)
.orderBy('createdAt', 'desc')
```

**Used In**:
- `src/services/firebaseService.js::subscribeToBuyConsultations()`
- `src/services/firebaseService.js::subscribeToSellConsultations()`

**Index Definition**:
```json
{
  "collectionGroup": "consultation_requests",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Purpose**: Retrieve all consultations for a specific user in chronological order for user's MyPage.

---

### 3. Consultation Requests by Vehicle, Date, and Time

**Query Pattern**:
```javascript
.where('vehicleId', '==', vehicleId)
.where('preferredDate', '==', date)
.where('preferredTime', '==', time)
```

**Used In**:
- `src/services/firebaseService.js::checkConsultationTimeConflict()`

**Index Definition**:
```json
{
  "collectionGroup": "consultation_requests",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "vehicleId", "order": "ASCENDING" },
    { "fieldPath": "preferredDate", "order": "ASCENDING" },
    { "fieldPath": "preferredTime", "order": "ASCENDING" }
  ]
}
```

**Purpose**: Prevent double-booking by checking if a consultation slot is already taken.

---

### 4. Consultation Requests by Type, Status, and Creation Date

**Query Pattern**:
```javascript
.where('type', '==', 'buy')
.where('consultationStatus', '==', 'pending')
.orderBy('createdAt', 'desc')
```

**Used In**:
- Admin consultation filtering by type and status

**Index Definition**:
```json
{
  "collectionGroup": "consultation_requests",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "consultationStatus", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Purpose**: Filter consultations by type (buy/sell) and status for admin management screens.

---

### 5. Vehicles by Seller and Creation Date

**Query Pattern**:
```javascript
.where('sellerId', '==', userId)
.orderBy('createdAt', 'desc')
```

**Used In**:
- User's vehicle listing page (MyPage)

**Index Definition**:
```json
{
  "collectionGroup": "vehicles",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "sellerId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Purpose**: Show all vehicles registered by a specific user in reverse chronological order.

---

### 6. Vehicles by Status and Creation Date

**Query Pattern**:
```javascript
.where('status', '==', 'approved')
.orderBy('createdAt', 'desc')
```

**Used In**:
- `src/services/firebaseService.js::getVehicles()`
- Admin vehicle management screens

**Index Definition**:
```json
{
  "collectionGroup": "vehicles",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Purpose**: Filter vehicles by approval status (pending/approved/rejected) for admin and public views.

---

### 7. Ownership Transfers by Vehicle and Transfer Date

**Query Pattern**:
```javascript
.where('vehicleId', '==', vehicleId)
.orderBy('transferredAt', 'desc')
```

**Used In**:
- `src/services/ownershipTransferService.js::getVehicleOwnershipHistory()`

**Index Definition**:
```json
{
  "collectionGroup": "ownership_transfers",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "vehicleId", "order": "ASCENDING" },
    { "fieldPath": "transferredAt", "order": "DESCENDING" }
  ]
}
```

**Purpose**: Retrieve complete ownership transfer history for a specific vehicle.

---

## Deployment Instructions

### Prerequisites

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in project (if not already done):
   ```bash
   firebase init firestore
   ```

### Deploy Indexes

Deploy the indexes defined in `firestore.indexes.json`:

```bash
firebase deploy --only firestore:indexes
```

**Note**: Index creation can take several minutes to hours depending on existing data volume. Monitor progress in Firebase Console under Firestore → Indexes.

### Verify Deployment

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Navigate to your project → Firestore Database → Indexes
3. Verify all 7 composite indexes are listed with status "Enabled"

### Development vs Production

- **Development**: Firestore will auto-create indexes when queries fail, providing a link in the error message
- **Production**: Always deploy indexes before deploying app updates that introduce new queries

### Troubleshooting

**Index Creation Failed**:
- Check Firebase CLI version: `firebase --version` (requires v11.0.0+)
- Verify project ID: `firebase projects:list`
- Check quota limits in Firebase Console

**Query Still Slow After Index Deployment**:
- Ensure index status is "Enabled" (not "Building")
- Check query is using exact field paths defined in index
- Consider adding pagination for large result sets

**Index Already Exists Error**:
- Firebase automatically merges duplicate index definitions
- Check Firebase Console to see which indexes are already deployed
- Remove duplicates from `firestore.indexes.json`

## Performance Considerations

### Index Size Limits

- Maximum 200 composite indexes per database
- Maximum 40,000 index entries per document
- Each field in a composite index counts toward document write cost

### Query Performance

With proper indexes:
- Queries on 10,000+ documents: < 100ms
- Without indexes: Can timeout or fail entirely

### Cost Implications

- Index writes: Billed per index entry (same as document writes)
- Index storage: Billed separately from document storage
- Estimate: ~10% additional storage cost for typical applications

## Maintenance

### Adding New Indexes

1. Identify new query pattern requiring composite index
2. Add index definition to `firestore.indexes.json`
3. Deploy using `firebase deploy --only firestore:indexes`
4. Document the index in this file with query pattern and usage

### Removing Unused Indexes

1. Identify unused indexes (check Firebase Console → Firestore → Usage)
2. Remove from `firestore.indexes.json`
3. Deploy changes
4. Manually delete from Firebase Console (indexes aren't auto-deleted by CLI)

### Monitoring

- Firebase Console → Firestore → Indexes: Monitor build status
- Firebase Console → Firestore → Usage: Track query patterns and slow queries
- Check index exemptions for frequently used queries

## Related Documentation

- [Firebase Indexes Overview](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Index Best Practices](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [Firestore Pricing](https://firebase.google.com/docs/firestore/pricing)
- Project: `src/types/FIRESTORE_SCHEMA.md` - Database schema documentation
- Project: `CLAUDE.md` - Development guidelines and architecture

## Version History

- **v1.0** (2025-12-17): Initial index configuration for JCar v1.0 release
  - Added 7 composite indexes for consultation_requests, vehicles, and ownership_transfers collections
  - Covers all current query patterns in production code
