/* eslint-disable no-console */
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
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
} from '@react-native-firebase/firestore';

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
 * @property {Function|null} unsubscribe - Firestore listener unsubscribe function
 */

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const useVehicleStore = create((set, get) => ({
  // State
  vehicles: [],
  approvedVehicles: [],
  vehiclesCache: {}, // Cache key -> { data, timestamp }
  loading: false,
  error: null,
  unsubscribe: null,

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
      console.log(`🗑️ Cache expired for key: ${cacheKey}`);
      return false;
    }

    console.log(
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
    console.log(`💾 Cached data for key: ${cacheKey}`);
  },

  /**
   * Clear all cache
   */
  clearCache: () => {
    set({vehiclesCache: {}});
    console.log('🗑️ All vehicle cache cleared');
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

    // If already subscribed, don't create new listener
    if (store.unsubscribe) {
      console.log('⚠️ Already subscribed to approved vehicles');
      return;
    }

    console.log('🔥 Creating new Firestore listener for approved vehicles');
    set({loading: true, error: null});

    const db = getFirestore();
    const vehiclesRef = collection(db, 'vehicles');
    const q = query(vehiclesRef, where('status', '==', 'approved'));

    const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const vehicleList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          console.log(`✅ Received ${vehicleList.length} approved vehicles`);

          set({
            approvedVehicles: vehicleList,
            loading: false,
            error: null,
          });

          // Update cache
          get().setCacheData(cacheKey, vehicleList);
        },
        (error) => {
          console.error('❌ Error fetching approved vehicles:', error);
          set({
            loading: false,
            error: error,
          });
        },
    );

    set({unsubscribe});
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

    // If already subscribed, don't create new listener
    if (store.unsubscribe) {
      console.log('⚠️ Already subscribed to user vehicles');
      return;
    }

    console.log('🔥 Creating new Firestore listener for user vehicles', userId);
    set({loading: true, error: null});

    const db = getFirestore();
    const vehiclesRef = collection(db, 'vehicles');
    const q = query(vehiclesRef, where('sellerId', '==', userId));

    const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const vehicleList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          console.log(`✅ Received ${vehicleList.length} user vehicles`);

          set({
            vehicles: vehicleList,
            loading: false,
            error: null,
          });

          // Update cache
          get().setCacheData(cacheKey, vehicleList);
        },
        (error) => {
          console.error('❌ Error fetching user vehicles:', error);
          set({
            loading: false,
            error: error,
          });
        },
    );

    set({unsubscribe});
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

    // If already subscribed, don't create new listener
    if (store.unsubscribe) {
      console.log('⚠️ Already subscribed to all vehicles');
      return;
    }

    console.log('🔥 Creating new Firestore listener for all vehicles');
    set({loading: true, error: null});

    const db = getFirestore();
    const vehiclesRef = collection(db, 'vehicles');

    const unsubscribe = onSnapshot(
        vehiclesRef,
        (snapshot) => {
          const vehicleList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          console.log(`✅ Received ${vehicleList.length} vehicles`);

          set({
            vehicles: vehicleList,
            loading: false,
            error: null,
          });

          // Update cache
          get().setCacheData(cacheKey, vehicleList);
        },
        (error) => {
          console.error('❌ Error fetching all vehicles:', error);
          set({
            loading: false,
            error: error,
          });
        },
    );

    set({unsubscribe});
  },

  /**
   * Unsubscribe from Firestore listener
   */
  unsubscribeFromVehicles: () => {
    const {unsubscribe} = get();
    if (unsubscribe) {
      console.log('🔴 Unsubscribing from vehicle listener');
      unsubscribe();
      set({unsubscribe: null});
    }
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    const {unsubscribe} = get();
    if (unsubscribe) {
      unsubscribe();
    }
    set({
      vehicles: [],
      approvedVehicles: [],
      vehiclesCache: {},
      loading: false,
      error: null,
      unsubscribe: null,
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

    console.log(`✨ Added optimistic vehicle with temp ID: ${tempId}`);
  },

  /**
   * Remove optimistic vehicle (on write failure)
   * @param {string} tempId - Temporary ID to remove
   */
  removeOptimisticVehicle: (tempId) => {
    set((state) => ({
      vehicles: state.vehicles.filter((v) => v._tempId !== tempId),
    }));

    console.log(`❌ Removed optimistic vehicle: ${tempId}`);
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
    console.log(`🗑️ Invalidated cache for user vehicles: ${userId}`);
  },
}));

export default useVehicleStore;
