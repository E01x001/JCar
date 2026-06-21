/**
 * Vehicle Constants
 *
 * Central location for all vehicle-related constant values.
 * Use these constants instead of magic strings throughout the codebase.
 *
 * @module constants/vehicle
 */

/**
 * Vehicle Registration Status
 *
 * Represents the approval lifecycle of a registered vehicle:
 * - PENDING: Initial state after seller registers the vehicle
 * - APPROVED: Admin has approved the vehicle for listing
 * - REJECTED: Admin has rejected the vehicle registration
 */
export const VEHICLE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

/**
 * Vehicle Deal Stage (거래 단계 축)
 *
 * Separate from VEHICLE_STATUS (검수 축). Tracks the C2B2C trade lifecycle:
 * - LISTED: 검수 통과·노출 중, 아직 관리자가 매입하지 않은 판매자 소유 차량
 * - ACQUIRING: 구매 희망자의 상담이 들어와 관리자 매입을 진행 중
 * - IN_STOCK: 관리자가 매입 완료한 재고 차량(즉시 거래 가능)
 * - SOLD: 구매자에게 판매 완료
 */
export const DEAL_STAGE = {
  LISTED: 'listed',
  ACQUIRING: 'acquiring',
  IN_STOCK: 'in_stock',
  SOLD: 'sold',
};

/**
 * Deal stages that should appear in the buyer-facing marketplace listing.
 * acquiring(매입진행중)도 노출 유지 — 무계약금 단순 상담으로 매물을 감추지 않고
 * "매입진행중" 배지로 표시한다(설계 결정). sold만 목록에서 제외.
 */
export const DEAL_STAGE_VISIBLE = [DEAL_STAGE.LISTED, DEAL_STAGE.ACQUIRING, DEAL_STAGE.IN_STOCK];

/**
 * Deal Stage Labels for UI Display (Korean)
 */
export const DEAL_STAGE_LABELS = {
  [DEAL_STAGE.LISTED]: '매입예정',
  [DEAL_STAGE.ACQUIRING]: '매입진행중',
  [DEAL_STAGE.IN_STOCK]: '즉시거래',
  [DEAL_STAGE.SOLD]: '판매완료',
};

/**
 * Deal Stage → Badge status 매핑 (Badge 컴포넌트 색 재사용)
 */
export const DEAL_STAGE_BADGE_STATUS = {
  [DEAL_STAGE.LISTED]: 'pending',     // 매입예정 (대기 톤)
  [DEAL_STAGE.ACQUIRING]: 'on-hold',  // 매입진행중
  [DEAL_STAGE.IN_STOCK]: 'approved',  // 즉시거래 (가능 톤)
  [DEAL_STAGE.SOLD]: 'archived',      // 판매완료
};

/**
 * Vehicle Types (Korean classification)
 *
 * Valid vehicle type categories from external CarZen API:
 * - 승용차: Passenger car
 * - 택시: Taxi
 * - 렌터카: Rental car
 * - 화물차: Cargo truck
 * - 군용차: Military vehicle
 * - 외교차: Diplomatic vehicle
 */
export const VEHICLE_TYPES = [
  '승용차',
  '택시',
  '렌터카',
  '화물차',
  '군용차',
  '외교차',
];

/**
 * Vehicle Status Labels for UI Display (Korean)
 */
export const VEHICLE_STATUS_LABELS = {
  [VEHICLE_STATUS.PENDING]: '승인 대기',
  [VEHICLE_STATUS.APPROVED]: '승인됨',
  [VEHICLE_STATUS.REJECTED]: '거절됨',
};

/**
 * Vehicle Status Colors for UI (matches theme colors)
 */
export const VEHICLE_STATUS_COLORS = {
  [VEHICLE_STATUS.PENDING]: '#FFA500', // warning.main
  [VEHICLE_STATUS.APPROVED]: '#4CAF50', // success.main
  [VEHICLE_STATUS.REJECTED]: '#F44336', // error.main
};

/**
 * Valid Vehicle Type Checker
 *
 * @param {string} vehicleType - Vehicle type to validate
 * @return {boolean} True if vehicle type is valid
 */
export const isValidVehicleType = (vehicleType) => {
  return VEHICLE_TYPES.includes(vehicleType);
};

/**
 * Vehicle Data Fields
 *
 * Standard field names used in vehicle documents:
 */
export const VEHICLE_FIELDS = {
  VEHICLE_ID: 'vehicleId',
  VEHICLE_NAME: 'vehicleName',
  MANUFACTURER: 'manufacturer',
  YEAR: 'year',
  MILEAGE: 'mileage',
  PRICE: 'price',
  COLOR: 'color',
  FUEL_TYPE: 'fuelType',
  TRANSMISSION: 'transmission',
  STATUS: 'status',
  SELLER_ID: 'sellerId',
  SELLER_NAME: 'sellerName',
  SELLER_PHONE: 'sellerPhone',
  CURRENT_OWNER_ID: 'currentOwnerId',
  CURRENT_OWNER_NAME: 'currentOwnerName',
  IMAGE_URLS: 'imageUrls',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
};

/**
 * Fuel Types (Korean)
 */
export const FUEL_TYPES = [
  '가솔린',
  '디젤',
  'LPG',
  '하이브리드',
  '전기',
  '수소',
];

/**
 * Transmission Types (Korean)
 */
export const TRANSMISSION_TYPES = [
  '자동',
  '수동',
];
