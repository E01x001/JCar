/**
 * Firestore Migration Script
 *
 * Migrates consultation_requests collection:
 * 1. Copy 'status' value to 'consultationStatus' if consultationStatus doesn't exist
 * 2. Delete 'status' field
 *
 * Run this script once to migrate existing data.
 */

import { getFirestore, collection, getDocs, writeBatch, deleteField } from '@react-native-firebase/firestore';

/**
 * Migrate all consultation_requests documents
 * - Copy status -> consultationStatus (if consultationStatus is missing)
 * - Delete status field
 */
export const migrateConsultationStatusField = async () => {
  try {
    console.log('🔄 Starting consultation status migration...');

    const db = getFirestore();
    const consultationsRef = collection(db, 'consultation_requests');
    const snapshot = await getDocs(consultationsRef);

    console.log(`📊 Found ${snapshot.size} consultation documents`);

    let migratedCount = 0;
    let skippedCount = 0;
    const errorCount = 0;

    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      // Skip if already migrated (no status field)
      if (!data.status) {
        skippedCount++;
        return;
      }

      const updateData = {};

      // Copy status to consultationStatus if it doesn't exist
      if (!data.consultationStatus) {
        updateData.consultationStatus = data.status;
      }

      // Delete status field
      updateData.status = deleteField();

      batch.update(doc.ref, updateData);
      migratedCount++;
    });

    if (migratedCount > 0) {
      await batch.commit();
      console.log('✅ Migration complete!');
      console.log(`   - Migrated: ${migratedCount} documents`);
      console.log(`   - Skipped: ${skippedCount} documents (already migrated)`);
    } else {
      console.log('ℹ️  No documents need migration');
      console.log(`   - All ${skippedCount} documents already migrated`);
    }

    return {
      success: true,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount,
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

export default migrateConsultationStatusField;
