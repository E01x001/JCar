/**
 * useVehicleStats Hook
 *
 * Fetches vehicle data from Firestore in real-time and calculates aggregate statistics
 * for total count and status breakdowns.
 */

import { useState, useEffect, useContext } from 'react';
import firestore from '@react-native-firebase/firestore';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook to fetch and calculate vehicle statistics in real-time
 *
 * @returns {Object} stats - Vehicle statistics object
 * @returns {number} stats.total - Total number of vehicles
 * @returns {number} stats.pending - Number of pending vehicles
 * @returns {number} stats.approved - Number of approved vehicles
 * @returns {number} stats.rejected - Number of rejected vehicles
 * @returns {boolean} stats.loading - Loading state
 */
const useVehicleStats = () => {
  const { user, role } = useContext(AuthContext);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    loading: true,
  });

  useEffect(() => {
    // Don't fetch stats if user is not authenticated or not admin
    if (!user || role !== 'admin') {
      setStats({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        loading: false,
      });
      return () => {};
    }

    const unsubscribe = firestore()
      .collection('vehicles')
      .onSnapshot(
        (snapshot) => {
          // Calculate statistics from snapshot
          let total = 0;
          let pending = 0;
          let approved = 0;
          let rejected = 0;

          snapshot.forEach((doc) => {
            total++;
            const data = doc.data();
            const status = data.status;

            if (status === 'pending') {
              pending++;
            } else if (status === 'approved') {
              approved++;
            } else if (status === 'rejected') {
              rejected++;
            }
          });

          setStats({
            total,
            pending,
            approved,
            rejected,
            loading: false,
          });
        },
        (error) => {
          console.error('useVehicleStats: Failed to fetch vehicle statistics', error);
          reportCrashlyticsError(error);
          logCrashlyticsMessage('useVehicleStats: Firestore query failed');

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

export default useVehicleStats;
