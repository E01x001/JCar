/**
 * useOwnershipStats Hook
 *
 * Custom hook for fetching and calculating ownership transfer statistics.
 * Provides total transfer count and total transaction amount for a given date range.
 *
 * Migrated to React Native Firebase Modular API (v22+)
 */

import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, orderBy, getDocs, Timestamp } from '@react-native-firebase/firestore';
import crashlytics from '@react-native-firebase/crashlytics';

/**
 * Hook to fetch ownership transfer statistics
 *
 * @param {Date|null} startDate - Start date for filtering (inclusive)
 * @param {Date|null} endDate - End date for filtering (inclusive)
 * @returns {Object} Statistics object
 * @returns {number} return.totalTransfers - Total number of transfers
 * @returns {number} return.totalAmount - Total transaction amount (KRW)
 * @returns {boolean} return.loading - Loading state
 * @returns {Error|null} return.error - Error object if fetch failed
 */
const useOwnershipStats = (startDate = null, endDate = null) => {
  const [stats, setStats] = useState({
    totalTransfers: 0,
    totalAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('📊 Fetching ownership transfer stats', { startDate, endDate });

        // Get Firestore instance (Modular API)
        const db = getFirestore();
        const transfersRef = collection(db, 'ownership_transfers');

        // Build query constraints array
        const constraints = [orderBy('transferredAt', 'desc')];

        // Apply date filters if provided
        if (startDate) {
          const startTimestamp = Timestamp.fromDate(startDate);
          constraints.push(where('transferredAt', '>=', startTimestamp));
        }

        if (endDate) {
          // Set end date to end of day (23:59:59)
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          const endTimestamp = Timestamp.fromDate(endOfDay);
          constraints.push(where('transferredAt', '<=', endTimestamp));
        }

        // Build and execute query (Modular API)
        const q = query(transfersRef, ...constraints);
        const snapshot = await getDocs(q);

        // Calculate statistics
        let totalTransfers = 0;
        let totalAmount = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          totalTransfers++;
          totalAmount += data.price || 0;
        });

        setStats({
          totalTransfers,
          totalAmount,
        });

        console.log('✅ Ownership stats fetched', { totalTransfers, totalAmount });
      } catch (err) {
        console.error('❌ Failed to fetch ownership stats:', err);
        crashlytics().recordError(err);
        crashlytics().log('useOwnershipStats failed');
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [startDate, endDate]);

  return { ...stats, loading, error };
};

export default useOwnershipStats;
