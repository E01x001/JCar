/**
 * useConsultationStats Hook
 *
 * Fetches consultation request data from Firestore in real-time and calculates
 * aggregate statistics for total count and status breakdowns.
 */

import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import crashlytics from '@react-native-firebase/crashlytics';

/**
 * Custom hook to fetch and calculate consultation statistics in real-time
 *
 * @returns {Object} stats - Consultation statistics object
 * @returns {number} stats.total - Total number of consultations
 * @returns {number} stats.pending - Number of pending consultations
 * @returns {number} stats.approved - Number of approved consultations
 * @returns {number} stats.rejected - Number of rejected consultations
 * @returns {number} stats.completed - Number of completed consultations
 * @returns {boolean} stats.loading - Loading state
 */
const useConsultationStats = () => {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('consultation_requests')
      .onSnapshot(
        (snapshot) => {
          // Calculate statistics from snapshot
          let total = 0;
          let pending = 0;
          let approved = 0;
          let rejected = 0;
          let completed = 0;

          snapshot.docs.forEach((doc) => {
            total++;
            const data = doc.data();
            const status = data.status;

            if (status === 'pending') {
              pending++;
            } else if (status === 'approved') {
              approved++;
            } else if (status === 'rejected') {
              rejected++;
            } else if (status === 'completed') {
              completed++;
            }
          });

          setStats({
            total,
            pending,
            approved,
            rejected,
            completed,
            loading: false,
          });
        },
        (error) => {
          console.error('useConsultationStats: Failed to fetch consultation statistics', error);
          crashlytics().recordError(error);
          crashlytics().log('useConsultationStats: Firestore query failed');

          // Set loading to false even on error
          setStats((prev) => ({
            ...prev,
            loading: false,
          }));
        }
      );

    return () => unsubscribe();
  }, []);

  return stats;
};

export default useConsultationStats;
