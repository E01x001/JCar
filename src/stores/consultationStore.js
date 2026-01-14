/* eslint-disable no-console */
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
 * @property {Function|null} unsubscribe - Firestore listener unsubscribe function
 */

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const useConsultationStore = create((set, get) => ({
  // State
  userConsultations: [],
  allConsultations: [],
  consultationsCache: {}, // Cache key -> { data, timestamp }
  loading: false,
  error: null,
  unsubscribe: null,

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
      console.log(`🗑️ Consultation cache expired for key: ${cacheKey}`);
      return false;
    }

    console.log(
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
    console.log(`💾 Cached consultation data for key: ${cacheKey}`);
  },

  /**
   * Clear all cache
   */
  clearCache: () => {
    set({consultationsCache: {}});
    console.log('🗑️ All consultation cache cleared');
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

    // If already subscribed, don't create new listener
    if (store.unsubscribe) {
      console.log('⚠️ Already subscribed to user consultations');
      return;
    }

    console.log(`🔥 Creating new Firestore listener for user ${userId} consultations`);
    set({loading: true, error: null});

    const db = getFirestore();
    const consultationsRef = collection(db, 'consultation_requests');
    const q = query(consultationsRef, where('userId', '==', userId));

    const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const consultationList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          console.log(`✅ Received ${consultationList.length} user consultations`);

          set({
            userConsultations: consultationList,
            loading: false,
            error: null,
          });

          // Update cache
          get().setCacheData(cacheKey, consultationList);
        },
        (error) => {
          console.error('❌ Error fetching user consultations:', error);
          set({
            loading: false,
            error: error,
          });
        },
    );

    set({unsubscribe});
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

    // If already subscribed, don't create new listener
    if (store.unsubscribe) {
      console.log('⚠️ Already subscribed to all consultations');
      return;
    }

    console.log('🔥 Creating new Firestore listener for all consultations');
    set({loading: true, error: null});

    const db = getFirestore();
    const consultationsRef = collection(db, 'consultation_requests');

    const unsubscribe = onSnapshot(
        consultationsRef,
        (snapshot) => {
          const consultationList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          console.log(`✅ Received ${consultationList.length} consultations`);

          set({
            allConsultations: consultationList,
            loading: false,
            error: null,
          });

          // Update cache
          get().setCacheData(cacheKey, consultationList);
        },
        (error) => {
          console.error('❌ Error fetching all consultations:', error);
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
  unsubscribeFromConsultations: () => {
    const {unsubscribe} = get();
    if (unsubscribe) {
      console.log('🔴 Unsubscribing from consultation listener');
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
      userConsultations: [],
      allConsultations: [],
      consultationsCache: {},
      loading: false,
      error: null,
      unsubscribe: null,
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

    console.log(`✨ Added optimistic consultation with temp ID: ${tempId}`);
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

    console.log(`❌ Removed optimistic consultation: ${tempId}`);
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
    console.log(`🗑️ Invalidated cache for user consultations: ${userId}`);
  },
}));

export default useConsultationStore;
