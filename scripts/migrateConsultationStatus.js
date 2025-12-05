/**
 * JCar - Consultation Status Migration Script
 *
 * This script migrates the consultation_requests collection to the new schema:
 * - Renames 'status' field to 'consultationStatus'
 * - Maps old status values: 'approved' -> 'confirmed'
 * - Adds new fields: completedAt, completedBy, dealAmount, adminNotes
 *
 * Usage:
 *   node scripts/migrateConsultationStatus.js [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without writing to Firestore
 *
 * Requirements:
 *   - Firebase Admin SDK service account key at ./serviceAccountKey.json
 *   - Node.js v18 or higher
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 500; // Firestore batch write limit
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'serviceAccountKey.json');

// Initialize Firebase Admin SDK
function initializeFirebase() {
  try {
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      console.error('❌ Error: serviceAccountKey.json not found!');
      console.error('   Please download your Firebase service account key and save it as:');
      console.error(`   ${SERVICE_ACCOUNT_PATH}`);
      process.exit(1);
    }

    const serviceAccount = require(SERVICE_ACCOUNT_PATH);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase Admin SDK initialized');
    return admin.firestore();
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    process.exit(1);
  }
}

// Map old status to new consultationStatus
function mapStatus(oldStatus) {
  const statusMap = {
    'pending': 'pending',
    'approved': 'confirmed',
    'rejected': 'rejected',
  };
  return statusMap[oldStatus] || 'pending';
}

// Transform document data
function transformDocument(docData) {
  const transformed = { ...docData };

  // Rename status to consultationStatus
  if (transformed.status) {
    transformed.consultationStatus = mapStatus(transformed.status);
    delete transformed.status;
  }

  // Add new fields with default null values if they don't exist
  if (!transformed.hasOwnProperty('completedAt')) {
    transformed.completedAt = null;
  }
  if (!transformed.hasOwnProperty('completedBy')) {
    transformed.completedBy = null;
  }
  if (!transformed.hasOwnProperty('dealAmount')) {
    transformed.dealAmount = null;
  }
  if (!transformed.hasOwnProperty('adminNotes')) {
    transformed.adminNotes = null;
  }

  return transformed;
}

// Fetch all consultation_requests documents
async function fetchAllDocuments(db) {
  console.log('\n📥 Fetching all consultation_requests documents...');

  try {
    const snapshot = await db.collection('consultation_requests').get();
    console.log(`✅ Found ${snapshot.size} documents`);

    const documents = [];
    snapshot.forEach(doc => {
      documents.push({
        id: doc.id,
        data: doc.data(),
      });
    });

    return documents;
  } catch (error) {
    console.error('❌ Failed to fetch documents:', error.message);
    throw error;
  }
}

// Process documents in batches
async function processBatches(db, documents) {
  console.log(`\n⚙️  Processing ${documents.length} documents in batches of ${BATCH_SIZE}...`);

  const batches = [];
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    batches.push(documents.slice(i, i + BATCH_SIZE));
  }

  console.log(`📦 Created ${batches.length} batch(es)`);

  let totalUpdated = 0;
  let totalErrors = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = db.batch();
    const currentBatch = batches[batchIndex];

    console.log(`\n📝 Processing batch ${batchIndex + 1}/${batches.length}...`);

    for (const doc of currentBatch) {
      try {
        const transformed = transformDocument(doc.data);
        const docRef = db.collection('consultation_requests').doc(doc.id);

        batch.set(docRef, transformed, { merge: true });

        // Log sample transformations
        if (totalUpdated < 3 || DRY_RUN) {
          console.log(`   📄 Document ${doc.id}:`);
          console.log(`      Old status: ${doc.data.status || 'undefined'}`);
          console.log(`      New consultationStatus: ${transformed.consultationStatus}`);
        }

        totalUpdated++;
      } catch (error) {
        console.error(`   ❌ Error processing document ${doc.id}:`, error.message);
        totalErrors++;
      }
    }

    // Commit batch
    if (!DRY_RUN) {
      try {
        await batch.commit();
        console.log(`   ✅ Batch ${batchIndex + 1} committed successfully`);
      } catch (error) {
        console.error(`   ❌ Failed to commit batch ${batchIndex + 1}:`, error.message);
        totalErrors += currentBatch.length;
      }
    } else {
      console.log(`   🔍 DRY RUN: Would commit ${currentBatch.length} documents`);
    }
  }

  return { totalUpdated, totalErrors };
}

// Main migration function
async function migrate() {
  console.log('🚀 Starting Consultation Status Migration');
  console.log('==========================================');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE: No changes will be written to Firestore');
  }

  const startTime = Date.now();

  try {
    // Initialize Firebase
    const db = initializeFirebase();

    // Fetch all documents
    const documents = await fetchAllDocuments(db);

    if (documents.length === 0) {
      console.log('\n✅ No documents to migrate!');
      return;
    }

    // Process in batches
    const { totalUpdated, totalErrors } = await processBatches(db, documents);

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n==========================================');
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successfully processed: ${totalUpdated} documents`);
    console.log(`   ❌ Errors: ${totalErrors}`);
    console.log(`   ⏱️  Duration: ${duration}s`);

    if (DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN. No changes were written.');
      console.log('   Run without --dry-run flag to apply changes.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { migrate, transformDocument, mapStatus };
