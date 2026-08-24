/**
 * Ownership Transfer Service (Phase 2 — Firestore 트랜잭션 → Supabase 순차 업데이트)
 *
 * 관리자 전용 코드. RLS(admin 정책)가 vehicles/consultation_requests 업데이트와
 * ownership_transfers/ownership_transfer_audit_logs insert를 허용한다.
 * Firestore 시절의 원자 트랜잭션은 클라이언트에서 재현 불가하므로
 * 검증 → 이전기록 insert → 차량 update → 상담 archive 순으로 진행하고,
 * 성공/실패를 audit log에 남긴다. (Analytics/Perf 트레이스는 제거)
 */

import { supabase } from '../lib/supabase';
import { rowToApp } from '../lib/mappers';
import { logger } from '../utils/logger';
import { DEAL_STAGE } from '../constants/vehicle';
import { reportCrashlyticsError, logCrashlyticsMessage } from './notification/notificationService';

/** audit log insert — 실패는 무시(best-effort) */
const writeAuditLog = async ({ transferType, vehicleId, consultationId, status, durationMs, detail }) => {
  try {
    const { error } = await supabase.from('ownership_transfer_audit_logs').insert({
      transfer_type: transferType,
      vehicle_id: vehicleId,
      consultation_id: consultationId,
      status,
      duration_ms: durationMs,
      detail: detail || null,
    });
    if (error) { throw error; }
  } catch (auditError) {
    logger.error('Failed to create audit log:', auditError);
  }
};

/** 이전 대상 차량/상담 공통 검증 — 통과 시 {vehicle, consultation} 반환 */
const loadAndValidate = async (vehicleId, consultationRequestId) => {
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id, seller_id, current_owner_id, is_admin_owned, deal_stage, status')
    .eq('id', vehicleId)
    .maybeSingle();
  if (vehicleError) { throw vehicleError; }
  if (!vehicle) {
    throw new Error(`차량을 찾을 수 없습니다 (ID: ${vehicleId})`);
  }

  const { data: consultation, error: consultationError } = await supabase
    .from('consultation_requests')
    .select('id, consultation_status, deal_amount')
    .eq('id', consultationRequestId)
    .maybeSingle();
  if (consultationError) { throw consultationError; }
  if (!consultation) {
    throw new Error(`상담 요청을 찾을 수 없습니다 (ID: ${consultationRequestId})`);
  }

  if (['archived', 'completed'].includes(consultation.consultation_status)) {
    throw new Error(`이미 처리된 상담입니다 (상태: ${consultation.consultation_status})`);
  }

  return { vehicle, consultation };
};

/**
 * Transfer vehicle ownership from seller to admin (매입)
 *
 * @param {string} vehicleId - vehicles.id (uuid)
 * @param {string} sellerId - Current owner's UID (for validation)
 * @param {string} consultationRequestId - consultation_requests.id (uuid)
 * @param {string} adminId - Admin user's UID
 * @param {number} price - Transfer price in KRW
 * @returns {Promise<{success: boolean, transferId?: string, error?: Object}>}
 */
