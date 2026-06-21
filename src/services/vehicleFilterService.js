// src/services/vehicleFilterService.js
import { getFirestore, collection, query, where, orderBy, getDocs, onSnapshot } from '@react-native-firebase/firestore';
import { logger } from '../utils/logger';

/**
 * 필터를 적용하여 차량 목록 조회
 * Firestore의 제한사항으로 인해 일부 필터는 클라이언트 사이드에서 처리
 *
 * @param {Object} filters - 필터 옵션
 * @param {string} filters.minPrice - 최소 가격 (만원)
 * @param {string} filters.maxPrice - 최대 가격 (만원)
 * @param {string} filters.minYear - 최소 연도
 * @param {string} filters.maxYear - 최대 연도
 * @param {Array} filters.manufacturers - 제조사 목록
 * @param {string} filters.sortBy - 정렬 기준 (price_asc, price_desc, year_asc, year_desc)
 * @returns {Promise<Array>} 필터링된 차량 목록
 */
export const getFilteredVehicles = async (filters) => {
  try {
    const db = getFirestore();
    const vehiclesRef = collection(db, 'vehicles');

    // 기본 쿼리: 노출 대상 = status 'approved' (listed/acquiring/in_stock는 모두 approved,
    // sold만 status='sold'로 제외됨). 규칙·인덱스 친화적이라 dealStage in 쿼리 대신 사용.
    const queryConstraints = [where('status', '==', 'approved')];

    // Firestore 쿼리로 처리할 수 있는 필터
    // 가격 필터 (Firestore에서 처리)
    const minPrice = filters.minPrice ? parseInt(filters.minPrice) * 10000 : null;
    const maxPrice = filters.maxPrice ? parseInt(filters.maxPrice) * 10000 : null;

    if (minPrice) {
      queryConstraints.push(where('price', '>=', minPrice));
    }
    if (maxPrice) {
      queryConstraints.push(where('price', '<=', maxPrice));
    }

    // 정렬 적용
    if (filters.sortBy) {
      const [field, direction] = filters.sortBy.split('_');
      queryConstraints.push(orderBy(field, direction === 'asc' ? 'asc' : 'desc'));
    }

    // 쿼리 실행
    const q = query(vehiclesRef, ...queryConstraints);
    const snapshot = await getDocs(q);

    let vehicles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Task 126: hide vehicles whose owner is in the account-deletion grace period
    vehicles = vehicles.filter(v => !v.hidden);

    // 클라이언트 사이드 필터링
    // 연도 필터 (Firestore 복합 쿼리 제한으로 클라이언트에서 처리)
    const minYear = filters.minYear ? parseInt(filters.minYear) : null;
    const maxYear = filters.maxYear ? parseInt(filters.maxYear) : null;

    if (minYear) {
      vehicles = vehicles.filter(v => v.year >= minYear);
    }
    if (maxYear) {
      vehicles = vehicles.filter(v => v.year <= maxYear);
    }

    // 제조사 필터 (클라이언트에서 처리)
    if (filters.manufacturers && filters.manufacturers.length > 0) {
      vehicles = vehicles.filter(v =>
        filters.manufacturers.includes(v.manufacturer)
      );
    }

    return vehicles;
  } catch (error) {
    logger.error('차량 필터링 오류:', error);
    throw error;
  }
};

/**
 * 실시간으로 필터링된 차량 목록을 구독
 *
 * @param {Object} filters - 필터 옵션
 * @param {Function} callback - 차량 목록 업데이트 시 호출되는 콜백
 * @returns {Function} unsubscribe 함수
 */
export const subscribeToFilteredVehicles = (filters, callback) => {
  try {
    const db = getFirestore();
    const vehiclesRef = collection(db, 'vehicles');

    // 기본 쿼리: 노출 대상 = status 'approved' (listed/acquiring/in_stock는 모두 approved,
    // sold만 status='sold'로 제외됨). 규칙·인덱스 친화적이라 dealStage in 쿼리 대신 사용.
    const queryConstraints = [where('status', '==', 'approved')];

    // 가격 필터 (Firestore에서 처리)
    const minPrice = filters.minPrice ? parseInt(filters.minPrice) * 10000 : null;
    const maxPrice = filters.maxPrice ? parseInt(filters.maxPrice) * 10000 : null;

    if (minPrice) {
      queryConstraints.push(where('price', '>=', minPrice));
    }
    if (maxPrice) {
      queryConstraints.push(where('price', '<=', maxPrice));
    }

    // 정렬 적용
    if (filters.sortBy) {
      const [field, direction] = filters.sortBy.split('_');
      queryConstraints.push(orderBy(field, direction === 'asc' ? 'asc' : 'desc'));
    }

    // 실시간 구독
    const q = query(vehiclesRef, ...queryConstraints);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let vehicles = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Task 126: hide vehicles whose owner is in the account-deletion grace period
        vehicles = vehicles.filter(v => !v.hidden);

        // 클라이언트 사이드 필터링
        const minYear = filters.minYear ? parseInt(filters.minYear) : null;
        const maxYear = filters.maxYear ? parseInt(filters.maxYear) : null;

        if (minYear) {
          vehicles = vehicles.filter(v => v.year >= minYear);
        }
        if (maxYear) {
          vehicles = vehicles.filter(v => v.year <= maxYear);
        }

        if (filters.manufacturers && filters.manufacturers.length > 0) {
          vehicles = vehicles.filter(v =>
            filters.manufacturers.includes(v.manufacturer)
          );
        }

        callback(vehicles);
      },
      (error) => {
        logger.error('차량 구독 오류:', error);
      }
    );

    return unsubscribe;
  } catch (error) {
    logger.error('차량 구독 설정 오류:', error);
    throw error;
  }
};

/**
 * 필터가 비어있는지 확인
 *
 * @param {Object} filters - 필터 옵션
 * @returns {boolean} 필터가 비어있으면 true
 */
export const isFilterEmpty = (filters) => {
  return (
    !filters.minPrice &&
    !filters.maxPrice &&
    !filters.minYear &&
    !filters.maxYear &&
    (!filters.manufacturers || filters.manufacturers.length === 0) &&
    filters.sortBy === 'price_asc'
  );
};

/**
 * 활성화된 필터 개수 계산
 *
 * @param {Object} filters - 필터 옵션
 * @returns {number} 활성화된 필터 개수
 */
export const getActiveFilterCount = (filters) => {
  let count = 0;

  if (filters.minPrice || filters.maxPrice) {count++;}
  if (filters.minYear || filters.maxYear) {count++;}
  if (filters.manufacturers && filters.manufacturers.length > 0) {count++;}
  if (filters.sortBy && filters.sortBy !== 'price_asc') {count++;}

  return count;
};
