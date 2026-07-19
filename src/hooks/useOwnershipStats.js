/**
 * useOwnershipStats Hook (Phase 2 — Firestore → Supabase)
 *
 * 기간별 소유권 이전 건수/총 거래액 통계.
 */

import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabase';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';

/**
 * Hook to fetch ownership transfer statistics
 * @param {Date|null} startDate - Start date for filtering (inclusive)
 * @param {Date|null} endDate - End date for filtering (inclusive)
 * @returns {{totalTransfers: number, totalAmount: number, loading: boolean, error: Error|null}}
 */
const useOwnershipStats = (startDate = null, endDate = null) => {
  const [stats, setStats] = useState({
    totalTransfers: 0,
    totalAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let disposed = false;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        logger.debug('📊 Fetching ownership transfer stats', { startDate, endDate });

        let query = supabase
          .from('ownership_transfers')
          .select('price')
          .order('transferred_at', { ascending: false });

        if (startDate) {
          query = query.gte('transferred_at', startDate.toISOString());
        }
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          query = query.lte('transferred_at', endOfDay.toISOString());
        }

        const { data, error: fetchError } = await query;
        if (fetchError) { throw fetchError; }

        const totalTransfers = data.length;
        const totalAmount = data.reduce((sum, row) => sum + (Number(row.price) || 0), 0);

        if (!disposed) {
          setStats({ totalTransfers, totalAmount });
        }
        logger.debug('✅ Ownership stats fetched', { totalTransfers, totalAmount });
      } catch (err) {
        logger.error('❌ Failed to fetch ownership stats:', err);
        reportCrashlyticsError(err);
        logCrashlyticsMessage('useOwnershipStats failed');
        if (!disposed) { setError(err); }
      } finally {
        if (!disposed) { setLoading(false); }
      }
    };

    fetchStats();
    return () => { disposed = true; };
  }, [startDate, endDate]);

  return { ...stats, loading, error };
};

export default useOwnershipStats;
