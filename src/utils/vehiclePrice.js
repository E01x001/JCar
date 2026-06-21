// src/utils/vehiclePrice.js
/**
 * Vehicle price visibility rules.
 *
 * 가격은 거래 단계(dealStage)가 아니라 "보는 사람이 누구인가"로 결정된다:
 * - 관리자: 모든 차량 가격을 본다
 * - 해당 차량의 소유자(본인): 본인이 설정한 가격만 본다
 * - 그 외 일반 구매자: 어떤 차량의 가격도 볼 수 없다
 *
 * @see canViewVehiclePrice
 */

/**
 * 주어진 뷰어가 해당 차량의 가격을 볼 수 있는지 판단한다.
 *
 * @param {Object} vehicle - 차량 객체(currentOwnerId/sellerId 포함)
 * @param {Object} viewer - 뷰어 정보 { uid, role }
 * @returns {boolean} 가격 표시 가능 여부
 */
export const canViewVehiclePrice = (vehicle, viewer) => {
  if (!vehicle || !viewer) { return false; }
  if (viewer.role === 'admin') { return true; }

  const ownerId = vehicle.currentOwnerId || vehicle.sellerId;
  return Boolean(viewer.uid) && ownerId === viewer.uid;
};

/**
 * 가격 비공개 시 노출할 안내 문구.
 */
export const PRICE_HIDDEN_LABEL = '상담 후 안내';
