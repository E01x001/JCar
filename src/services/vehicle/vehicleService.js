/**
 * Vehicle Service
 *
 * Handles vehicle management operations including:
 * - Vehicle deletion (admin)
 * - Vehicle CRUD operations
 *
 * Task #88: Modular service refactoring
 */

import { Alert } from 'react-native';
import { logger } from '../../utils/logger';
import functions from '@react-native-firebase/functions';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../notification/notificationService';

/**
 * Delete a vehicle (admin only) via Cloud Function
 * @param {string} vehicleId - Vehicle ID to delete
 * @returns {Promise<void>}
 */
export const deleteVehicleAdmin = async (vehicleId) => {
  try {
    const callable = functions().httpsCallable('deleteVehicleAdmin');
    await callable({ vehicleId });
    Alert.alert('알림', '차량이 삭제되었습니다.');
  } catch (error) {
    logger.error('차량 삭제 실패:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('deleteVehicleAdmin failed');
    Alert.alert('오류', error.message || '차량 삭제 중 오류가 발생했습니다.');
  }
};
