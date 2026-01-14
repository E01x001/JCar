/**
 * Vehicle Approval Service
 * Handles vehicle approval and rejection operations for admin users
 */

import firestore from '@react-native-firebase/firestore';

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
        approvedAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    return { success: true, message: 'Vehicle approved successfully' };
  } catch (error) {
    console.error('Error approving vehicle:', error);
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
    console.error('Error rejecting vehicle:', error);
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
    console.error('Error getting pending vehicles:', error);
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
    } else if (status === 'rejected') {
      updateData.rejectedAt = firestore.FieldValue.serverTimestamp();
    }

    await firestore()
      .collection('vehicles')
      .doc(vehicleId)
      .update(updateData);

    return { success: true };
  } catch (error) {
    console.error('Error updating approval status:', error);
    throw error;
  }
};

export default {
  approveVehicle,
  rejectVehicle,
  getPendingVehicles,
  updateApprovalStatus,
};
