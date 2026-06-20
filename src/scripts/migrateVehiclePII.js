/**
 * Firestore Migration Script — Vehicle PII relocation (Task 125)
 *
 * Moves seller PII off the publicly-readable vehicle document into a private
 * subdocument (vehicles/{id}/private/contact) that only the owner/admin can read.
 *
 * For each vehicle that still has inline PII:
 *   1. Create vehicles/{id}/private/contact with the PII + sellerId
 *   2. Delete the inline PII fields from the public vehicle doc
 *
 * Run once (admin) after deploying the updated security rules.
 */

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  writeBatch,
  deleteField,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { logger } from '../utils/logger';

const PII_FIELDS = ['sellerName', 'sellerPhone', 'sellerEmail', 'ownerName', 'regiNumber', 'vin'];

// Each migrated vehicle = 2 writes (set contact + update vehicle). Firestore
// batches cap at 500 ops, so process at most 200 vehicles (400 ops) per batch.
const CHUNK_SIZE = 200;

/**
 * Migrate all vehicle documents: relocate seller PII to a private subdocument.
 * @returns {Promise<{success: boolean, migrated: number, skipped: number}>}
 */
export const migrateVehiclePII = async () => {
  try {
    logger.debug('🔄 Starting vehicle PII migration...');

    const db = getFirestore();
    const vehiclesRef = collection(db, 'vehicles');
    const snapshot = await getDocs(vehiclesRef);

    logger.debug(`📊 Found ${snapshot.size} vehicle documents`);

    const toMigrate = snapshot.docs.filter((d) => {
      const data = d.data();
      return PII_FIELDS.some((f) => f in data);
    });

    let migratedCount = 0;
    const skippedCount = snapshot.size - toMigrate.length;

    for (let i = 0; i < toMigrate.length; i += CHUNK_SIZE) {
      const chunk = toMigrate.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      chunk.forEach((d) => {
        const data = d.data();

        const contactRef = doc(db, 'vehicles', d.id, 'private', 'contact');
        batch.set(contactRef, {
          sellerId: data.sellerId || data.currentOwnerId || null,
          sellerName: data.sellerName ?? null,
          sellerPhone: data.sellerPhone ?? null,
          sellerEmail: data.sellerEmail ?? null,
          ownerName: data.ownerName ?? null,
          regiNumber: data.regiNumber ?? null,
          vin: data.vin ?? null,
          migratedAt: serverTimestamp(),
        });

        const removal = {};
        PII_FIELDS.forEach((f) => { removal[f] = deleteField(); });
        batch.update(d.ref, removal);

        migratedCount++;
      });

      await batch.commit();
      logger.debug(`   committed ${Math.min(i + CHUNK_SIZE, toMigrate.length)}/${toMigrate.length}`);
    }

    logger.debug(`✅ Vehicle PII migration complete: migrated ${migratedCount}, skipped ${skippedCount}`);
    return { success: true, migrated: migratedCount, skipped: skippedCount };
  } catch (error) {
    logger.error('❌ Vehicle PII migration failed:', error);
    throw error;
  }
};

export default migrateVehiclePII;
