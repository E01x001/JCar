
/**
 * Consultation Store
 *
 * Centralized Zustand store for managing consultation data with caching.
 * Implements singleton pattern for Firestore listeners to prevent duplicate subscriptions.
 *
 * Features:
 * - Single onSnapshot listener per query
 * - 5-minute in-memory cache for consultation listings
 * - Automatic cache invalidation
 * - Shared state across components
 *
 * Task 84: Centralized State Management
 */

import {create} from 'zustand';
import {logger} from '../utils/logger';
// Phase 2c: Firestore → Supabase
import {supabase} from '../lib/supabase';
import {consultationRowToApp} from '../lib/mappers';

// 상담 행에 차량 썸네일을 얹는다.
// consultation_requests에는 vehicle_name만 있고 이미지가 없어, 목록의 썸네일 자리가
// 늘 비어 있었다. FK(consultation_requests.vehicle_id → vehicles.id)로 임베드해 가져온다.
// 차량이 RLS로 안 보이면 임베드가 null이 되고, 화면은 플레이스홀더로 떨어진다.
const withVehicleThumb = (row) => {
  const app = consultationRowToApp(row);
  const urls = row?.vehicles?.image_urls;
  return {
    ...app,
    vehicleImageUrl: Array.isArray(urls) ? (urls[0] ?? null) : urls ?? null,
  };
};

const CONSULTATION_SELECT = '*, vehicles(image_urls)';

// consultation_requests 재조회 헬퍼 (RLS: 본인/판매자/관리자 범위만 반환)
const fetchUserConsultations = async (userId) => {
  const {data, error} = await supabase
      .from('consultation_requests')
      .select(CONSULTATION_SELECT)
      .eq('user_id', userId)
      .order('created_at', {ascending: false})
      .limit(200);
  if (error) { throw error; }
  return data.map(withVehicleThumb);
};

const fetchAllConsultations = async () => {
  const {data, error} = await supabase
      .from('consultation_requests')
      .select(CONSULTATION_SELECT)
      .order('created_at', {ascending: false})
      .limit(500);
  if (error) { throw error; }
  return data.map(withVehicleThumb);
};

