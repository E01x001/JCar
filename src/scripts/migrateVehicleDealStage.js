/**
 * Firestore Migration Script — Vehicle dealStage backfill (C2B2C 거래 단계 축 도입)
 *
 * 기존 vehicles 문서에 거래 단계 축(dealStage)을 백필한다. dealStage는 검수 축
 * (status: pending/approved/rejected)과 분리된 거래 생애주기 필드다.
 *
 * 백필 규칙(이미 dealStage가 있으면 건너뜀):
 *   - status 'sold'                         → dealStage 'sold'
 *   - status 'approved' && isAdminOwned     → dealStage 'in_stock' (이미 매입한 재고)
 *   - status 'approved'                     → dealStage 'listed'  (미매입 노출)
 *   - status 'pending' / 'rejected'         → 미설정(아직 거래 단계 진입 전)
 *
 * Run once (admin) after deploying the updated code.
 */

import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { logger } from '../utils/logger';
import { DEAL_STAGE } from '../constants/vehicle';

// 1 migrated vehicle = 1 update. Firestore batch caps at 500 ops.
const CHUNK_SIZE = 400;

/**
 * 기존 status로부터 dealStage 값을 도출한다. 진입 전(pending/rejected)이면 null.
 */
const deriveDealStage = (data) => {
  if (data.status === 'sold') { return DEAL_STAGE.SOLD; }
  if (data.status === 'approved') {
    return data.isAdminOwned ? DEAL_STAGE.IN_STOCK : DEAL_STAGE.LISTED;
  }
  return null;
};

/**
 * Backfill dealStage on all vehicle documents.
 * @returns {Promise<{success: boolean, migrated: number, skipped: number}>}
 */
export const migrateVehicleDealStage = async () => {
  try {
    logger.debug('🔄 Starting vehicle dealStage backfill...');

    const db = getFirestore();
    const vehiclesRef = collection(db, 'vehicles');
    const snapshot = await getDocs(vehiclesRef);

    logger.debug(`📊 Found ${snapshot.size} vehicle documents`);

    const toMigrate = snapshot.docs.filter((d) => {
      const data = d.data();
      return !data.dealStage && deriveDealStage(data) !== null;
    });

    let migratedCount = 0;
    const skippedCount = snapshot.size - toMigrate.length;

    for (let i = 0; i < toMigrate.length; i += CHUNK_SIZE) {
      const chunk = toMigrate.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      chunk.forEach((d) => {
        batch.update(d.ref, {
          dealStage: deriveDealStage(d.data()),
          updatedAt: serverTimestamp(),
        });
        migratedCount++;
      });

      await batch.commit();
      logger.debug(`   committed ${Math.min(i + CHUNK_SIZE, toMigrate.length)}/${toMigrate.length}`);
    }

    logger.debug(`✅ dealStage backfill complete: migrated ${migratedCount}, skipped ${skippedCount}`);
    return { success: true, migrated: migratedCount, skipped: skippedCount };
  } catch (error) {
    logger.error('❌ dealStage backfill failed:', error);
    throw error;
  }
};

export default migrateVehicleDealStage;
