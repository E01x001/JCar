/**
 * useOwnershipStats Hook
 *
 * Custom hook for fetching and calculating ownership transfer statistics.
 * Provides total transfer count and total transaction amount for a given date range.
 */

import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';

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

        // Build query
        let transfersQuery = firestore()
          .collection('ownership_transfers')
          .orderBy('transferredAt', 'desc');

        // Apply date filters if provided
        if (startDate) {
          const startTimestamp = firestore.Timestamp.fromDate(startDate);
          transfersQuery = transfersQuery.where('transferredAt', '>=', startTimestamp);
        }

        if (endDate) {
          // Set end date to end of day (23:59:59)
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          const endTimestamp = firestore.Timestamp.fromDate(endOfDay);
          transfersQuery = transfersQuery.where('transferredAt', '<=', endTimestamp);
        }

        // Execute query
        const snapshot = await transfersQuery.get();

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
        reportCrashlyticsError(err);
        logCrashlyticsMessage('useOwnershipStats failed');
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
