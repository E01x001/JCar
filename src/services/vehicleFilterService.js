// src/services/vehicleFilterService.js
// Phase 2b: Firestore → Supabase. 화면이 쓰는 export 시그니처는 그대로 유지한다.
import { supabase } from '../lib/supabase';
import { vehicleRowToApp } from '../lib/mappers';
import { subscribeVehicles } from './vehicle/supabaseVehicleService';
import { logger } from '../utils/logger';

/**
 * 가격 포함 행 매핑.
 * vehicle_pricing은 admin 전용 RLS — 관리자에겐 join으로 price가 오고,
 * 일반 사용자에겐 null이 온다(가격 비공개 정책이 DB 레벨에서 강제됨).
 */
const rowWithPricingToApp = (row) => {
  const { vehicle_pricing: pricing, ...rest } = row;
  const v = vehicleRowToApp(rest);
  return { ...v, price: pricing?.price ?? null };
};

/**
 * 필터를 적용하여 차량 목록 조회.
 * @param {Object} filters - { minPrice, maxPrice, minYear, maxYear, manufacturers, sortBy }
 *   (만원 단위 문자열 입력은 기존 UI 그대로)
 */
export const getFilteredVehicles = async (filters = {}) => {
  try {
    let query = supabase
      .from('vehicles')
      .select('*, vehicle_pricing(price)')
      .eq('status', 'approved')
      .eq('hidden', false)
      .limit(300);

    // 연식 필터는 DB에서 처리
    const minYear = filters.minYear ? parseInt(filters.minYear, 10) : null;
    const maxYear = filters.maxYear ? parseInt(filters.maxYear, 10) : null;
    if (minYear) { query = query.gte('year', minYear); }
    if (maxYear) { query = query.lte('year', maxYear); }

    // 제조사 필터
    if (filters.manufacturers && filters.manufacturers.length > 0) {
      query = query.in('manufacturer', filters.manufacturers);
    }

    // 정렬: 연식/최신은 DB, 가격은 join 값이라 클라 정렬(관리자 전용)
    const sortBy = filters.sortBy || '';
    if (sortBy === 'year_asc') { query = query.order('year', { ascending: true }); }
    else if (sortBy === 'year_desc') { query = query.order('year', { ascending: false }); }
    else { query = query.order('created_at', { ascending: false }); }

    const { data, error } = await query;
    if (error) { throw error; }

    let vehicles = data.map(rowWithPricingToApp);

    // 가격 범위/정렬 (관리자만 의미 있음 — 일반 사용자는 price=null)
    const minPrice = filters.minPrice ? parseInt(filters.minPrice, 10) * 10000 : null;
    const maxPrice = filters.maxPrice ? parseInt(filters.maxPrice, 10) * 10000 : null;
    if (minPrice) { vehicles = vehicles.filter((v) => v.price != null && v.price >= minPrice); }
    if (maxPrice) { vehicles = vehicles.filter((v) => v.price != null && v.price <= maxPrice); }
    if (sortBy === 'price_asc') { vehicles = [...vehicles].sort((a, b) => (a.price ?? 0) - (b.price ?? 0)); }
    else if (sortBy === 'price_desc') { vehicles = [...vehicles].sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); }

    return vehicles;
  } catch (error) {
    logger.error('차량 필터링 오류:', error);
    throw error;
  }
};

/**
 * 실시간으로 필터링된 차량 목록을 구독.
 * @returns {Function} unsubscribe
 */
export const subscribeToFilteredVehicles = (filters, callback) => {
  return subscribeVehicles(() => getFilteredVehicles(filters), callback, {
    channelKey: 'vehicles-filtered',
  });
};

/**
 * 필터가 비어있는지 확인
 */
export const isFilterEmpty = (filters, defaultSortBy = 'price_asc') => {
  return (
    !filters.minPrice &&
    !filters.maxPrice &&
    !filters.minYear &&
    !filters.maxYear &&
    (!filters.manufacturers || filters.manufacturers.length === 0) &&
    filters.sortBy === defaultSortBy
  );
};

/**
 * 활성화된 필터 개수 계산
 */
export const getActiveFilterCount = (filters, defaultSortBy = 'price_asc') => {
  let count = 0;

  if (filters.minPrice || filters.maxPrice) {count++;}
  if (filters.minYear || filters.maxYear) {count++;}
  if (filters.manufacturers && filters.manufacturers.length > 0) {count++;}
  if (filters.sortBy && filters.sortBy !== defaultSortBy) {count++;}

  return count;
};
