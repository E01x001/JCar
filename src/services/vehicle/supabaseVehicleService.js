/**
 * Supabase Vehicle Service (Phase 2b — Firestore vehicles 대체)
 *
 * - 조회/구독/등록/수정/삭제의 단일 진입점. 화면·스토어는 camelCase만 다루고
 *   snake_case 변환은 lib/mappers가 담당한다.
 * - Realtime: postgres_changes 수신 시 재조회(coarse refetch) 방식.
 *   RLS가 구독에도 적용되므로 비노출 차량 변경은 수신되지 않는다.
 * - 가격: vehicles 테이블에 없음(vehicle_pricing, admin 전용). 관리자 화면은
 *   fetchVehiclePricing으로 별도 조회한다. 일반 사용자는 RLS로 차단.
 */
import { supabase } from '../../lib/supabase';
import { vehicleRowToApp, appToRow } from '../../lib/mappers';
import { logger } from '../../utils/logger';

const VEHICLE_SELECT = '*';

/** 노출 매물 목록 (approved & not hidden — RLS와 동일 조건을 쿼리에도 명시) */
export const fetchExposedVehicles = async ({ limit = 200 } = {}) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select(VEHICLE_SELECT)
    .eq('status', 'approved')
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { throw error; }
  return data.map(vehicleRowToApp);
};

/** 내 차량 목록 (판매자/현소유자) */
export const fetchMyVehicles = async (userId, { limit = 100 } = {}) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select(VEHICLE_SELECT)
    .or(`seller_id.eq.${userId},current_owner_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { throw error; }
  return data.map(vehicleRowToApp);
};

/** 전체 차량 (관리자 — RLS가 admin만 전체 반환) */
export const fetchAllVehicles = async ({ limit = 500 } = {}) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select(VEHICLE_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { throw error; }
  return data.map(vehicleRowToApp);
};

/** 단일 차량 */
export const fetchVehicleById = async (id) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select(VEHICLE_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) { throw error; }
  return data ? vehicleRowToApp(data) : null;
};

/** 가격 조회 (관리자 전용 — 비관리자는 RLS로 빈 결과) */
export const fetchVehiclePricing = async (vehicleId) => {
  const { data, error } = await supabase
    .from('vehicle_pricing')
    .select('vehicle_id, price, purchase_price')
    .eq('vehicle_id', vehicleId)
    .maybeSingle();
  if (error) { throw error; }
  return data ? { vehicleId: data.vehicle_id, price: data.price, purchasePrice: data.purchase_price } : null;
};

/**
 * 가격 일괄 조회 — 관리자 목록용.
 *
 * fetchVehiclePricing은 한 대씩 가져온다. 목록에서 그대로 쓰면 차량 수만큼
 * 요청이 나가고, 실제로는 그마저 안 하고 있어서 목록의 "가격:" 자리가 값 없이
 * 라벨만 남아 있었다. 한 번에 가져와 id로 찾아 쓴다.
 *
 * 비관리자는 RLS가 빈 결과를 준다 — 호출해도 아무것도 새지 않는다.
 *
 * @returns {Promise<Object>} { [vehicleId]: { price, purchasePrice } }
 */
export const fetchAllVehiclePricing = async () => {
  const { data, error } = await supabase
    .from('vehicle_pricing')
    .select('vehicle_id, price, purchase_price');
  if (error) { throw error; }

  const map = {};
  for (const row of data ?? []) {
    map[row.vehicle_id] = { price: row.price, purchasePrice: row.purchase_price };
  }
  return map;
};

/**
 * 차량 등록 — 공개 정보 + 판매자 PII(비공개 테이블) 저장.
 * @param {Object} vehicle - camelCase 차량 공개 필드 (sellerId 필수)
 * @param {Object} contact - { sellerName, sellerPhone, sellerEmail, ownerName, regiNumber, vin }
 */
export const insertVehicle = async (vehicle, contact = null) => {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(appToRow(vehicle))
    .select('id')
    .single();
  if (error) { throw error; }

  if (contact) {
    const { error: contactError } = await supabase
      .from('vehicle_private_contact')
      .insert(appToRow({ ...contact, vehicleId: data.id, sellerId: vehicle.sellerId }));
    if (contactError) {
      // PII 저장 실패 시 공개 행도 되돌린다(고아 방지)
      await supabase.from('vehicles').delete().eq('id', data.id);
      throw contactError;
    }
  }
  return { id: data.id };
};

/** 소유 차량 수정(허용 컬럼은 DB 컬럼 그랜트가 제한) */
export const updateVehicle = async (id, updates) => {
  const { error } = await supabase
    .from('vehicles')
    .update(appToRow({ ...updates, updatedAt: new Date().toISOString() }))
    .eq('id', id);
  if (error) { throw error; }
  return { success: true };
};

/** 차량 삭제(소유자) */
export const deleteVehicle = async (id) => {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  if (error) { throw error; }
  return { success: true };
};

/**
 * Realtime 구독 — vehicles 변경 시 refetchFn을 다시 실행해 콜백에 전달.
 * @param {Function} refetchFn - () => Promise<Array> 재조회 함수
 * @param {Function} callback - (list) => void
 * @returns {Function} unsubscribe
 */
export const subscribeVehicles = (refetchFn, callback, { channelKey = 'vehicles' } = {}) => {
  let disposed = false;
  let timer = null;

  const load = async () => {
    try {
      const list = await refetchFn();
      if (!disposed) { callback(list); }
    } catch (error) {
      logger.error('차량 조회 오류:', error);
    }
  };

  // 변경 이벤트 몰림 방지: 300ms 디바운스 후 재조회
  const scheduleReload = () => {
    if (timer) { clearTimeout(timer); }
    timer = setTimeout(load, 300);
  };

  load(); // 초기 로드

  const channel = supabase
    .channel(`${channelKey}-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, scheduleReload)
    .subscribe();

  return () => {
    disposed = true;
    if (timer) { clearTimeout(timer); }
    supabase.removeChannel(channel);
  };
};

export default {
  fetchExposedVehicles,
  fetchMyVehicles,
  fetchAllVehicles,
  fetchVehicleById,
  fetchVehiclePricing,
  fetchAllVehiclePricing,
  insertVehicle,
  updateVehicle,
  deleteVehicle,
  subscribeVehicles,
};
