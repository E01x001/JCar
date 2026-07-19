/**
 * useConsultationStats Hook (Phase 2 — Firestore → Supabase)
 *
 * 상담 요청 통계(구매/판매 × 상태별)를 조회하고, realtime 변경 시 재조회한다.
 */

import { useState, useEffect, useContext } from 'react';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabase';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { AuthContext } from '../context/AuthContext';

const EMPTY = { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0 };

/**
 * Custom hook to fetch and calculate consultation statistics in real-time
 * @returns {{buy: Object, sell: Object, loading: boolean}}
 */
const useConsultationStats = () => {
  const { user, role } = useContext(AuthContext);
  const [stats, setStats] = useState({
    buy: { ...EMPTY },
    sell: { ...EMPTY },
    loading: true,
  });

  useEffect(() => {
    if (!user || role !== 'admin') {
      setStats({ buy: { ...EMPTY }, sell: { ...EMPTY }, loading: false });
      return () => {};
    }

    let disposed = false;
    let timer = null;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('consultation_requests')
          .select('type, consultation_status')
          .limit(2000);
        if (error) { throw error; }

        const buyStats = { ...EMPTY };
        const sellStats = { ...EMPTY };
        for (const row of data) {
          const target = row.type === 'buy' ? buyStats : sellStats;
          target.total++;
          if (target[row.consultation_status] !== undefined) {
            target[row.consultation_status]++;
          }
        }

        if (!disposed) {
          setStats({ buy: buyStats, sell: sellStats, loading: false });
        }
      } catch (error) {
        logger.error('useConsultationStats: Failed to fetch consultation statistics', error);
        reportCrashlyticsError(error);
        logCrashlyticsMessage('useConsultationStats: Supabase query failed');
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
      .channel(`consultation-stats-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultation_requests' }, scheduleReload)
      .subscribe();

    return () => {
      disposed = true;
      if (timer) { clearTimeout(timer); }
      supabase.removeChannel(channel);
    };
  }, [user, role]);

  return stats;
};

export default useConsultationStats;