// consultation_requests 테이블용 realtime refetch 구독
const subscribeConsultations = (refetchFn, callback, channelKey) => {
  let disposed = false;
  let timer = null;
  const load = async () => {
    try {
      const list = await refetchFn();
      if (!disposed) { callback(list); }
    } catch (error) {
      logger.error('상담 조회 오류:', error);
    }
  };
  const scheduleReload = () => {
    if (timer) { clearTimeout(timer); }
    timer = setTimeout(load, 300);
  };
  load();
  const channel = supabase
      .channel(`${channelKey}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', {event: '*', schema: 'public', table: 'consultation_requests'}, scheduleReload)
      .subscribe();
  return () => {
    disposed = true;
    if (timer) { clearTimeout(timer); }
    supabase.removeChannel(channel);
  };
};

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {Array} data - Cached consultation data
 * @property {number} timestamp - Cache creation timestamp
 */

/**
 * Consultation Store State
 * @typedef {Object} ConsultationStore
 * @property {Array} userConsultations - User's consultations
 * @property {Array} allConsultations - All consultations (admin view)
 * @property {Object} consultationsCache - Cache for consultation listings
 * @property {boolean} loading - Loading state
 * @property {Error|null} error - Error state
 * @property {Object} unsubscribers - cacheKey별 Firestore 리스너 해제 함수 맵
 */

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const useConsultationStore = create((set, get) => ({
  // State
  userConsultations: [],
  allConsultations: [],
  consultationsCache: {}, // Cache key -> { data, timestamp }
  loading: false,
  error: null,
  // cacheKey → unsubscribe 함수 (vehicleStore와 동일 패턴 — 구독 공존 보장)
  unsubscribers: {},

  /**
   * Check if cache is valid
   * @param {string} cacheKey - Cache key to check
   * @return {boolean} True if cache is valid and not expired
   */
  isCacheValid: (cacheKey) => {
    const cache = get().consultationsCache[cacheKey];
    if (!cache) {return false;}

    const now = Date.now();
    const isExpired = now - cache.timestamp > CACHE_DURATION_MS;

    if (isExpired) {
      logger.debug(`🗑️ Consultation cache expired for key: ${cacheKey}`);
      return false;
    }

    logger.debug(
        `✅ Consultation cache hit for key: ${cacheKey} ` +
      `(age: ${Math.floor((now - cache.timestamp) / 1000)}s)`,
    );
    return true;
  },

  /**
   * Get cached data if valid
   * @param {string} cacheKey - Cache key to retrieve
   * @return {Array|null} Cached data or null if invalid/expired
   */
  getCachedData: (cacheKey) => {
    const store = get();
    if (store.isCacheValid(cacheKey)) {
      return store.consultationsCache[cacheKey].data;
    }
    return null;
  },

  /**
   * Set cache data
   * @param {string} cacheKey - Cache key
   * @param {Array} data - Data to cache
   */
  setCacheData: (cacheKey, data) => {
    set((state) => ({
      consultationsCache: {
        ...state.consultationsCache,
        [cacheKey]: {
          data,
          timestamp: Date.now(),
        },
      },
    }));
    logger.debug(`💾 Cached consultation data for key: ${cacheKey}`);
  },

  /**
   * Clear all cache
   */
  clearCache: () => {
    set({consultationsCache: {}});
    logger.debug('🗑️ All consultation cache cleared');
  },

  /**
   * Subscribe to user's consultations with caching
   * @param {string} userId - User ID to filter consultations
   */
  subscribeToUserConsultations: (userId) => {
    const store = get();
    const cacheKey = `user_consultations_${userId}`;

    // Check cache first
    const cachedData = store.getCachedData(cacheKey);
    if (cachedData) {
      set({
        userConsultations: cachedData,
        loading: false,
        error: null,
      });
      return;
    }

    // 같은 사용자(cacheKey)에 이미 구독 중이면 중복 생성하지 않는다
    if (store.unsubscribers[cacheKey]) {
      logger.debug('⚠️ Already subscribed to user consultations');
      return;
    }

    logger.debug(`🔥 Creating new Supabase listener for user ${userId} consultations`);
    set({loading: true, error: null});

    const unsubscribe = subscribeConsultations(
        () => fetchUserConsultations(userId),
        (consultationList) => {
          logger.debug(`✅ Received ${consultationList.length} user consultations`);
          set({userConsultations: consultationList, loading: false, error: null});
          get().setCacheData(cacheKey, consultationList);
        },
        'store-user-consultations',
    );

    set((state) => ({unsubscribers: {...state.unsubscribers, [cacheKey]: unsubscribe}}));
  },

  /**
   * Subscribe to all consultations (admin view) with caching
   */
  subscribeToAllConsultations: () => {
    const store = get();
    const cacheKey = 'all_consultations';

    // Check cache first
    const cachedData = store.getCachedData(cacheKey);
    if (cachedData) {
      set({
        allConsultations: cachedData,
        loading: false,
        error: null,
      });
      return;
    }

    // 같은 쿼리(cacheKey)에 이미 구독 중이면 중복 생성하지 않는다
    if (store.unsubscribers[cacheKey]) {
      logger.debug('⚠️ Already subscribed to all consultations');
      return;
    }

    logger.debug('🔥 Creating new Supabase listener for all consultations');
    set({loading: true, error: null});

    const unsubscribe = subscribeConsultations(
        fetchAllConsultations,
        (consultationList) => {
          logger.debug(`✅ Received ${consultationList.length} consultations`);
          set({allConsultations: consultationList, loading: false, error: null});
          get().setCacheData(cacheKey, consultationList);
        },
        'store-all-consultations',
    );

    set((state) => ({unsubscribers: {...state.unsubscribers, [cacheKey]: unsubscribe}}));
  },

  /**
   * Unsubscribe from Firestore listener
   */
  unsubscribeFromConsultations: (cacheKey) => {
    const {unsubscribers} = get();
    const keys = cacheKey ? [cacheKey] : Object.keys(unsubscribers);
    if (keys.length === 0) {return;}
    logger.debug(`🔴 Unsubscribing consultation listeners: ${keys.join(', ')}`);
    const next = {...unsubscribers};
    keys.forEach((key) => {
      if (next[key]) {
        next[key]();
        delete next[key];
      }
    });
    set({unsubscribers: next});
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    const {unsubscribers} = get();
    Object.values(unsubscribers).forEach((fn) => fn && fn());
    set({
      userConsultations: [],
      allConsultations: [],
      consultationsCache: {},
      loading: false,
      error: null,
      unsubscribers: {},
    });
  },

  /**
   * Task 106.2: Optimistic UI Updates
   * Add a consultation optimistically (before Firestore confirmation)
   * @param {Object} consultationData - Consultation data to add
   * @param {string} tempId - Temporary ID for optimistic consultation
   */
  addOptimisticConsultation: (consultationData, tempId) => {
    const optimisticConsultation = {
      ...consultationData,
      id: tempId,
      _optimistic: true,
      _tempId: tempId,
    };

    set((state) => ({
      userConsultations: [optimisticConsultation, ...state.userConsultations],
    }));

    logger.debug(`✨ Added optimistic consultation with temp ID: ${tempId}`);
  },

  /**
   * Remove optimistic consultation (on write failure)
   * @param {string} tempId - Temporary ID to remove
   */
  removeOptimisticConsultation: (tempId) => {
    set((state) => ({
      userConsultations: state.userConsultations.filter(
          (c) => c._tempId !== tempId,
      ),
    }));

    logger.debug(`❌ Removed optimistic consultation: ${tempId}`);
  },

  /**
   * Clear cache for user consultations to force refresh after optimistic add
   * @param {string} userId - User ID
   */
  invalidateUserConsultationsCache: (userId) => {
    const cacheKey = `user_consultations_${userId}`;
    set((state) => {
      const newCache = {...state.consultationsCache};
      delete newCache[cacheKey];
      return {consultationsCache: newCache};
    });
    logger.debug(`🗑️ Invalidated cache for user consultations: ${userId}`);
  },
}));

export default useConsultationStore;
