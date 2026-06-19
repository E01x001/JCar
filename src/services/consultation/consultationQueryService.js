/**
 * Consultation Query Service
 *
 * Handles consultation read operations including:
 * - Real-time subscriptions to consultations
 * - Fetching consultation data with pagination
 * - Querying admin-owned vehicles
 *
 * Task #88: Modular service refactoring
 */

import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  startAfter,
  limit,
} from '@react-native-firebase/firestore';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../notification/notificationService';
import { CONSULTATION_STATUS } from '../../constants';

/**
 * Subscribe to buy consultations in real-time
 * Task 86: Server-side type filtering instead of client-side
 * @param {Function} callback - Callback function with consultation array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToBuyConsultations = (callback) => {
  try {
    const db = getFirestore();
    const consultationsRef = collection(db, 'consultation_requests');
    const q = query(
      consultationsRef,
      where('type', '==', 'buy'),
      where('consultationStatus', 'in', [
        CONSULTATION_STATUS.PENDING,
        CONSULTATION_STATUS.CONFIRMED,
        CONSULTATION_STATUS.ON_HOLD,
        CONSULTATION_STATUS.REJECTED,
      ]),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const consultations = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }));
        callback(consultations);
      },
      (error) => {
        console.error('구매상담 구독 오류:', error);
        reportCrashlyticsError(error);
        logCrashlyticsMessage('subscribeToBuyConsultations failed');
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('구매상담 구독 설정 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('subscribeToBuyConsultations setup failed');
    return () => {};
  }
};

/**
 * Subscribe to sell consultations in real-time
 * Task 86: Server-side type filtering instead of client-side
 * @param {Function} callback - Callback function with consultation array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToSellConsultations = (callback) => {
  try {
    const db = getFirestore();
    const consultationsRef = collection(db, 'consultation_requests');
    const q = query(
      consultationsRef,
      where('type', '==', 'sell'),
      where('consultationStatus', 'in', [
        CONSULTATION_STATUS.PENDING,
        CONSULTATION_STATUS.CONFIRMED,
        CONSULTATION_STATUS.ON_HOLD,
        CONSULTATION_STATUS.REJECTED,
      ]),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const consultations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(consultations);
      },
      (error) => {
        console.error('판매상담 구독 오류:', error);
        reportCrashlyticsError(error);
        logCrashlyticsMessage('subscribeToSellConsultations failed');
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('판매상담 구독 설정 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('subscribeToSellConsultations setup failed');
    return () => {};
  }
};

/**
 * Subscribe to completed and archived consultations in real-time
 *
 * Performance Optimization (Task 56):
 * - Server-side orderBy removed to avoid redundant sorting
 * - Uses client-side sorting by archivedAt || completedAt for correct chronological order
 * - Client-side sorting is acceptable because:
 *   1. Small dataset: completed/archived consultations are typically limited
 *   2. Custom logic: sorting by archivedAt OR completedAt requires client-side processing
 *   3. Composite index: firestore.indexes.json includes consultationStatus + createdAt for efficient filtering
 *
 * Note: If dataset grows significantly (>1000 items), consider implementing server-side pagination
 *
 * Task 50: includes both 'completed' and 'archived' statuses
 *
 * @param {Function} callback - Function to call with consultation array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToCompletedConsultations = (callback) => {
  try {
    const db = getFirestore();
    const consultationsRef = collection(db, 'consultation_requests');
    const q = query(
      consultationsRef,
      where('consultationStatus', 'in', [CONSULTATION_STATUS.COMPLETED, CONSULTATION_STATUS.ARCHIVED])
      // No orderBy here - client-side sorting handles chronological order
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const consultations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Client-side sort by archivedAt or completedAt (most recent first)
        // This is necessary because consultations can have either field set
        consultations.sort((a, b) => {
          const aDate = a.archivedAt || a.completedAt;
          const bDate = b.archivedAt || b.completedAt;
          if (!aDate) {return 1;}  // Items without dates go to end
          if (!bDate) {return -1;} // Items without dates go to end
          return bDate.toMillis() - aDate.toMillis(); // Descending order
        });

        callback(consultations);
      },
      (error) => {
        console.error('거래완료 상담 구독 오류:', error);
        reportCrashlyticsError(error);
        logCrashlyticsMessage('subscribeToCompletedConsultations failed');
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('거래완료 상담 구독 설정 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('subscribeToCompletedConsultations setup failed');
    return () => {};
  }
};

/**
 * Fetch completed/archived consultations with pagination support
 *
 * Task 86: Migrated client-side filtering to server-side Firestore compound queries
 *
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of items per page (default: 50)
 * @param {Object} options.startAfterDoc - Firestore DocumentSnapshot for pagination cursor
 * @param {string} options.monthFilter - Month filter in 'YYYY-MM' format (optional)
 * @param {string} options.typeFilter - Consultation type filter: 'buy', 'sell', or 'all' (default: 'all')
 * @returns {Promise<{consultations: Array, lastVisibleDoc: Object, hasMore: boolean}>}
 */
