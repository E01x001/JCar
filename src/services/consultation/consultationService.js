/**
 * Consultation Service (Phase 2c — Firestore → Supabase)
 *
 * 이중예약/중복신청은 DB 부분 UNIQUE 인덱스가 원자적으로 차단한다
 * (consultation_active_slot_uniq / consultation_active_user_vehicle_uniq).
 * 상태 전이·권한 컬럼 보호는 DB 트리거 가드가 담당 — 클라이언트는 시도만 하고
 * 거부되면 에러를 매핑한다.
 */

import { Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { appToRow, consultationRowToApp } from '../../lib/mappers';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../notification/notificationService';
import { CONSULTATION_STATUS } from '../../constants';
import { logger } from '../../utils/logger';

/** Postgres unique_violation → 슬롯/중복 충돌 판별 */
const isUniqueViolation = (error) => error?.code === '23505';
const isSlotConflict = (error) =>
  isUniqueViolation(error) && /active_slot/.test(error?.message || '');
const isDuplicateRequest = (error) =>
  isUniqueViolation(error) && /user_vehicle/.test(error?.message || '');

/** 레이트리밋 트리거가 올린 예외인지 판별 */
const isRateLimited = (error) =>
  /rate_limit_(hour|day)/.test(error?.message || '');

/**
 * 상담 요청 레이트리밋 사전 안내.
 *
 * 실제 강제는 DB 트리거(app_private.consultation_rate_limit)가 한다 —
 * 여기서 막는 것은 사용자에게 미리 알려주기 위한 것이지 방어가 아니다.
 * 클라이언트가 우회할 수 있는 위치이므로 이 함수를 신뢰해서는 안 된다.
 *
 * 조회에 실패하면 통과시킨다. 안내를 못 했을 뿐이고, 실제 초과라면 insert가 거부된다.
 */
export const checkConsultationRateLimit = async () => {
  try {
    const { data, error } = await supabase.rpc('consultation_quota');
    if (error) { throw error; }

    const quota = Array.isArray(data) ? data[0] : data;
    if (!quota) { return { allowed: true }; }

    if (quota.remaining_hour <= 0) {
      return { allowed: false, message: '1시간에 최대 5건까지 신청할 수 있습니다. 잠시 후 다시 시도해주세요.' };
    }
    if (quota.remaining_day <= 0) {
      return { allowed: false, message: '하루에 최대 20건까지 신청할 수 있습니다. 내일 다시 시도해주세요.' };
    }
    return { allowed: true, remainingHour: quota.remaining_hour, remainingDay: quota.remaining_day };
  } catch (error) {
    logger.error('레이트리밋 조회 실패(통과 처리):', error);
    return { allowed: true };
  }
};

/**
 * 상담 요청 저장.
 * 슬롯 점유/중복 신청은 insert 시 UNIQUE 위반으로 원자 거부된다.
 * @returns {Promise<{success: boolean, error?: Error, slotConflict?: boolean, duplicate?: boolean}>}
 */
export const saveConsultationRequest = async (data) => {
  try {
    const row = appToRow({
      userId: data.userId,
      userName: data.userName || '익명',
      userPhone: data.userPhone || '미등록',
      vehicleId: data.vehicleId, // vehicles.id (uuid)
      vehicleName: data.vehicleName || '알 수 없음',
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      type: data.type || 'buy',
      consultationStatus: data.consultationStatus || 'pending',
      adminNotes: data.adminNotes || '',
    });

    const { error } = await supabase.from('consultation_requests').insert(row);
    if (error) { throw error; }

    // 구매 상담이 미매입(listed) 차량에 들어오면 매입진행(acquiring)으로 전환.
    // 구매자는 vehicles update 권한이 없어 SECURITY DEFINER RPC 경유.
    if ((data.type || 'buy') === 'buy' && data.vehicleId) {
      const { error: stageError } = await supabase.rpc('mark_vehicle_acquiring', {
        p_vehicle_id: data.vehicleId,
      });
      if (stageError) {
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
    return {
      success: false,
      error,
      slotConflict: isSlotConflict(error),
      duplicate: isDuplicateRequest(error),
      rateLimited: isRateLimited(error),
    };
  }
};

/** 슬롯 점유 사전확인 (RPC — RLS상 타인 상담을 직접 조회할 수 없음) */
export const isSlotTaken = async (vehicleId, preferredDate, preferredTime) => {
  try {
    const { data, error } = await supabase.rpc('is_slot_taken', {
      p_vehicle_id: vehicleId,
      p_date: preferredDate,
      p_time: preferredTime,
    });
    if (error) { throw error; }
    return !!data;
  } catch (error) {
    logger.error('슬롯 조회 오류:', error);
    return false; // 최종 방어는 insert의 UNIQUE 제약
  }
};

/** 내 활성 상담 중복 여부 (같은 차량) */
export const hasActiveConsultation = async (userId, vehicleId) => {
  try {
    const { count, error } = await supabase
      .from('consultation_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('vehicle_id', vehicleId)
      .in('consultation_status', ['pending', 'approved', 'confirmed', 'on-hold']);
    if (error) { throw error; }
    return (count ?? 0) > 0;
  } catch (error) {
    logger.error('중복 상담 조회 오류:', error);
    return false;
  }
};

/**
 * 상담 삭제 (관리자 — RLS consultation_delete_admin)
 */
export const deleteConsultationAdmin = async (consultationId) => {
  try {
    const { error } = await supabase
      .from('consultation_requests')
      .delete()
      .eq('id', consultationId);
    if (error) { throw error; }
    Alert.alert('알림', '상담이 삭제되었습니다.');
  } catch (error) {
    logger.error('상담 삭제 실패:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('deleteConsultationAdmin failed');
    Alert.alert('오류', error.message || '상담 삭제 중 오류가 발생했습니다.');
  }
};

/**
 * 상담 상태 업데이트 (관리자)
 */
export const updateConsultationStatus = async (consultationId, newStatus, adminId = null, notes = '', rejectionReason = null) => {
  try {
    const updateData = { consultation_status: newStatus };
    if (notes) { updateData.admin_notes = notes; }
    if (newStatus === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
      updateData.rejected_at = new Date().toISOString();
    }
    if (adminId) { updateData.completed_by = adminId; }
    if (newStatus === 'completed') { updateData.completed_at = new Date().toISOString(); }
    if (newStatus === 'cancelled') { updateData.cancelled_at = new Date().toISOString(); }

    const { error } = await supabase
      .from('consultation_requests')
      .update(updateData)
      .eq('id', consultationId);
    if (error) { throw error; }

    return { success: true };
  } catch (error) {
    logger.error('상담 상태 업데이트 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('updateConsultationStatus failed');
    throw error;
  }
};

/**
 * 관리자 메모 업데이트
 */
export const updateAdminMemo = async (consultationId, adminMemo) => {
  try {
    const { error } = await supabase
      .from('consultation_requests')
      .update({ admin_memo: adminMemo, memo_updated_at: new Date().toISOString() })
      .eq('id', consultationId);
    if (error) { throw error; }
    return { success: true };
  } catch (error) {
    logger.error('관리자 메모 업데이트 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('updateAdminMemo failed');
    throw error;
  }
};

/**
 * 슬롯 하나를 저장 형태 {date:'YYYY-MM-DD', time:'HH:MM'}로 정규화한다.
 *
 * 왜 Date를 그대로 쓰지 않는가: JSON 직렬화가 Date를 UTC ISO 문자열로 바꾼다.
 * 그러면 (a) 한국 시간이 9시간 밀려 날짜가 하루 어긋날 수 있고, (b) 읽는 쪽
 * (사용자 상세 화면·재편집 모달·수락 RPC)은 모두 {date,time}을 기대하므로
 * 화면에 빈 줄로 나온다. 실제로 그렇게 깨져 있었다.
 *
 * preferred_date(date)·preferred_time(time) 컬럼도 시간대 없는 벽시계 값이므로
 * 같은 표현을 쓰는 것이 일관적이다.
 */
const normalizeSlot = (slot) => {
  if (slot instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    return {
      date: `${slot.getFullYear()}-${pad(slot.getMonth() + 1)}-${pad(slot.getDate())}`,
      time: `${pad(slot.getHours())}:${pad(slot.getMinutes())}`,
    };
  }
  // 이미 {date,time}이면 그대로 둔다
  if (slot && typeof slot.date === 'string' && typeof slot.time === 'string') {
    return { date: slot.date, time: slot.time };
  }
  return null;
};

/**
 * 대체 시간 제안 저장 (관리자)
 *
 * 상태를 ON_HOLD로 바꾸는 것은 부수효과가 아니라 **의미**다 —
 * "관리자가 대안을 냈고 사용자 응답을 기다린다"는 뜻이며, 사용자 수락
 * RPC(accept_alternative_slot)도 이 상태에서만 동작한다. 바꾸지 말 것.
 *
 * @param {Array<Date|{date: string, time: string}>} suggestedSlots
 */
export const updateSuggestedSlots = async (consultationId, suggestedSlots) => {
  try {
    const slots = (suggestedSlots || []).map(normalizeSlot).filter(Boolean);
    if (slots.length === 0) {
      throw new Error('저장할 대체 시간이 없습니다.');
    }

    const { error } = await supabase
      .from('consultation_requests')
      .update({
        alternative_slots: slots,
        consultation_status: CONSULTATION_STATUS.ON_HOLD,
      })
      .eq('id', consultationId);
    if (error) { throw error; }
    return { success: true };
  } catch (error) {
    logger.error('대체 시간 제안 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('updateSuggestedSlots failed');
    throw error;
  }
};

/**
 * 대체 일정 수락 (상담 신청자 본인)
 *
 * 날짜·시간을 보내지 않고 **제안 목록의 인덱스만** 보낸다. 서버(RPC)가 소유자·
 * 상태·인덱스 범위를 검증하고 저장된 슬롯에서 값을 꺼내 확정하므로, 제안되지
 * 않은 시간을 밀어넣을 수 없다. 테이블 직접 UPDATE는 가드가 계속 막는다.
 *
 * @param {string} consultationId
 * @param {number} slotIndex - alternative_slots 배열의 0-기반 인덱스
 * @returns {Promise<{preferredDate: string, preferredTime: string, consultationStatus: string}>}
 */
export const acceptAlternativeSlot = async (consultationId, slotIndex) => {
  try {
    const { data, error } = await supabase.rpc('accept_alternative_slot', {
      p_consultation_id: consultationId,
      p_slot_index: slotIndex,
    });
    if (error) { throw error; }
    return data;
  } catch (error) {
    logger.error('대체 일정 수락 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('acceptAlternativeSlot failed');
    throw error;
  }
};

/**
 * 체결 — 상담을 끝내고 명의이전 트랙을 연다.
 *
 * 소유권·재고·매입가는 여기서 움직이지 않는다. 실제 명의이전은 관리자가
 * 오프라인으로 처리하고, 앱은 그 진행을 기록·표시만 한다.
 * 소유권이 실제로 바뀌는 시점은 advanceOwnershipTransfer('completed')다.
 *
 * @returns {Promise<string>} 생성된 ownership_transfers.id
 */
export const settleConsultation = async ({ consultationId, dealAmount, adminNotes = '' }) => {
  try {
    const { data, error } = await supabase.rpc('settle_consultation', {
      p_consultation_id: consultationId,
      p_deal_amount: Number(dealAmount),
      p_admin_notes: adminNotes || null,
    });
    if (error) { throw error; }
    return data;
  } catch (error) {
    logger.error('체결 처리 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('settleConsultation failed');
    throw error;
  }
};

/**
 * 미체결 — 상담만 닫는다.
 *
 * 상담 전 거절(rejected)과 다르다. 상담까지 하고 성사되지 않은 경우이고,
 * 사유는 받지 않는다(클릭 한 번으로 끝나는 편이 실제로 쓰인다).
 */
export const closeConsultationUnsettled = async (consultationId) => {
  try {
    const { error } = await supabase.rpc('close_consultation_unsettled', {
      p_consultation_id: consultationId,
    });
    if (error) { throw error; }
  } catch (error) {
    logger.error('미체결 처리 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('closeConsultationUnsettled failed');
    throw error;
  }
};

/**
 * 사용자 상담 취소.
 * 취소 가능 상태 검증은 DB 트리거(guard_consultation_user_update)가 강제하며,
 * 여기서는 사용자 친화 메시지를 위해 사전 확인만 한다.
 */
export const cancelConsultation = async (consultationId) => {
  try {
    const { data: current, error: readError } = await supabase
      .from('consultation_requests')
      .select('consultation_status')
      .eq('id', consultationId)
      .maybeSingle();
    if (readError) { throw readError; }
    if (!current) {
      return { success: false, error: '상담 정보를 찾을 수 없습니다.' };
    }

    const currentStatus = current.consultation_status;
    const cancellableStatuses = [
      CONSULTATION_STATUS.PENDING,
      CONSULTATION_STATUS.CONFIRMED,
      CONSULTATION_STATUS.ON_HOLD,
    ];

    if (!cancellableStatuses.includes(currentStatus)) {
      let errorMessage;
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
      return { success: false, error: errorMessage };
    }

    const { error } = await supabase
      .from('consultation_requests')
      .update({
        consultation_status: CONSULTATION_STATUS.CANCELLED,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', consultationId);
    if (error) { throw error; }

    logger.debug('✅ 상담 취소 성공');
    return { success: true };
  } catch (error) {
    logger.error('❌ 상담 취소 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('cancelConsultation failed');
    return { success: false, error: '상담 취소 중 오류가 발생했습니다.' };
  }
};

/**
 * 거절된 상담 재신청 (새 일정).
 * 새 일정의 슬롯 충돌은 UNIQUE 인덱스가 update 시에도 원자 거부한다.
 */
export const resubmitConsultation = async (consultationId, preferredDate, preferredTime) => {
  try {
    const { error } = await supabase
      .from('consultation_requests')
      .update({
        consultation_status: 'pending',
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        rejection_reason: null,
        alternative_slots: null,
        rejected_at: null,
        resubmitted_at: new Date().toISOString(),
      })
      .eq('id', consultationId);
    if (error) {
      error.slotConflict = isSlotConflict(error);
      throw error;
    }
    return { success: true };
  } catch (error) {
    logger.error('상담 재신청 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('resubmitConsultation failed');
    throw error;
  }
};

/**
 * 관리자 소유 차량 기록 생성 (멱등: consultation_id UNIQUE)
 */
export const createAdminOwnedVehicle = async (vehicleData) => {
  try {
    const { data, error } = await supabase
      .from('admin_owned_vehicles')
      .insert(appToRow({
        vehicleId: vehicleData.vehicleId,
        consultationId: vehicleData.consultationId || null,
        vehicleName: vehicleData.vehicleName,
        purchasePrice: vehicleData.purchasePrice,
        previousOwnerId: vehicleData.previousOwnerId,
        previousOwnerName: vehicleData.previousOwnerName,
        status: vehicleData.status || 'owned',
        soldPrice: vehicleData.soldPrice || null,
      }))
      .select('id')
      .single();
    if (error) { throw error; }
    return { success: true, id: data.id };
  } catch (error) {
    logger.error('관리자 소유 차량 생성 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('createAdminOwnedVehicle failed');
    Alert.alert('오류', '차량 등록에 실패했습니다.');
    return { success: false, error };
  }
};

/**
 * 관리자 소유 차량 갱신
 */
export const updateAdminOwnedVehicle = async (recordId, updateData) => {
  try {
    const { error } = await supabase
      .from('admin_owned_vehicles')
      .update(appToRow(updateData))
      .eq('id', recordId);
    if (error) { throw error; }
    return { success: true };
  } catch (error) {
    logger.error('관리자 소유 차량 갱신 오류:', error);
    reportCrashlyticsError(error);
    logCrashlyticsMessage('updateAdminOwnedVehicle failed');
    throw error;
  }
};

export { consultationRowToApp };
