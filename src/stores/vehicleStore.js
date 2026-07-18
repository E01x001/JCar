
/**
 * Vehicle Store
 *
 * Centralized Zustand store for managing vehicle data with caching.
 * Implements singleton pattern for Firestore listeners to prevent duplicate subscriptions.
 *
 * Features:
 * - Single onSnapshot listener per query
 * - 5-minute in-memory cache for vehicle listings
 * - Automatic cache invalidation
 * - Shared state across components
 *
 * Task 84: Centralized State Management
 */

import {create} from 'zustand';
import {logger} from '../utils/logger';
// Phase 2b: Firestore → Supabase (조회/구독은 supabaseVehicleService 경유)
import {
  fetchExposedVehicles,
  fetchMyVehicles,
  fetchAllVehicles,
  subscribeVehicles,
} from '../services/vehicle/supabaseVehicleService';

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {Array} data - Cached vehicle data
 * @property {number} timestamp - Cache creation timestamp
 */

/**
 * Vehicle Store State
 * @typedef {Object} VehicleStore
 * @property {Array} vehicles - All vehicles
 * @property {Array} approvedVehicles - Approved vehicles only
 * @property {Object} vehiclesCache - Cache for vehicle listings
 * @property {boolean} loading - Loading state
 * @property {Error|null} error - Error state
 * @property {Object} unsubscribers - cacheKey별 Firestore 리스너 해제 함수 맵
 */

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const useVehicleStore = create((set, get) => ({
  // State
  vehicles: [],
  approvedVehicles: [],
  vehiclesCache: {}, // Cache key -> { data, timestamp }
  loading: false,
  error: null,
  // cacheKey → unsubscribe 함수. 과거 단일 슬롯은 서로 다른 구독(관리자 전체 vs
  // 사용자 목록)이 공존하지 못하고 두 번째 구독이 조용히 무시되는 버그가 있었다.
  unsubscribers: {},

  /**
   * Check if cache is valid
   * @param {string} cacheKey - Cache key to check
   * @return {boolean} True if cache is valid and not expired
   */
  isCacheValid: (cacheKey) => {
    const cache = get().vehiclesCache[cacheKey];
    if (!cache) {return false;}

    const now = Date.now();
    const isExpired = now - cache.timestamp > CACHE_DURATION_MS;

    if (isExpired) {
      logger.debug(`🗑️ Cache expired for key: ${cacheKey}`);
      return false;
    }

    logger.debug(
        `✅ Cache hit for key: ${cacheKey} ` +
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
      return store.vehiclesCache[cacheKey].data;
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
      vehiclesCache: {
        ...state.vehiclesCache,
        [cacheKey]: {
          data,
          timestamp: Date.now(),
        },
      },
    }));
    logger.debug(`💾 Cached data for key: ${cacheKey}`);
  },

  /**
   * Clear all cache
   */
  clearCache: () => {
    set({vehiclesCache: {}});
    logger.debug('🗑️ All vehicle cache cleared');
  },

  /**
   * Subscribe to approved vehicles with caching
   * Uses singleton pattern to prevent duplicate listeners
   */
  subscribeToApprovedVehicles: () => {
    const store = get();
    const cacheKey = 'approved_vehicles';

    // Check cache first
    const cachedData = store.getCachedData(cacheKey);
    if (cachedData) {
      set({
        approvedVehicles: cachedData,
        loading: false,
        error: null,
      });
      return;
    }

    // 같은 쿼리(cacheKey)에 이미 구독 중이면 중복 생성하지 않는다
    if (store.unsubscribers[cacheKey]) {
      logger.debug('⚠️ Already subscribed to approved vehicles');
      return;
    }

    logger.debug('🔥 Creating new Supabase listener for approved vehicles');
    set({loading: true, error: null});

    const unsubscribe = subscribeVehicles(
        () => fetchExposedVehicles(),
        (vehicleList) => {
          logger.debug(`✅ Received ${vehicleList.length} approved vehicles`);
          set({approvedVehicles: vehicleList, loading: false, error: null});
          get().setCacheData(cacheKey, vehicleList);
        },
        {channelKey: 'store-approved'},
    );

    set((state) => ({unsubscribers: {...state.unsubscribers, [cacheKey]: unsubscribe}}));
  },

  /**
   * Subscribe to user's own vehicles (all statuses)
   * Used in MyPageScreen to show user's vehicles regardless of approval status
   * @param {string} userId - The user ID to filter by
   */
  subscribeToUserVehicles: (userId) => {
    const store = get();
    const cacheKey = `user_vehicles_${userId}`;

    // Check cache first
    const cachedData = store.getCachedData(cacheKey);
    if (cachedData) {
      set({
        vehicles: cachedData,
        loading: false,
        error: null,
      });
      return;
    }

    // 같은 사용자(cacheKey)에 이미 구독 중이면 중복 생성하지 않는다
    if (store.unsubscribers[cacheKey]) {
      logger.debug('⚠️ Already subscribed to user vehicles');
      return;
    }

    logger.debug('🔥 Creating new Supabase listener for user vehicles', userId);
    set({loading: true, error: null});

    const unsubscribe = subscribeVehicles(
        () => fetchMyVehicles(userId),
        (vehicleList) => {
          logger.debug(`✅ Received ${vehicleList.length} user vehicles`);
          set({vehicles: vehicleList, loading: false, error: null});
          get().setCacheData(cacheKey, vehicleList);
        },
        {channelKey: 'store-user'},
    );

    set((state) => ({unsubscribers: {...state.unsubscribers, [cacheKey]: unsubscribe}}));
  },

  /**
   * Subscribe to all vehicles (admin view)
   */
  subscribeToAllVehicles: () => {
    const store = get();
    const cacheKey = 'all_vehicles';

    // Check cache first
    const cachedData = store.getCachedData(cacheKey);
    if (cachedData) {
      set({
        vehicles: cachedData,
        loading: false,
        error: null,
      });
      return;
    }

    // 같은 쿼리(cacheKey)에 이미 구독 중이면 중복 생성하지 않는다
    if (store.unsubscribers[cacheKey]) {
      logger.debug('⚠️ Already subscribed to all vehicles');
      return;
    }

    logger.debug('🔥 Creating new Supabase listener for all vehicles');
    set({loading: true, error: null});

    const unsubscribe = subscribeVehicles(
        () => fetchAllVehicles(),
        (vehicleList) => {
          logger.debug(`✅ Received ${vehicleList.length} vehicles`);
          set({vehicles: vehicleList, loading: false, error: null});
          get().setCacheData(cacheKey, vehicleList);
        },
        {channelKey: 'store-all'},
    );

    set((state) => ({unsubscribers: {...state.unsubscribers, [cacheKey]: unsubscribe}}));
  },

  /**
   * Unsubscribe from Firestore listener(s).
   * @param {string} [cacheKey] - 지정 시 해당 구독만, 생략 시 전체 해제
   */
  unsubscribeFromVehicles: (cacheKey) => {
    const {unsubscribers} = get();
    const keys = cacheKey ? [cacheKey] : Object.keys(unsubscribers);
    if (keys.length === 0) {return;}
    logger.debug(`🔴 Unsubscribing vehicle listeners: ${keys.join(', ')}`);
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
      vehicles: [],
      approvedVehicles: [],
      vehiclesCache: {},
      loading: false,
      error: null,
      unsubscribers: {},
    });
  },

  /**
   * Task 106.2: Optimistic UI Updates
   * Add a vehicle optimistically (before Firestore confirmation)
   * @param {Object} vehicleData - Vehicle data to add
   * @param {string} tempId - Temporary ID for optimistic vehicle
   */
  addOptimisticVehicle: (vehicleData, tempId) => {
    const optimisticVehicle = {
      ...vehicleData,
      id: tempId,
      _optimistic: true,
      _tempId: tempId,
    };

    set((state) => ({
      vehicles: [optimisticVehicle, ...state.vehicles],
    }));

    logger.debug(`✨ Added optimistic vehicle with temp ID: ${tempId}`);
  },

  /**
   * Remove optimistic vehicle (on write failure)
   * @param {string} tempId - Temporary ID to remove
   */
  removeOptimisticVehicle: (tempId) => {
    set((state) => ({
      vehicles: state.vehicles.filter((v) => v._tempId !== tempId),
    }));

    logger.debug(`❌ Removed optimistic vehicle: ${tempId}`);
  },

  /**
   * Clear cache for user vehicles to force refresh after optimistic add
   * @param {string} userId - User ID
   */
  invalidateUserVehiclesCache: (userId) => {
    const cacheKey = `user_vehicles_${userId}`;
    set((state) => {
      const newCache = {...state.vehiclesCache};
      delete newCache[cacheKey];
      return {vehiclesCache: newCache};
    });
    logger.debug(`🗑️ Invalidated cache for user vehicles: ${userId}`);
  },
}));

export default useVehicleStore;
