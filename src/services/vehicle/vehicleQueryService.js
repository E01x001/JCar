/**
 * Vehicle Query Service
 * Handles vehicle data retrieval and filtering operations
 */

import firestore from '@react-native-firebase/firestore';
import { logger } from '../../utils/logger';

/**
 * Get vehicles exposed to buyers (status 'approved' = listed/acquiring/in_stock)
 */
export const getApprovedVehicles = async (limit = 20) => {
  try {
    const snapshot = await firestore()
      .collection('vehicles')
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    logger.error('Error getting approved vehicles:', error);
    throw error;
  }
};

/**
 * Get vehicle by ID
 */
export const getVehicleById = async (vehicleId) => {
  try {
    const doc = await firestore()
      .collection('vehicles')
      .doc(vehicleId)
      .get();

    if (!doc.exists) {
      throw new Error('Vehicle not found');
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    logger.error('Error getting vehicle by ID:', error);
    throw error;
  }
};

/**
 * Get vehicles by seller ID
 */
export const getVehiclesBySellerId = async (sellerId) => {
  try {
    const snapshot = await firestore()
      .collection('vehicles')
      .where('sellerId', '==', sellerId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    logger.error('Error getting vehicles by seller ID:', error);
    throw error;
  }
};

/**
 * Get vehicles by status
 */
export const getVehiclesByStatus = async (status) => {
  try {
    const snapshot = await firestore()
      .collection('vehicles')
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    logger.error('Error getting vehicles by status:', error);
    throw error;
  }
};

/**
 * Search vehicles by filters
 */
export const searchVehicles = async (filters = {}) => {
  try {
    let query = firestore().collection('vehicles');

    // 노출 대상 = status 'approved' (default). 특정 status 지정 시 override 가능.
    query = query.where('status', '==', filters.status || 'approved');

    // Apply manufacturer filter
    if (filters.manufacturer) {
      query = query.where('manufacturer', '==', filters.manufacturer);
    }

    // Apply year range filter
    if (filters.minYear) {
      query = query.where('year', '>=', filters.minYear);
    }
    if (filters.maxYear) {
      query = query.where('year', '<=', filters.maxYear);
    }

    // Order by creation date
    query = query.orderBy('createdAt', 'desc');

    // Apply limit
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    logger.error('Error searching vehicles:', error);
    throw error;
  }
};

/**
 * Get vehicle count by status
 */
export const getVehicleCountByStatus = async (status) => {
  try {
    const snapshot = await firestore()
      .collection('vehicles')
      .where('status', '==', status)
      .get();

    return snapshot.size;
  } catch (error) {
    logger.error('Error getting vehicle count:', error);
    throw error;
  }
};

export default {
  getApprovedVehicles,
  getVehicleById,
  getVehiclesBySellerId,
  getVehiclesByStatus,
  searchVehicles,
  getVehicleCountByStatus,
};
