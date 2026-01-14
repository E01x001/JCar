/**
 * useConsultationStats Hook
 *
 * Fetches consultation request data from Firestore in real-time and calculates
 * aggregate statistics for total count and status breakdowns.
 */

import { useState, useEffect, useContext } from 'react';
import firestore from '@react-native-firebase/firestore';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook to fetch and calculate consultation statistics in real-time
 * Separates statistics for buy and sell consultations
 *
 * @returns {Object} stats - Consultation statistics object
 * @returns {Object} stats.buy - Buy consultation statistics
 * @returns {number} stats.buy.total - Total number of buy consultations
 * @returns {number} stats.buy.pending - Number of pending buy consultations
 * @returns {number} stats.buy.approved - Number of approved buy consultations
 * @returns {number} stats.buy.rejected - Number of rejected buy consultations
 * @returns {number} stats.buy.completed - Number of completed buy consultations
 * @returns {Object} stats.sell - Sell consultation statistics
 * @returns {number} stats.sell.total - Total number of sell consultations
 * @returns {number} stats.sell.pending - Number of pending sell consultations
 * @returns {number} stats.sell.approved - Number of approved sell consultations
 * @returns {number} stats.sell.rejected - Number of rejected sell consultations
 * @returns {number} stats.sell.completed - Number of completed sell consultations
 * @returns {boolean} stats.loading - Loading state
 */
const useConsultationStats = () => {
  const { user, role } = useContext(AuthContext);
  const [stats, setStats] = useState({
    buy: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    },
    sell: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    },
    loading: true,
  });

  useEffect(() => {
    // Don't fetch stats if user is not authenticated or not admin
    if (!user || role !== 'admin') {
      setStats({
        buy: {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          completed: 0,
        },
        sell: {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          completed: 0,
        },
        loading: false,
      });
      return () => {};
    }

    const unsubscribe = firestore()
      .collection('consultation_requests')
      .onSnapshot(
        (snapshot) => {
          // Calculate statistics from snapshot - separated by type
          const buyStats = {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            completed: 0,
          };
          const sellStats = {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            completed: 0,
          };

          snapshot.forEach((doc) => {
            const data = doc.data();
            const status = data.consultationStatus;
            const type = data.type; // 'buy' or 'sell'

            // Determine which stats object to update
            const targetStats = type === 'buy' ? buyStats : sellStats;

            targetStats.total++;

            if (status === 'pending') {
              targetStats.pending++;
            } else if (status === 'approved') {
              targetStats.approved++;
            } else if (status === 'rejected') {
              targetStats.rejected++;
            } else if (status === 'completed') {
              targetStats.completed++;
            }
          });

          setStats({
            buy: buyStats,
            sell: sellStats,
            loading: false,
          });
        },
        (error) => {
          console.error('useConsultationStats: Failed to fetch consultation statistics', error);
          reportCrashlyticsError(error);
          logCrashlyticsMessage('useConsultationStats: Firestore query failed');

          // Set loading to false even on error
          setStats((prev) => ({
            ...prev,
            loading: false,
          }));
        }
      );

    return () => unsubscribe();
  }, [user, role]);

  return stats;
};

export default useConsultationStats;
