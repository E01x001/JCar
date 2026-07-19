/**
 * Vehicle Approval Service (Phase 2 — Firestore → Supabase)
 * Handles vehicle approval and rejection operations for admin users.
 * 관리자는 RLS 정책으로 vehicles 직접 update 가능.
 */

import { supabase } from '../../lib/supabase';
import { vehicleRowToApp, appToRow } from '../../lib/mappers';
import { logger } from '../../utils/logger';
import { DEAL_STAGE } from '../../constants/vehicle';

/**
 * Approve a vehicle
 */
export const approveVehicle = async (vehicleId) => {
  try {
    const { error } = await supabase
      .from('vehicles')
      .update({
        status: 'approved',
        // 검수 통과 시 거래 단계 진입(아직 미매입 = 판매자 소유 노출)
        deal_stage: DEAL_STAGE.LISTED,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vehicleId);
    if (error) { throw error; }
    return { success: true, message: 'Vehicle approved successfully' };
  } catch (error) {
    logger.error('Error approving vehicle:', error);
    throw error;
  }
};

/**
 * Reject a vehicle
 */
// 참고: vehicles 테이블에는 rejection_reason/rejected_at 컬럼이 없어 status만 갱신한다.
export const rejectVehicle = async (vehicleId, _reason = '') => {
  try {
    const { error } = await supabase
      .from('vehicles')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', vehicleId);
    if (error) { throw error; }
    return { success: true, message: 'Vehicle rejected successfully' };
  } catch (error) {
    logger.error('Error rejecting vehicle:', error);
    throw error;
  }
};

/**
 * Get pending vehicles for approval
 */
export const getPendingVehicles = async () => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) { throw error; }
    return data.map(vehicleRowToApp);
  } catch (error) {
    logger.error('Error getting pending vehicles:', error);
    throw error;
  }
};

/**
 * Update vehicle approval status
 */
export const updateApprovalStatus = async (vehicleId, status, additionalData = {}) => {
  try {
    const now = new Date().toISOString();
    const updateData = {
      ...appToRow(additionalData),
      status,
      updated_at: now,
    };

    if (status === 'approved') {
      updateData.deal_stage = DEAL_STAGE.LISTED;
    }

    const { error } = await supabase
      .from('vehicles')
      .update(updateData)
      .eq('id', vehicleId);
    if (error) { throw error; }
    return { success: true };
  } catch (error) {
    logger.error('Error updating approval status:', error);
    throw error;
  }
};

/**
 * Set a vehicle's hidden flag (post-moderation).
 * hidden=true면 구매자 목록에서 제외.
 */
export const setVehicleHidden = async (vehicleId, hidden) => {
  try {
    const { error } = await supabase
      .from('vehicles')
      .update({ hidden, updated_at: new Date().toISOString() })
      .eq('id', vehicleId);
    if (error) { throw error; }
    return { success: true };
  } catch (error) {
    logger.error('Error updating vehicle hidden flag:', error);
    throw error;
  }
};

export default {
  approveVehicle,
  rejectVehicle,
  getPendingVehicles,
  updateApprovalStatus,
  setVehicleHidden,
};
