# JCar Migration Scripts

This directory contains one-time migration scripts for data schema updates.

## Available Scripts

### migrateConsultationStatus.js

Migrates the `consultation_requests` collection to the new schema introduced in Task #33.

#### Changes Applied

1. **Field Rename**: `status` → `consultationStatus`
2. **Status Value Mapping**:
   - `pending` → `pending` (unchanged)
   - `approved` → `confirmed`
   - `rejected` → `rejected` (unchanged)
3. **New Fields Added** (with `null` defaults):
   - `completedAt`: Timestamp when deal was completed
   - `completedBy`: Admin user ID who completed the deal
   - `dealAmount`: Final deal amount
   - `adminNotes`: Additional admin notes

#### Prerequisites

1. **Firebase Admin SDK Service Account Key**
   - Download your service account key from Firebase Console:
     1. Go to Project Settings → Service Accounts
     2. Click "Generate New Private Key"
     3. Save the JSON file as `serviceAccountKey.json` in the project root

2. **Firebase Admin SDK Package**
   ```bash
   npm install firebase-admin --save-dev
   ```

3. **Node.js v18 or higher**

#### Usage

**Dry Run (Recommended First):**
```bash
# Preview changes without writing to Firestore
node scripts/migrateConsultationStatus.js --dry-run
```

**Apply Migration:**
```bash
# Apply changes to Firestore
node scripts/migrateConsultationStatus.js
```

#### Safety Features

- ✅ Dry-run mode to preview changes
- ✅ Batched writes (500 documents per batch)
- ✅ Detailed logging of all operations
- ✅ Error handling and rollback on batch failure
- ✅ Sample transformation output for verification

#### Expected Output

```
🚀 Starting Consultation Status Migration
==========================================
✅ Firebase Admin SDK initialized

📥 Fetching all consultation_requests documents...
✅ Found 12 documents

⚙️  Processing 12 documents in batches of 500...
📦 Created 1 batch(es)

📝 Processing batch 1/1...
   📄 Document abc123:
      Old status: approved
      New consultationStatus: confirmed
   ✅ Batch 1 committed successfully

==========================================
📊 Migration Summary:
   ✅ Successfully processed: 12 documents
   ❌ Errors: 0
   ⏱️  Duration: 2.34s

✅ Migration completed successfully!
```

#### Important Notes

⚠️ **This is a one-time migration script**
- Run it only once per environment (staging, production)
- Always test on staging/development environment first
- Verify a sample of documents before and after migration
- Keep a backup of your Firestore data before running

⚠️ **Security**
- **NEVER commit `serviceAccountKey.json` to Git**
- It's already in `.gitignore` for safety
- Use different service accounts for staging and production

#### Verification Steps

After running the migration, verify in Firebase Console:

1. Check a few documents in `consultation_requests`
2. Confirm all documents have:
   - `consultationStatus` field (not `status`)
   - New fields: `completedAt`, `completedBy`, `dealAmount`, `adminNotes`
3. Verify status mappings are correct (approved → confirmed)

#### Rollback

If you need to rollback, manually update documents in Firebase Console or create a reverse migration script.

## Adding New Migration Scripts

When creating new migration scripts:

1. Name format: `migrate<Description>.js`
2. Include dry-run mode
3. Add comprehensive logging
4. Document in this README
5. Add safety checks and error handling
