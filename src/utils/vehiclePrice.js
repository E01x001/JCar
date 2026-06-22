// src/utils/vehiclePrice.js
/**
 * Vehicle price visibility rules.
 *
 * 가격은 관리자만 볼 수 있다. 일반 사용자(차량 소유자 포함)는 어떤 화면에서도
 * 가격을 보지 않으며, 가격은 오직 관리자와의 상담을 통해서만 안내된다.
 *
 * @see canViewVehiclePrice
 */

/**
 * 주어진 뷰어가 해당 차량의 가격을 볼 수 있는지 판단한다(관리자만 true).
 *
 * @param {Object} vehicle - 차량 객체
 * @param {Object} viewer - 뷰어 정보 { uid, role }
 * @returns {boolean} 가격 표시 가능 여부
 */
export const canViewVehiclePrice = (vehicle, viewer) => {
  if (!viewer) { return false; }
  return viewer.role === 'admin';
};

/**
 * 가격 비공개 시 노출할 안내 문구.
 */
export const PRICE_HIDDEN_LABEL = '상담 후 안내';
