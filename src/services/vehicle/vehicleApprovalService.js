/**
 * Vehicle Approval Service
 * Handles vehicle approval and rejection operations for admin users
 */

import firestore from '@react-native-firebase/firestore';
import { logger } from '../../utils/logger';
import { DEAL_STAGE } from '../../constants/vehicle';

/**
 * Approve a vehicle
 */
export const approveVehicle = async (vehicleId) => {
  try {
    await firestore()
      .collection('vehicles')
      .doc(vehicleId)
      .update({
        status: 'approved',
        // 검수 통과 시 거래 단계 진입(아직 미매입 = 판매자 소유 노출)
        dealStage: DEAL_STAGE.LISTED,
        approvedAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    return { success: true, message: 'Vehicle approved successfully' };
  } catch (error) {
    logger.error('Error approving vehicle:', error);
    throw error;
  }
};

/**
 * Reject a vehicle
 */
export const rejectVehicle = async (vehicleId, reason = '') => {
  try {
    await firestore()
      .collection('vehicles')
      .doc(vehicleId)
      .update({
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

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
    const snapshot = await firestore()
      .collection('vehicles')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
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
    const updateData = {
      status,
      updatedAt: firestore.FieldValue.serverTimestamp(),
      ...additionalData,
    };

    if (status === 'approved') {
      updateData.approvedAt = firestore.FieldValue.serverTimestamp();
      updateData.dealStage = DEAL_STAGE.LISTED;
    } else if (status === 'rejected') {
      updateData.rejectedAt = firestore.FieldValue.serverTimestamp();
    }

    await firestore()
      .collection('vehicles')
      .doc(vehicleId)
      .update(updateData);

    return { success: true };
  } catch (error) {
    logger.error('Error updating approval status:', error);
    throw error;
  }
};

/**
 * Set a vehicle's hidden flag (post-moderation).
 *
 * 자동노출 정책에서 관리자가 부적절한 매물을 사후에 내리거나 다시 노출할 때 사용.
 * hidden=true면 구매자 목록에서 제외(vehicleFilterService의 !v.hidden 필터).
 */
export const setVehicleHidden = async (vehicleId, hidden) => {
  try {
    await firestore()
      .collection('vehicles')
      .doc(vehicleId)
      .update({
        hidden,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

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
