/**
 * useVehicleStats Hook (Phase 2 — Firestore → Supabase)
 *
 * 차량 통계(전체/상태별)를 조회하고, realtime 변경 시 재조회한다.
 */

import { useState, useEffect, useContext } from 'react';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabase';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { AuthContext } from '../context/AuthContext';

const EMPTY = { total: 0, pending: 0, approved: 0, rejected: 0 };

/**
 * Custom hook to fetch and calculate vehicle statistics in real-time
 * @returns {{total: number, pending: number, approved: number, rejected: number, loading: boolean}}
 */
const useVehicleStats = () => {
  const { user, role } = useContext(AuthContext);
  const [stats, setStats] = useState({ ...EMPTY, loading: true });

  useEffect(() => {
    if (!user || role !== 'admin') {
      setStats({ ...EMPTY, loading: false });
      return () => {};
    }

    let disposed = false;
    let timer = null;

    const countByStatus = async (status) => {
      let query = supabase.from('vehicles').select('id', { count: 'exact', head: true });
      if (status) { query = query.eq('status', status); }
      const { count, error } = await query;
      if (error) { throw error; }
      return count ?? 0;
    };

    const load = async () => {
      try {
        const [total, pending, approved, rejected] = await Promise.all([
          countByStatus(null),
          countByStatus('pending'),
          countByStatus('approved'),
          countByStatus('rejected'),
        ]);
        if (!disposed) {
          setStats({ total, pending, approved, rejected, loading: false });
        }
      } catch (error) {
        logger.error('useVehicleStats: Failed to fetch vehicle statistics', error);
        reportCrashlyticsError(error);
        logCrashlyticsMessage('useVehicleStats: Supabase query failed');
        if (!disposed) {
          setStats((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    const scheduleReload = () => {
      if (timer) { clearTimeout(timer); }
      timer = setTimeout(load, 300);
    };

    load();

    const channel = supabase
      .channel(`vehicle-stats-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, scheduleReload)
      .subscribe();

    return () => {
      disposed = true;
      if (timer) { clearTimeout(timer); }
      supabase.removeChannel(channel);
    };
  }, [user, role]);

  return stats;
};

export default useVehicleStats;