export const transferVehicleToAdmin = async (
  vehicleId,
  sellerId,
  consultationRequestId,
  adminId,
  price
) => {
  const startTime = Date.now();

  try {
    logger.debug('🔄 Starting transferVehicleToAdmin', {
      vehicleId, sellerId, consultationRequestId, adminId, price,
    });

    const { vehicle, consultation } = await loadAndValidate(vehicleId, consultationRequestId);

    // Validation: Seller is current owner
    const currentOwner = vehicle.current_owner_id || vehicle.seller_id;
    if (currentOwner !== sellerId) {
      throw new Error(
        `소유권 검증 실패: 현재 소유자(${currentOwner})가 판매자(${sellerId})와 일치하지 않습니다`
      );
    }

    const transferPrice = price || consultation.deal_amount || 0;

    // 1) 이전 기록 생성
    const { data: transfer, error: transferError } = await supabase
      .from('ownership_transfers')
      .insert({
        vehicle_id: vehicleId,
        consultation_id: consultationRequestId,
        from_user_id: sellerId,
        to_user_id: null, // null = admin
        transfer_type: 'sell_to_admin',
        price: transferPrice,
        notes: `Transferred via consultation ${consultationRequestId}`,
      })
      .select('id')
      .single();
    if (transferError) { throw transferError; }
    const transferId = transfer.id;

    // 2) 차량 소유권 이전 (매입 완료 → 재고, 노출 유지)
    const { error: vehicleUpdateError } = await supabase
      .from('vehicles')
      .update({
        current_owner_id: adminId,
        is_admin_owned: true,
        deal_stage: DEAL_STAGE.IN_STOCK,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vehicleId);
    if (vehicleUpdateError) { throw vehicleUpdateError; }

    // 3) 상담 archive + 이전 표시
    const { error: consultationUpdateError } = await supabase
      .from('consultation_requests')
      .update({
        consultation_status: 'archived',
        is_ownership_transferred: true,
        transfer_id: transferId,
      })
      .eq('id', consultationRequestId);
    if (consultationUpdateError) { throw consultationUpdateError; }

    const duration = Date.now() - startTime;
    await writeAuditLog({
      transferType: 'sell_to_admin',
      vehicleId,
      consultationId: consultationRequestId,
      status: 'completed',
      durationMs: duration,
      detail: {
        transferId,
        fromUserId: sellerId,
        toUserId: null,
        adminId,
        price: transferPrice,
        initiatedBy: adminId,
        completedAt: new Date().toISOString(),
      },
    });

    logger.debug('✅ transferVehicleToAdmin completed', { transferId, vehicleId, consultationRequestId });
    return { success: true, transferId };
  } catch (error) {
    logger.error('❌ transferVehicleToAdmin failed:', error);

    await writeAuditLog({
      transferType: 'sell_to_admin',
      vehicleId,
      consultationId: consultationRequestId,
      status: 'failed',
      durationMs: Date.now() - startTime,
      detail: {
        fromUserId: sellerId,
        toUserId: null,
        adminId,
        price: price || 0,
        error: { message: error.message, code: error.code },
        failedAt: new Date().toISOString(),
      },
    });

    reportCrashlyticsError(error);
    logCrashlyticsMessage(
      `transferVehicleToAdmin failed for vehicle ${vehicleId}, consultation ${consultationRequestId}`
    );

    return {
      success: false,
      error: {
        message: error.message || '차량 소유권 이전 중 오류가 발생했습니다. 다시 시도해 주세요.',
        code: error.code,
        details: error,
      },
    };
  }
};

/**
 * Transfer vehicle ownership from admin to buyer (판매)
 *
 * @param {string} vehicleId - vehicles.id (uuid)
 * @param {string} adminId - Admin user's UID (for validation)
 * @param {string} buyerId - Buyer's UID
 * @param {string} consultationRequestId - consultation_requests.id (uuid)
 * @param {number} soldPrice - Sale price in KRW
 * @returns {Promise<{success: boolean, transferId?: string, error?: Object}>}
 */
export const transferVehicleToBuyer = async (
  vehicleId,
  adminId,
  buyerId,
  consultationRequestId,
  soldPrice
) => {
  const startTime = Date.now();

  try {
    logger.debug('🔄 Starting transferVehicleToBuyer', {
      vehicleId, adminId, buyerId, consultationRequestId, soldPrice,
    });

    if (!soldPrice || soldPrice < 0) {
      throw new Error('판매 가격이 유효하지 않습니다');
    }

    const { vehicle } = await loadAndValidate(vehicleId, consultationRequestId);

    if (!vehicle.is_admin_owned) {
      throw new Error(`관리자 소유 차량이 아닙니다 (isAdminOwned: ${vehicle.is_admin_owned})`);
    }
    if (vehicle.current_owner_id !== adminId) {
      throw new Error(`현재 소유자가 관리자가 아닙니다 (currentOwnerId: ${vehicle.current_owner_id})`);
    }

    // 1) 이전 기록 생성
    const { data: transfer, error: transferError } = await supabase
      .from('ownership_transfers')
      .insert({
        vehicle_id: vehicleId,
        consultation_id: consultationRequestId,
        from_user_id: null, // null = admin
        to_user_id: buyerId,
        transfer_type: 'admin_to_buyer',
        price: soldPrice,
        notes: `Sold to buyer via consultation ${consultationRequestId}`,
      })
      .select('id')
      .single();
    if (transferError) { throw transferError; }
    const transferId = transfer.id;

    // 2) 차량 판매 처리 (노출 목록에서 제외)
    const { error: vehicleUpdateError } = await supabase
      .from('vehicles')
      .update({
        current_owner_id: buyerId,
        is_admin_owned: false,
        status: 'sold',
        deal_stage: DEAL_STAGE.SOLD,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vehicleId);
    if (vehicleUpdateError) { throw vehicleUpdateError; }

    // 3) 상담 archive + 거래액 기록
    const { error: consultationUpdateError } = await supabase
      .from('consultation_requests')
      .update({
        consultation_status: 'archived',
        is_ownership_transferred: true,
        transfer_id: transferId,
        deal_amount: soldPrice,
      })
      .eq('id', consultationRequestId);
    if (consultationUpdateError) { throw consultationUpdateError; }

    const duration = Date.now() - startTime;
    await writeAuditLog({
      transferType: 'admin_to_buyer',
      vehicleId,
      consultationId: consultationRequestId,
      status: 'completed',
      durationMs: duration,
      detail: {
        transferId,
        fromUserId: null,
        toUserId: buyerId,
        adminId,
        price: soldPrice,
        initiatedBy: adminId,
        completedAt: new Date().toISOString(),
      },
    });

    logger.debug('✅ transferVehicleToBuyer completed', {
      transferId, vehicleId, buyerId, consultationRequestId,
    });
    return { success: true, transferId };
  } catch (error) {
    logger.error('❌ transferVehicleToBuyer failed:', error);

    await writeAuditLog({
      transferType: 'admin_to_buyer',
      vehicleId,
      consultationId: consultationRequestId,
      status: 'failed',
      durationMs: Date.now() - startTime,
      detail: {
        fromUserId: null,
        toUserId: buyerId,
        adminId,
        price: soldPrice || 0,
        error: { message: error.message, code: error.code },
        failedAt: new Date().toISOString(),
      },
    });

    reportCrashlyticsError(error);
    logCrashlyticsMessage(
      `transferVehicleToBuyer failed for vehicle ${vehicleId}, consultation ${consultationRequestId}, buyer ${buyerId}`
    );

    return {
      success: false,
      error: {
        message: error.message || '차량 판매 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
        code: error.code,
        details: error,
      },
    };
  }
};

/**
 * Get ownership transfer history for a vehicle
 * @param {string} vehicleId - vehicles.id (uuid)
 * @returns {Promise<Array>} camelCase transfer records (transferId 별칭 포함)
 */
export const getVehicleOwnershipHistory = async (vehicleId) => {
  try {
    const { data, error } = await supabase
      .from('ownership_transfers')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('transferred_at', { ascending: false });
    if (error) { throw error; }
    return data.map((row) => ({ ...rowToApp(row), transferId: row.id }));
  } catch (error) {
    logger.error('Failed to get ownership history:', error);
    reportCrashlyticsError(error);
    return [];
  }
};

/**
 * Get all ownership transfers (admin only)
 * @param {number} limitCount - Maximum number of records to return
 * @returns {Promise<Array>} camelCase transfer records
 */
export const getAllOwnershipTransfers = async (limitCount = 50) => {
  try {
    const { data, error } = await supabase
      .from('ownership_transfers')
      .select('*')
      .order('transferred_at', { ascending: false })
      .limit(limitCount);
    if (error) { throw error; }
    return data.map((row) => ({ ...rowToApp(row), transferId: row.id }));
  } catch (error) {
    logger.error('Failed to get ownership transfers:', error);
    reportCrashlyticsError(error);
    return [];
  }
};

/**
 * 명의이전 진행 상태 변경.
 *
 * 실제 명의이전은 관리자가 오프라인(등록원부)으로 처리한다. 앱은 그 진행을
 * 기록·표시만 하고, **'completed'로 넘길 때만** 앱 쪽 소유권이 움직인다
 * (RPC advance_ownership_transfer 안에서 한 트랜잭션으로 처리된다).
 *
 * @param {string} transferId - ownership_transfers.id
 * @param {'pending'|'in_progress'|'completed'} status
 */
export const advanceOwnershipTransfer = async (transferId, status) => {
  const { error } = await supabase.rpc('advance_ownership_transfer', {
    p_transfer_id: transferId,
    p_status: status,
  });
  if (error) {
    logger.error('명의이전 상태 변경 실패:', error);
    throw error;
  }
};

/**
 * 상담에 딸린 명의이전 1건.
 *
 * RLS가 당사자(판매자·구매자)와 관리자에게만 열어준다 — 신청자도 자기 거래의
 * 진행 상태를 볼 수 있어야 하기 때문이다.
 *
 * @returns {Promise<Object|null>}
 */
export const getTransferByConsultation = async (consultationId) => {
  const { data, error } = await supabase
    .from('ownership_transfers')
    .select('*')
    .eq('consultation_id', consultationId)
    .maybeSingle();
  if (error) { throw error; }
  return data ? rowToApp(data) : null;
};