export const fetchCompletedConsultationsPaginated = async ({
  limit: pageLimit = 50,
  startAfterDoc = null,
  monthFilter = 'all',
  typeFilter = 'all',
}) => {
  try {
    const db = getFirestore();
    const consultationsRef = collection(db, 'consultation_requests');

    const constraints = [
      where('consultationStatus', 'in', [CONSULTATION_STATUS.COMPLETED, CONSULTATION_STATUS.ARCHIVED]),
    ];

    // Task 86: Server-side type filtering
    if (typeFilter !== 'all') {
      constraints.push(where('type', '==', typeFilter));
    }

    // Task 86: Server-side month filtering using date range
    if (monthFilter !== 'all') {
      const [year, month] = monthFilter.split('-').map(Number);
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

      // Query using completedAt field (assuming consultations are completed before archived)
      // Note: This requires a composite index in Firestore
      constraints.push(where('completedAt', '>=', startOfMonth));
      constraints.push(where('completedAt', '<=', endOfMonth));
    }

    // Task 86: Server-side sorting by completedAt (most recent first)
    // Note: orderBy must come after where clauses
    constraints.push(orderBy('completedAt', 'desc'));

    // Apply pagination cursor
    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    // Apply limit + 1 to check if there are more results
    constraints.push(limit(pageLimit + 1));

    const q = query(consultationsRef, ...constraints);
    const snapshot = await getDocs(q);
    const docs = snapshot.docs;

    // Check if there are more results
    const hasMore = docs.length > pageLimit;

    // Remove the extra document if exists
    const consultationDocs = hasMore ? docs.slice(0, pageLimit) : docs;

    const consultations = consultationDocs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      _doc: doc, // Store document reference for pagination
    }));

    // Get last visible document for next page
    const lastVisibleDoc = consultationDocs.length > 0
      ? consultationDocs[consultationDocs.length - 1]
      : null;

    return {
      consultations,
      lastVisibleDoc,
      hasMore,
    };
  } catch (error) {
    console.error('거래완료 상담 페이지네이션 조회 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('fetchCompletedConsultationsPaginated failed');
    return {
      consultations: [],
      lastVisibleDoc: null,
      hasMore: false,
    };
  }
};

/**
 * Get admin-owned vehicles
 * @param {string} statusFilter - Status filter ('owned', 'sold', or null for all)
 * @returns {Promise<{success: boolean, vehicles: Array, error?: Error}>}
 */
export const getAdminOwnedVehicles = async (statusFilter = null) => {
  try {
    const db = getFirestore();
    const ownedVehiclesRef = collection(db, 'admin_owned_vehicles');

    const constraints = [orderBy('purchaseDate', 'desc')];
    if (statusFilter) {
      constraints.push(where('status', '==', statusFilter));
    }

    const q = query(ownedVehiclesRef, ...constraints);
    const snapshot = await getDocs(q);
    const vehicles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, vehicles };
  } catch (error) {
    console.error('관리자 소유 차량 조회 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('getAdminOwnedVehicles failed');
    return { success: false, error, vehicles: [] };
  }
};
