/**
 * Ownership Transfer Service
 *
 * Handles atomic vehicle ownership transfers using Firestore transactions.
 * This service ensures data consistency across vehicles, ownership_transfers,
 * and consultation_requests collections.
 *
 * Task 60: Enhanced with Analytics and Performance monitoring
 * Migrated to React Native Firebase Modular API (v22+)
 *
 * @see src/types/FIRESTORE_SCHEMA.md for schema documentation
 */

import { getFirestore, collection, doc, runTransaction, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp, arrayUnion } from '@react-native-firebase/firestore';
import { reportCrashlyticsError, logCrashlyticsMessage } from './notification/notificationService';
import analytics from '@react-native-firebase/analytics';
import perf from '@react-native-firebase/perf';

/**
 * Transfer vehicle ownership from seller to admin
 *
 * This transaction performs the following atomic operations:
 * 1. Validates vehicle and consultation documents exist
 * 2. Verifies seller owns the vehicle
 * 3. Creates ownership_transfers record
 * 4. Updates vehicle: currentOwnerId → admin, isAdminOwned → true
 * 5. Archives consultation request
 *
 * @param {string} vehicleId - Vehicle document ID
 * @param {string} sellerId - Current owner's UID (for validation)
 * @param {string} consultationRequestId - Consultation document ID
 * @param {string} adminId - Admin user's UID
 * @param {number} price - Transfer price in KRW
 * @returns {Promise<{success: boolean, transferId?: string, error?: Error}>}
 *
 * @throws {Error} If vehicle doesn't exist
 * @throws {Error} If seller is not the current owner
 * @throws {Error} If consultation is already archived/completed
 * @throws {Error} If transaction fails
 */
