/**
 * Consultation Service
 *
 * Handles consultation write operations including:
 * - Creating consultation requests
 * - Updating consultation status
 * - Completing consultation deals
 * - Managing admin-owned vehicles
 * - Cancellation and resubmission
 *
 * Task #88: Modular service refactoring
 */

import { Alert } from 'react-native';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  runTransaction,
  deleteField,
} from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../notification/notificationService';
import { CONSULTATION_STATUS } from '../../constants';
import { DEAL_STAGE } from '../../constants/vehicle';
import { logger } from '../../utils/logger';
import { addSlotClaimToBatch, releaseSlot, isSlotConflictError } from './consultationSlotService';

/**
 * Check the consultation request rate limit for the current user.
 *
 * Calls the server-side sliding-window limiter (Task 82). A successful
 * (allowed) check CONSUMES one slot, so call this exactly once per submission
 * attempt — and call it BEFORE showing optimistic success, so the user is not
 * told "접수 완료" only to be rejected afterwards.
 *
 * Fails closed: if the limit cannot be verified, the request is blocked.
 * @returns {Promise<{allowed: boolean, message?: string, remainingRequests?: number}>}
 */
export const checkConsultationRateLimit = async () => {
  try {
    const checkRateLimit = functions().httpsCallable('checkConsultationRateLimit');
    const result = await checkRateLimit();
    return result.data;
  } catch (error) {
    logger.error('상담 요청 rate limit 확인 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('checkConsultationRateLimit failed');
    return {
      allowed: false,
      message: '요청 한도를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.',
    };
  }
};

/**
 * Save a consultation request.
 *
 * Pure write: the rate limit must be checked separately via
 * {@link checkConsultationRateLimit} before calling this. Returns a result
 * object; the caller is responsible for surfacing success/error to the user.
 * @param {Object} data - Consultation request data
 * @returns {Promise<{success: boolean, error?: Error}>}
 */
export const saveConsultationRequest = async (data) => {
  try {
    const validData = {
      userId: data.userId || null,
      userName: data.userName || '익명',
      userPhone: data.userPhone || '미등록',
      vehicleId: data.vehicleId || null,
      vehicleName: data.vehicleName || '알 수 없음',
      preferredDate: data.preferredDate || null,
      preferredTime: data.preferredTime || null,
      type: data.type || 'buy',
      consultationStatus: data.consultationStatus || 'pending',
      completedAt: data.completedAt || null,
      completedBy: data.completedBy || null,
      dealAmount: data.dealAmount || null,
      adminNotes: data.adminNotes || '',
      createdAt: serverTimestamp(),
    };

    const db = getFirestore();
    // 슬롯 선점 + 상담 생성을 한 배치로 원자 처리(이중예약 방지, C4/C5).
    // 이미 점유된 슬롯이면 규칙(consultation_slots update 금지)에 의해
    // 커밋 전체가 permission-denied로 실패한다.
    const consultationRef = doc(collection(db, 'consultation_requests'));
    const batch = writeBatch(db);
    batch.set(consultationRef, validData);
    if (validData.vehicleId && validData.preferredDate && validData.preferredTime && validData.userId) {
      addSlotClaimToBatch(batch, db, {
        vehicleId: validData.vehicleId,
        preferredDate: validData.preferredDate,
        preferredTime: validData.preferredTime,
        userId: validData.userId,
        consultationId: consultationRef.id,
      });
    }
    await batch.commit();

    // 구매 상담이 미매입(listed) 차량에 들어오면 매입진행(acquiring)으로 전환.
    // 이미 acquiring/in_stock/sold 이거나 sell 상담이면 건드리지 않는다.
    if (validData.type === 'buy' && validData.vehicleId) {
      try {
        await runTransaction(db, async (transaction) => {
          const vehicleRef = doc(db, 'vehicles', validData.vehicleId);
          const vehicleDoc = await transaction.get(vehicleRef);
          if (vehicleDoc.exists() && vehicleDoc.data().dealStage === DEAL_STAGE.LISTED) {
            transaction.update(vehicleRef, {
              dealStage: DEAL_STAGE.ACQUIRING,
              updatedAt: serverTimestamp(),
            });
          }
        });
      } catch (stageError) {
        // 단계 전환 실패가 상담 접수 자체를 막지 않도록 분리 처리
        logger.error('차량 acquiring 전환 실패:', stageError);
        reportCrashlyticsError(stageError);
      }
    }

    return { success: true };
  } catch (error) {
    logger.error('상담 요청 저장 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('saveConsultationRequest failed');
    // UI feedback is handled by the caller (optimistic onError) to avoid double alerts.
    return {
      success: false,
      error,
      // 슬롯 선점 실패(동시 예약 경쟁 패배)면 호출측이 맞춤 안내를 띄울 수 있게 표시
      slotConflict: isSlotConflictError(error),
    };
  }
};

/**
 * Delete a consultation (admin only)
 * @param {string} consultationId - Consultation ID
 * @returns {Promise<void>}
 */
export const deleteConsultationAdmin = async (consultationId) => {
  try {
    const callable = functions().httpsCallable('deleteConsultationAdmin');
    await callable({ consultationId });
    Alert.alert('알림', '상담이 삭제되었습니다.');
  } catch (error) {
    logger.error('상담 삭제 실패:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('deleteConsultationAdmin failed');
    Alert.alert('오류', error.message || '상담 삭제 중 오류가 발생했습니다.');
  }
};

/**
 * Update consultation status
 * @param {string} consultationId - Consultation ID
 * @param {string} newStatus - New status
 * @param {string} adminId - Admin user ID
 * @param {string} notes - Admin notes
 * @param {string} rejectionReason - Rejection reason (if rejected)
 * @returns {Promise<{success: boolean}>}
 */
export const updateConsultationStatus = async (consultationId, newStatus, adminId = null, notes = '', rejectionReason = null) => {
  try {
    const updateData = {
      consultationStatus: newStatus,
    };

    // Add adminNotes only if provided
    if (notes) {
      updateData.adminNotes = notes;
    }

    // Add rejectionReason only if provided and status is 'rejected'
    if (newStatus === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
      updateData.rejectedAt = serverTimestamp();
    }

    // Add completedBy only if adminId is provided
    if (adminId) {
      updateData.completedBy = adminId;
    }

    // Automatically add completedAt timestamp when status is 'completed'
    if (newStatus === 'completed') {
      updateData.completedAt = serverTimestamp();
    }

    const db = getFirestore();
    const consultationRef = doc(db, 'consultation_requests', consultationId);
    await updateDoc(consultationRef, updateData);

    // 거절/취소 시 점유 슬롯 해제 → 다른 사용자가 해당 시간에 예약 가능 (best-effort)
    if ([CONSULTATION_STATUS.REJECTED, CONSULTATION_STATUS.CANCELLED].includes(newStatus)) {
      try {
        const snapshot = await getDoc(consultationRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          await releaseSlot(data.vehicleId, data.preferredDate, data.preferredTime);
        }
      } catch (slotError) {
        logger.error('거절/취소 슬롯 해제 실패:', slotError);
      }
    }

    return { success: true };
  } catch (error) {
    logger.error('상담 상태 업데이트 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('updateConsultationStatus failed');
    throw error; // Re-throw error for caller to handle
  }
};

/**
 * Update admin memo for a consultation
 * @param {string} consultationId - Consultation ID
 * @param {string} adminMemo - Admin memo text
 * @returns {Promise<{success: boolean}>}
 */
export const updateAdminMemo = async (consultationId, adminMemo) => {
  try {
    const db = getFirestore();
    const consultationRef = doc(db, 'consultation_requests', consultationId);
    await updateDoc(consultationRef, {
      adminMemo: adminMemo,
      memoUpdatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    logger.error('관리자 메모 업데이트 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('updateAdminMemo failed');
    throw error; // Re-throw error for caller to handle
  }
};

/**
 * Update alternative time slot suggestions for a consultation
 * @param {string} consultationId - Firestore consultation document ID
 * @param {Array<Date>} suggestedSlots - Array of Date objects representing alternative time slots
 * @returns {Promise<{success: boolean}>}
 */
export const updateSuggestedSlots = async (consultationId, suggestedSlots) => {
  try {
    // Convert Date objects to alternativeSlots format {date, time}
    const alternativeSlots = suggestedSlots.map(slot => ({
      date: `${slot.getFullYear()}-${String(slot.getMonth() + 1).padStart(2, '0')}-${String(slot.getDate()).padStart(2, '0')}`,
      time: `${String(slot.getHours()).padStart(2, '0')}:${String(slot.getMinutes()).padStart(2, '0')}`,
    }));

    const db = getFirestore();
    const consultationRef = doc(db, 'consultation_requests', consultationId);
    await updateDoc(consultationRef, {
      alternativeSlots,
      alternativeSlotsUpdatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    logger.error('대체 시간 제안 업데이트 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('updateSuggestedSlots failed');
    throw error; // Re-throw for caller to handle
  }
};

/**
 * Complete a consultation with deal amount
 * @param {Object} params - Completion parameters
 * @param {string} params.docId - Consultation document ID
 * @param {number} params.dealAmount - Final deal amount
 * @param {string} params.adminNotes - Admin notes
 * @param {string} params.completedBy - Admin user ID
 * @param {boolean} params.isSell - Whether this is a sell consultation
 * @returns {Promise<{success: boolean}>}
 */
export const completeConsultation = async ({ docId, dealAmount, adminNotes = '', completedBy, isSell = false }) => {
  try {
    const db = getFirestore();

    // If NOT a sell-type consultation, use simple update
    if (!isSell) {
      const updateData = {
        consultationStatus: 'completed',
        completedAt: serverTimestamp(),
        dealAmount: Number(dealAmount),
        completedBy: completedBy,
      };

      // Add adminNotes only if provided
      if (adminNotes) {
        updateData.adminNotes = adminNotes;
      }

      const consultationRef = doc(db, 'consultation_requests', docId);
      await updateDoc(consultationRef, updateData);

      return { success: true };
    }

    // For sell-type consultations, use transaction
    const result = await runTransaction(db, async (transaction) => {
      const consultationRef = doc(db, 'consultation_requests', docId);
      const consultationDoc = await transaction.get(consultationRef);

      if (!consultationDoc.exists()) {
        throw new Error('상담 정보를 찾을 수 없습니다.');
      }

      const consultationData = consultationDoc.data();
      const vehicleId = consultationData.vehicleId;

      if (!vehicleId) {
        throw new Error('차량 정보가 없습니다.');
      }

      // Read vehicle document
      const vehicleRef = doc(db, 'vehicles', vehicleId);
      const vehicleDoc = await transaction.get(vehicleRef);

      if (!vehicleDoc.exists()) {
        throw new Error('차량 정보를 찾을 수 없습니다.');
      }

      const vehicleData = vehicleDoc.data();

      // 1. Update consultation status
      const consultationUpdateData = {
        consultationStatus: 'completed',
        completedAt: serverTimestamp(),
        dealAmount: Number(dealAmount),
        completedBy: completedBy,
      };

      if (adminNotes) {
        consultationUpdateData.adminNotes = adminNotes;
      }

      transaction.update(consultationRef, consultationUpdateData);

      // 2. Create admin_owned_vehicles document (감사/이력용 기록 — 정본 아님)
      //    정본(SSOT)은 vehicles 문서. 이 컬렉션은 매입 이력 조회용으로만 유지.
      const ownedVehiclesCol = collection(db, 'admin_owned_vehicles');
      const ownedVehicleRef = doc(ownedVehiclesCol);
      transaction.set(ownedVehicleRef, {
        vehicleId: vehicleId,
        vehicleName: consultationData.vehicleName || vehicleData.vehicleName || '알 수 없음',
        purchasePrice: Number(dealAmount),
        purchaseDate: serverTimestamp(),
        consultationId: docId,
        previousOwnerId: consultationData.userId,
        previousOwnerName: consultationData.userName,
        status: 'owned',
        soldDate: null,
        soldPrice: null,
        // Copy vehicle details
        manufacturer: vehicleData.manufacturer,
        model: vehicleData.model,
        year: vehicleData.year,
        mileage: vehicleData.mileage,
        imageUrl: vehicleData.imageUrl,
        createdAt: serverTimestamp(),
      });

      // 3. 매입 완료 → vehicles 정본 갱신: 재고(in_stock)로 살려두고 관리자 소유로 이전.
      //    더 이상 status='sold'로 죽이지 않음(재고차도 목록에 노출되어야 함).
      transaction.update(vehicleRef, {
        dealStage: DEAL_STAGE.IN_STOCK,
        isAdminOwned: true,
        currentOwnerId: completedBy,
        availableForPurchase: true,
        purchasePrice: Number(dealAmount),
        purchasedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { success: true };
    });

    return result;
  } catch (error) {
    logger.error('거래완료 처리 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('completeConsultation failed');
    throw error; // Re-throw for caller to handle
  }
};

/**
 * Cancel a consultation request by the user
 * Only consultations in pending, confirmed, or on-hold status can be cancelled.
 * Approved consultations cannot be cancelled by users.
 *
 * @param {string} consultationId - Firestore consultation document ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const cancelConsultation = async (consultationId) => {
  try {
    const db = getFirestore();
    const consultationRef = doc(db, 'consultation_requests', consultationId);

    // Read current document state to validate cancellability
    const docSnapshot = await getDoc(consultationRef);

    if (!docSnapshot.exists()) {
      return {
        success: false,
        error: '상담 정보를 찾을 수 없습니다.',
      };
    }

    const currentData = docSnapshot.data();
    const currentStatus = currentData.consultationStatus;

    // Users may cancel while the request is still in an early, non-finalized state.
    const cancellableStatuses = [
      CONSULTATION_STATUS.PENDING,
      CONSULTATION_STATUS.CONFIRMED,
      CONSULTATION_STATUS.ON_HOLD,
    ];

    if (!cancellableStatuses.includes(currentStatus)) {
      // Return appropriate message based on current status
      let errorMessage = '';

      if (currentStatus === CONSULTATION_STATUS.APPROVED) {
        errorMessage = '승인된 상담은 취소할 수 없습니다.\n관리자에게 문의해주세요.';
      } else if (currentStatus === CONSULTATION_STATUS.COMPLETED) {
        errorMessage = '이미 완료된 상담입니다.';
      } else if (currentStatus === CONSULTATION_STATUS.CANCELLED) {
        errorMessage = '이미 취소된 상담입니다.';
      } else if (currentStatus === CONSULTATION_STATUS.REJECTED) {
        errorMessage = '거절된 상담은 취소할 수 없습니다.';
      } else {
        errorMessage = `현재 상태(${currentStatus})에서는 취소할 수 없습니다.`;
      }

      logger.debug(`⚠️ 취소 불가 - 상태: ${currentStatus}`);
      return {
        success: false,
        error: errorMessage,
      };
    }

    // Proceed with cancellation
    await updateDoc(consultationRef, {
      consultationStatus: CONSULTATION_STATUS.CANCELLED,
      cancelledAt: serverTimestamp(),
    });

    // 점유했던 시간 슬롯 해제(best-effort — 실패해도 취소 자체는 유효)
    await releaseSlot(currentData.vehicleId, currentData.preferredDate, currentData.preferredTime, {
      requesterId: currentData.userId,
    });

    logger.debug('✅ 상담 취소 성공');
    return { success: true };
  } catch (error) {
    logger.error('❌ 상담 취소 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('cancelConsultation failed');

    return {
      success: false,
      error: '상담 취소 중 오류가 발생했습니다.',
    };
  }
};

/**
 * Resubmit a rejected consultation with new date/time
 * @param {string} consultationId - Firestore consultation document ID
 * @param {string} preferredDate - New preferred date (YYYY-MM-DD or formatted string)
 * @param {string} preferredTime - New preferred time (HH:MM or formatted string)
 * @returns {Promise<{success: boolean}>}
 */
export const resubmitConsultation = async (consultationId, preferredDate, preferredTime) => {
  try {
    const db = getFirestore();
    const consultationRef = doc(db, 'consultation_requests', consultationId);

    // 기존 문서를 읽어 이전 슬롯 정보 확보(재신청 후 해제용)
    const prevSnapshot = await getDoc(consultationRef);
    const prev = prevSnapshot.exists() ? prevSnapshot.data() : null;

    // 새 슬롯 선점 + 재신청 업데이트를 한 배치로(이중예약 방지)
    const batch = writeBatch(db);
    batch.update(consultationRef, {
      consultationStatus: 'pending',
      preferredDate,
      preferredTime,
      rejectionReason: deleteField(),
      alternativeSlots: deleteField(),
      rejectedAt: deleteField(),
      resubmittedAt: serverTimestamp(),
    });
    if (prev?.vehicleId && prev?.userId) {
      addSlotClaimToBatch(batch, db, {
        vehicleId: prev.vehicleId,
        preferredDate,
        preferredTime,
        userId: prev.userId,
        consultationId,
      });
    }
    await batch.commit();

    // 이전 일정 슬롯 해제(거절 시 이미 해제됐을 수 있음 — best-effort)
    if (prev?.vehicleId && (prev.preferredDate !== preferredDate || prev.preferredTime !== preferredTime)) {
      await releaseSlot(prev.vehicleId, prev.preferredDate, prev.preferredTime, { requesterId: prev.userId });
    }

    return { success: true };
  } catch (error) {
    logger.error('상담 재신청 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('resubmitConsultation failed');
    throw error; // Re-throw error for caller to handle
  }
};

/**
 * Create admin-owned vehicle record
 * @param {Object} vehicleData - Vehicle data
 * @returns {Promise<{success: boolean, id?: string, error?: Error}>}
 */
export const createAdminOwnedVehicle = async (vehicleData) => {
  try {
    const validData = {
      vehicleId: vehicleData.vehicleId,
      vehicleName: vehicleData.vehicleName,
      purchasePrice: vehicleData.purchasePrice,
      purchaseDate: vehicleData.purchaseDate || serverTimestamp(),
      consultationId: vehicleData.consultationId,
      previousOwnerId: vehicleData.previousOwnerId,
      previousOwnerName: vehicleData.previousOwnerName,
      status: vehicleData.status || 'owned',
      soldDate: vehicleData.soldDate || null,
      soldPrice: vehicleData.soldPrice || null,
      createdAt: serverTimestamp(),
    };

    const db = getFirestore();
    const ownedVehiclesRef = collection(db, 'admin_owned_vehicles');
    const docRef = await addDoc(ownedVehiclesRef, validData);
    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('관리자 소유 차량 생성 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('createAdminOwnedVehicle failed');
    Alert.alert('오류', '차량 등록에 실패했습니다.');
    return { success: false, error };
  }
};

/**
 * Update admin-owned vehicle
 * @param {string} vehicleId - Vehicle document ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<{success: boolean, error?: Error}>}
 */
export const updateAdminOwnedVehicle = async (vehicleId, updateData) => {
  try {
    const db = getFirestore();
    const vehicleDocRef = doc(db, 'admin_owned_vehicles', vehicleId);
    await updateDoc(vehicleDocRef, updateData);

    return { success: true };
  } catch (error) {
    logger.error('관리자 소유 차량 업데이트 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('updateAdminOwnedVehicle failed');
    Alert.alert('오류', '차량 정보 업데이트에 실패했습니다.');
    return { success: false, error };
  }
};
