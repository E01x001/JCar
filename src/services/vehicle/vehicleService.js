/**
 * Vehicle Service (Phase 2 — Cloud Function → Supabase 직접 삭제)
 *
 * 관리자 차량 삭제: admin RLS가 vehicles delete를 허용하므로 직접 삭제.
 * 스토리지 이미지는 best-effort 정리(실패해도 삭제 진행).
 */

import { Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import { deleteMultipleImages } from '../storage/imageService';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../notification/notificationService';

/**
 * Delete a vehicle (admin only)
 * @param {string} vehicleId - Vehicle id (uuid)
 * @returns {Promise<void>}
 */
export const deleteVehicleAdmin = async (vehicleId) => {
  try {
    // 이미지 URL 확보 후 행 삭제 → 스토리지 정리(best-effort)
    const { data: vehicle, error: readError } = await supabase
      .from('vehicles')
      .select('image_urls')
      .eq('id', vehicleId)
      .maybeSingle();
    if (readError) { throw readError; }

    const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
    if (error) { throw error; }

    const imageUrls = vehicle?.image_urls;
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      try {
        await deleteMultipleImages(imageUrls);
      } catch (cleanupError) {
        logger.error('차량 이미지 정리 실패(무시):', cleanupError);
      }
    }

    Alert.alert('알림', '차량이 삭제되었습니다.');
  } catch (error) {
    logger.error('차량 삭제 실패:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('deleteVehicleAdmin failed');
    Alert.alert('오류', error.message || '차량 삭제 중 오류가 발생했습니다.');
  }
};
