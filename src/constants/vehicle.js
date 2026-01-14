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