export const transferVehicleToAdmin = async (
  vehicleId,
  sellerId,
  consultationRequestId,
  adminId,
  price
) => {
  // Task 60: Start Performance monitoring trace
  const trace = await perf().startTrace('transfer_vehicle_to_admin');
  const startTime = Date.now();

  try {
    console.log('🔄 Starting transferVehicleToAdmin transaction', {
      vehicleId,
      sellerId,
      consultationRequestId,
      adminId,
      price,
    });

    // Task 60: Log Analytics event - transfer initiated
    await analytics().logEvent('ownership_transfer_initiated', {
      transfer_type: 'sell_to_admin',
      vehicle_id: vehicleId,
      consultation_id: consultationRequestId,
      price: price || 0,
      seller_id: sellerId,
      admin_id: adminId,
    });

    // Generate transfer ID before transaction
    const db = getFirestore();
    const transfersCol = collection(db, 'ownership_transfers');
    const transferRef = doc(transfersCol);
    const transferId = transferRef.id;

    await runTransaction(db, async (transaction) => {
      // Document references
      const vehicleRef = doc(db, 'vehicles', vehicleId);
      const consultationRef = doc(db, 'consultation_requests', consultationRequestId);

      // Read phase: Get current document states
      const vehicleDoc = await transaction.get(vehicleRef);
      const consultationDoc = await transaction.get(consultationRef);

      // Validation: Vehicle exists
      if (!vehicleDoc.exists()) {
        throw new Error(`차량을 찾을 수 없습니다 (ID: ${vehicleId})`);
      }

      // Validation: Consultation exists
      if (!consultationDoc.exists()) {
        throw new Error(
          `상담 요청을 찾을 수 없습니다 (ID: ${consultationRequestId})`
        );
      }

      const vehicleData = vehicleDoc.data();
      const consultationData = consultationDoc.data();

      // Validation: Seller is current owner
      // Check both currentOwnerId (new field) and sellerId (legacy field)
      const currentOwner = vehicleData.currentOwnerId || vehicleData.sellerId;
      if (currentOwner !== sellerId) {
        throw new Error(
          `소유권 검증 실패: 현재 소유자(${currentOwner})가 판매자(${sellerId})와 일치하지 않습니다`
        );
      }

      // Validation: Consultation not already archived/completed
      if (
        consultationData.consultationStatus === 'archived' ||
        consultationData.consultationStatus === 'completed'
      ) {
        throw new Error(
          `이미 처리된 상담입니다 (상태: ${consultationData.consultationStatus})`
        );
      }

      // Write phase: Create ownership transfer record
      const ownershipTransferData = {
        transferId,
        vehicleId,
        consultationId: consultationRequestId,
        fromUserId: sellerId,
        toUserId: null, // null indicates transfer to admin
        transferType: 'sell_to_admin',
        transferredAt: serverTimestamp(),
        price: price || consultationData.dealAmount || 0,
        notes: `Transferred via consultation ${consultationRequestId}`,
      };

      transaction.set(transferRef, ownershipTransferData);

      // Write phase: Update vehicle ownership
      const ownershipHistoryEntry = {
        transferId,
        transferredAt: serverTimestamp(),
        fromUserId: sellerId,
        toUserId: null,
        transferType: 'sell_to_admin',
        price: ownershipTransferData.price,
      };

      transaction.update(vehicleRef, {
        currentOwnerId: adminId,
        isAdminOwned: true,
        availableForPurchase: true,
        ownershipHistory: arrayUnion(ownershipHistoryEntry),
        updatedAt: serverTimestamp(),
      });

      // Write phase: Archive consultation and mark as transferred
      transaction.update(consultationRef, {
        consultationStatus: 'archived',
        isOwnershipTransferred: true,
        transferId,
        archivedAt: serverTimestamp(),
      });

      console.log('✅ transferVehicleToAdmin transaction completed', {
        transferId,
        vehicleId,
        consultationRequestId,
      });
    });

    // Task 60: Create audit log entry
    const duration = Date.now() - startTime;
    const auditLogsRef = collection(db, 'ownership_transfer_audit_logs');
    await addDoc(auditLogsRef, {
      transferId,
      transferType: 'sell_to_admin',
      vehicleId,
      consultationId: consultationRequestId,
      fromUserId: sellerId,
      toUserId: null,
      adminId,
      price: price || 0,
      status: 'completed',
      duration,
      timestamp: serverTimestamp(),
      metadata: {
        initiatedBy: adminId,
        completedAt: new Date().toISOString(),
      },
    });

    // Task 60: Log Analytics event - transfer completed
    await analytics().logEvent('ownership_transfer_completed', {
      transfer_type: 'sell_to_admin',
      vehicle_id: vehicleId,
      consultation_id: consultationRequestId,
      transfer_id: transferId,
      price: price || 0,
      duration_ms: duration,
      success: true,
    });

    // Task 60: Stop Performance trace
    trace.putMetric('duration_ms', duration);
    trace.putAttribute('transfer_type', 'sell_to_admin');
    trace.putAttribute('vehicle_id', vehicleId);
    await trace.stop();

    return {
      success: true,
      transferId,
    };
  } catch (error) {
    console.error('❌ transferVehicleToAdmin failed:', error);

    // Task 60: Create audit log entry for failure
    const duration = Date.now() - startTime;
    try {
      const errorDb = getFirestore();
      const auditLogsRef = collection(errorDb, 'ownership_transfer_audit_logs');
      await addDoc(auditLogsRef, {
        transferType: 'sell_to_admin',
        vehicleId,
        consultationId: consultationRequestId,
        fromUserId: sellerId,
        toUserId: null,
        adminId,
        price: price || 0,
        status: 'failed',
        duration,
        error: {
          message: error.message,
          code: error.code,
        },
        timestamp: serverTimestamp(),
        metadata: {
          initiatedBy: adminId,
          failedAt: new Date().toISOString(),
        },
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    // Task 60: Log Analytics event - transfer failed
    await analytics().logEvent('ownership_transfer_failed', {
      transfer_type: 'sell_to_admin',
      vehicle_id: vehicleId,
      consultation_id: consultationRequestId,
      error_code: error.code || 'unknown',
      error_message: error.message,
      duration_ms: duration,
    });

    // Task 60: Stop Performance trace with error
    trace.putMetric('duration_ms', duration);
    trace.putAttribute('transfer_type', 'sell_to_admin');
    trace.putAttribute('error', 'true');
    trace.putAttribute('error_code', error.code || 'unknown');
    await trace.stop();

    // Log to Crashlytics
    reportCrashlyticsError(error);
    logCrashlyticsMessage(
      `transferVehicleToAdmin failed for vehicle ${vehicleId}, consultation ${consultationRequestId}`
    );

    // Return user-friendly error
    return {
      success: false,
      error: {
        message:
          error.message || '차량 소유권 이전 중 오류가 발생했습니다. 다시 시도해 주세요.',
        code: error.code,
        details: error,
      },
    };
  }
};

/**
 * Transfer vehicle ownership from admin to buyer
 *
 * This transaction performs the following atomic operations:
 * 1. Validates vehicle and consultation documents exist
 * 2. Verifies admin owns the vehicle (isAdminOwned = true)
 * 3. Creates ownership_transfers record
 * 4. Updates vehicle: currentOwnerId → buyer, isAdminOwned → false, status → sold
 * 5. Archives consultation request
 *
 * @param {string} vehicleId - Vehicle document ID
 * @param {string} adminId - Admin user's UID (for validation)
 * @param {string} buyerId - Buyer's UID
 * @param {string} consultationRequestId - Consultation document ID
 * @param {number} soldPrice - Sale price in KRW
 * @returns {Promise<{success: boolean, transferId?: string, error?: Error}>}
 *
 * @throws {Error} If vehicle doesn't exist
 * @throws {Error} If vehicle is not admin-owned
 * @throws {Error} If consultation is already archived/completed
 * @throws {Error} If transaction fails
 */
export const transferVehicleToBuyer = async (
  vehicleId,
  adminId,
  buyerId,
  consultationRequestId,
  soldPrice
) => {
  // Task 60: Start Performance monitoring trace
  const trace = await perf().startTrace('transfer_vehicle_to_buyer');
  const startTime = Date.now();

  try {
    console.log('🔄 Starting transferVehicleToBuyer transaction', {
      vehicleId,
      adminId,
      buyerId,
      consultationRequestId,
      soldPrice,
    });

    // Validate soldPrice
    if (!soldPrice || soldPrice < 0) {
      throw new Error('판매 가격이 유효하지 않습니다');
    }

    // Task 60: Log Analytics event - transfer initiated
    await analytics().logEvent('ownership_transfer_initiated', {
      transfer_type: 'admin_to_buyer',
      vehicle_id: vehicleId,
      consultation_id: consultationRequestId,
      price: soldPrice,
      buyer_id: buyerId,
      admin_id: adminId,
    });

    // Generate transfer ID before transaction
    const db = getFirestore();
    const transfersCol = collection(db, 'ownership_transfers');
    const transferRef = doc(transfersCol);
    const transferId = transferRef.id;

    await runTransaction(db, async (transaction) => {
      // Document references
      const vehicleRef = doc(db, 'vehicles', vehicleId);
      const consultationRef = doc(db, 'consultation_requests', consultationRequestId);

      // Read phase: Get current document states
      const vehicleDoc = await transaction.get(vehicleRef);
      const consultationDoc = await transaction.get(consultationRef);

      // Validation: Vehicle exists
      if (!vehicleDoc.exists()) {
        throw new Error(`차량을 찾을 수 없습니다 (ID: ${vehicleId})`);
      }

      // Validation: Consultation exists
      if (!consultationDoc.exists()) {
        throw new Error(
          `상담 요청을 찾을 수 없습니다 (ID: ${consultationRequestId})`
        );
      }

      const vehicleData = vehicleDoc.data();
      const consultationData = consultationDoc.data();

      // Validation: Vehicle is admin-owned
      if (!vehicleData.isAdminOwned) {
        throw new Error(
          `관리자 소유 차량이 아닙니다 (isAdminOwned: ${vehicleData.isAdminOwned})`
        );
      }

      // Validation: Current owner is admin
      if (vehicleData.currentOwnerId !== adminId) {
        throw new Error(
          `현재 소유자가 관리자가 아닙니다 (currentOwnerId: ${vehicleData.currentOwnerId})`
        );
      }

      // Validation: Consultation not already archived/completed
      if (
        consultationData.consultationStatus === 'archived' ||
        consultationData.consultationStatus === 'completed'
      ) {
        throw new Error(
          `이미 처리된 상담입니다 (상태: ${consultationData.consultationStatus})`
        );
      }

      // Write phase: Create ownership transfer record
      const ownershipTransferData = {
        transferId,
        vehicleId,
        consultationId: consultationRequestId,
        fromUserId: null, // null indicates transfer from admin
        toUserId: buyerId,
        transferType: 'admin_to_buyer',
        transferredAt: serverTimestamp(),
        price: soldPrice,
        notes: `Sold to buyer via consultation ${consultationRequestId}`,
      };

      transaction.set(transferRef, ownershipTransferData);

      // Write phase: Update vehicle ownership and mark as sold
      const ownershipHistoryEntry = {
        transferId,
        transferredAt: serverTimestamp(),
        fromUserId: null,
        toUserId: buyerId,
        transferType: 'admin_to_buyer',
        price: soldPrice,
      };

      transaction.update(vehicleRef, {
        currentOwnerId: buyerId,
        isAdminOwned: false,
        status: 'sold',
        availableForPurchase: false,
        ownershipHistory: arrayUnion(ownershipHistoryEntry),
        soldAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Write phase: Archive consultation and mark as transferred
      transaction.update(consultationRef, {
        consultationStatus: 'archived',
        isOwnershipTransferred: true,
        transferId,
        dealAmount: soldPrice,
        archivedAt: serverTimestamp(),
      });

      console.log('✅ transferVehicleToBuyer transaction completed', {
        transferId,
        vehicleId,
        buyerId,
        consultationRequestId,
      });
    });

    // Task 60: Create audit log entry
    const duration = Date.now() - startTime;
    const auditLogsRef = collection(db, 'ownership_transfer_audit_logs');
    await addDoc(auditLogsRef, {
      transferId,
      transferType: 'admin_to_buyer',
      vehicleId,
      consultationId: consultationRequestId,
      fromUserId: null,
      toUserId: buyerId,
      adminId,
      price: soldPrice,
      status: 'completed',
      duration,
      timestamp: serverTimestamp(),
      metadata: {
        initiatedBy: adminId,
        completedAt: new Date().toISOString(),
      },
    });

    // Task 60: Log Analytics event - transfer completed
    await analytics().logEvent('ownership_transfer_completed', {
      transfer_type: 'admin_to_buyer',
      vehicle_id: vehicleId,
      consultation_id: consultationRequestId,
      transfer_id: transferId,
      price: soldPrice,
      duration_ms: duration,
      success: true,
    });

    // Task 60: Stop Performance trace
    trace.putMetric('duration_ms', duration);
    trace.putAttribute('transfer_type', 'admin_to_buyer');
    trace.putAttribute('vehicle_id', vehicleId);
    await trace.stop();

    return {
      success: true,
      transferId,
    };
  } catch (error) {
    console.error('❌ transferVehicleToBuyer failed:', error);

    // Task 60: Create audit log entry for failure
    const duration = Date.now() - startTime;
    try {
      const errorDb = getFirestore();
      const auditLogsRef = collection(errorDb, 'ownership_transfer_audit_logs');
      await addDoc(auditLogsRef, {
        transferType: 'admin_to_buyer',
        vehicleId,
        consultationId: consultationRequestId,
        fromUserId: null,
        toUserId: buyerId,
        adminId,
        price: soldPrice || 0,
        status: 'failed',
        duration,
        error: {
          message: error.message,
          code: error.code,
        },
        timestamp: serverTimestamp(),
        metadata: {
          initiatedBy: adminId,
          failedAt: new Date().toISOString(),
        },
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    // Task 60: Log Analytics event - transfer failed
    await analytics().logEvent('ownership_transfer_failed', {
      transfer_type: 'admin_to_buyer',
      vehicle_id: vehicleId,
      consultation_id: consultationRequestId,
      error_code: error.code || 'unknown',
      error_message: error.message,
      duration_ms: duration,
    });

    // Task 60: Stop Performance trace with error
    trace.putMetric('duration_ms', duration);
    trace.putAttribute('transfer_type', 'admin_to_buyer');
    trace.putAttribute('error', 'true');
    trace.putAttribute('error_code', error.code || 'unknown');
    await trace.stop();

    // Log to Crashlytics
    reportCrashlyticsError(error);
    logCrashlyticsMessage(
      `transferVehicleToBuyer failed for vehicle ${vehicleId}, consultation ${consultationRequestId}, buyer ${buyerId}`
    );

    // Return user-friendly error
    return {
      success: false,
      error: {
        message:
          error.message || '차량 판매 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
        code: error.code,
        details: error,
      },
    };
  }
};

/**
 * Get ownership transfer history for a vehicle
 *
 * @param {string} vehicleId - Vehicle document ID
 * @returns {Promise<Array>} Array of ownership transfer records
 */
export const getVehicleOwnershipHistory = async (vehicleId) => {
  try {
    const db = getFirestore();
    const transfersRef = collection(db, 'ownership_transfers');
    const q = query(
      transfersRef,
      where('vehicleId', '==', vehicleId),
      orderBy('transferredAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Failed to get ownership history:', error);
    reportCrashlyticsError(error);
    return [];
  }
};

/**
 * Get all ownership transfers (admin only)
 *
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} Array of ownership transfer records
 */
export const getAllOwnershipTransfers = async (limitCount = 50) => {
  try {
    const db = getFirestore();
    const transfersRef = collection(db, 'ownership_transfers');
    const q = query(
      transfersRef,
      orderBy('transferredAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Failed to get ownership transfers:', error);
    reportCrashlyticsError(error);
    return [];
  }
};
