/**
 * Vehicle Query Service (Phase 2 — Firestore → Supabase)
 * Handles vehicle data retrieval and filtering operations.
 * 식별자: vehicles PK는 id(uuid). 화면 별칭(vehicleId=차량번호)은 매퍼가 부여.
 */

import { supabase } from '../../lib/supabase';
import { vehicleRowToApp } from '../../lib/mappers';
import { logger } from '../../utils/logger';

const VEHICLE_SELECT = '*';

/**
 * Get vehicles exposed to buyers (status 'approved')
 */
export const getApprovedVehicles = async (limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select(VEHICLE_SELECT)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { throw error; }
    return data.map(vehicleRowToApp);
  } catch (error) {
    logger.error('Error getting approved vehicles:', error);
    throw error;
  }
};

/**
 * Get vehicle by ID (uuid)
 */
export const getVehicleById = async (vehicleId) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select(VEHICLE_SELECT)
      .eq('id', vehicleId)
      .maybeSingle();
    if (error) { throw error; }
    if (!data) {
      throw new Error('Vehicle not found');
    }
    return vehicleRowToApp(data);
  } catch (error) {
    logger.error('Error getting vehicle by ID:', error);
    throw error;
  }
};

/**
 * Get vehicles by seller ID (판매자 또는 현소유자)
 */
export const getVehiclesBySellerId = async (sellerId) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select(VEHICLE_SELECT)
      .or(`seller_id.eq.${sellerId},current_owner_id.eq.${sellerId}`)
      .order('created_at', { ascending: false });
    if (error) { throw error; }
    return data.map(vehicleRowToApp);
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
    const { data, error } = await supabase
      .from('vehicles')
      .select(VEHICLE_SELECT)
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) { throw error; }
    return data.map(vehicleRowToApp);
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
    let query = supabase
      .from('vehicles')
      .select(VEHICLE_SELECT)
      .eq('status', filters.status || 'approved');

    if (filters.manufacturer) {
      query = query.eq('manufacturer', filters.manufacturer);
    }
    if (filters.minYear) {
      query = query.gte('year', filters.minYear);
    }
    if (filters.maxYear) {
      query = query.lte('year', filters.maxYear);
    }

    query = query.order('created_at', { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) { throw error; }
    return data.map(vehicleRowToApp);
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
    const { count, error } = await supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('status', status);
    if (error) { throw error; }
    return count ?? 0;
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
