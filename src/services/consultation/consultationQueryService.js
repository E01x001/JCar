/**
 * Consultation Query Service (Phase 2c — Firestore → Supabase)
 *
 * 관리자 상담 탭용 조회/구독. RLS상 이 쿼리들은 관리자에게만 전체가 반환된다.
 * 구독은 postgres_changes 수신 → 디바운스 재조회(coarse refetch) 방식.
 */
import { supabase } from '../../lib/supabase';
import { consultationRowToApp, rowToApp } from '../../lib/mappers';
import { CONSULTATION_STATUS } from '../../constants';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../notification/notificationService';
import { logger } from '../../utils/logger';

const ACTIVE_STATUSES = ['pending', 'approved', 'confirmed', 'on-hold', 'rejected'];

const makeSubscription = (refetchFn, callback, channelKey) => {
  let disposed = false;
  let timer = null;
  const load = async () => {
    try {
      const list = await refetchFn();
      if (!disposed) { callback(list); }
    } catch (error) {
      logger.error(`상담 조회 오류(${channelKey}):`, error);
    }
  };
  const scheduleReload = () => {
    if (timer) { clearTimeout(timer); }
    timer = setTimeout(load, 300);
  };
  load();
  const channel = supabase
    .channel(`${channelKey}-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'consultation_requests' }, scheduleReload)
    .subscribe();
  return () => {
    disposed = true;
    if (timer) { clearTimeout(timer); }
    supabase.removeChannel(channel);
  };
};

const fetchByType = async (type) => {
  const { data, error } = await supabase
    .from('consultation_requests')
    .select('*')
    .eq('type', type)
    .in('consultation_status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) { throw error; }
  return data.map(consultationRowToApp);
};

/** 구매 상담 실시간 구독 (관리자) — @returns unsubscribe */
export const subscribeToBuyConsultations = (callback) =>
  makeSubscription(() => fetchByType('buy'), callback, 'admin-buy');

/** 판매 상담 실시간 구독 (관리자) — @returns unsubscribe */
export const subscribeToSellConsultations = (callback) =>
  makeSubscription(() => fetchByType('sell'), callback, 'admin-sell');

/** 완료 상담 실시간 구독 (관리자) — @returns unsubscribe */
export const subscribeToCompletedConsultations = (callback) =>
  makeSubscription(async () => {
    const { data, error } = await supabase
      .from('consultation_requests')
      .select('*')
      .in('consultation_status', [CONSULTATION_STATUS.COMPLETED, CONSULTATION_STATUS.ARCHIVED])
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(300);
    if (error) { throw error; }
    return data.map(consultationRowToApp);
  }, callback, 'admin-completed');

/**
 * 완료 상담 페이지네이션 조회.
 * 기존 시그니처 유지 — Firestore 커서(startAfterDoc/lastVisibleDoc) 자리는
 * 이제 숫자 오프셋으로 사용한다(호출부는 반환값을 그대로 되돌려주므로 무수정 호환).
 * @returns {Promise<{consultations: Array, lastVisibleDoc: number|null, hasMore: boolean}>}
 */
export const fetchCompletedConsultationsPaginated = async ({
  limit: pageLimit = 50,
  startAfterDoc = null,
  monthFilter = 'all',
  typeFilter = 'all',
} = {}) => {
  try {
    const offset = typeof startAfterDoc === 'number' ? startAfterDoc : 0;

    let query = supabase
      .from('consultation_requests')
      .select('*')
      .in('consultation_status', [CONSULTATION_STATUS.COMPLETED, CONSULTATION_STATUS.ARCHIVED]);

    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }

    if (monthFilter !== 'all') {
      const [year, month] = monthFilter.split('-').map(Number);
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
      query = query.gte('completed_at', start).lte('completed_at', end);
    }

    const { data, error } = await query
      .order('completed_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + pageLimit); // +1건으로 hasMore 판정

    if (error) { throw error; }

    const hasMore = data.length > pageLimit;
    const pageRows = hasMore ? data.slice(0, pageLimit) : data;

    return {
      consultations: pageRows.map(consultationRowToApp),
      lastVisibleDoc: pageRows.length > 0 ? offset + pageRows.length : null,
      hasMore,
    };
  } catch (error) {
    logger.error('거래완료 상담 페이지네이션 조회 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('fetchCompletedConsultationsPaginated failed');
    return { consultations: [], lastVisibleDoc: null, hasMore: false };
  }
};

/**
 * 관리자 매입 보유 차량 목록
 * @param {string|null} statusFilter - 'owned' | 'sold' | null(전체)
 * @returns {Promise<{success: boolean, vehicles: Array, error?: Error}>}
 */
export const getAdminOwnedVehicles = async (statusFilter = null) => {
  try {
    let query = supabase
      .from('admin_owned_vehicles')
      .select('*')
      .order('acquired_at', { ascending: false })
      .limit(300);
    if (statusFilter) { query = query.eq('status', statusFilter); }

    const { data, error } = await query;
    if (error) { throw error; }
    return { success: true, vehicles: data.map(rowToApp) };
  } catch (error) {
    logger.error('관리자 소유 차량 조회 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('getAdminOwnedVehicles failed');
    return { success: false, error, vehicles: [] };
  }
};
