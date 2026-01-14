/**
 * Constants Barrel Export
 *
 * Central export point for all application constants.
 * Import from this file to access any constant:
 *
 * @example
 * import { CONSULTATION_STATUS, VEHICLE_STATUS, USER_ROLES } from '@/constants';
 *
 * @module constants
 */

// Consultation constants
export {
  CONSULTATION_STATUS,
  CONSULTATION_TYPE,
  CONSULTATION_STATUS_LABELS,
  CONSULTATION_TYPE_LABELS,
  CONSULTATION_STATUS_COLORS,
  VALID_STATUS_TRANSITIONS,
  isValidStatusTransition,
} from './consultation';

// Vehicle constants
export {
  VEHICLE_STATUS,
  VEHICLE_TYPES,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_COLORS,
  VEHICLE_FIELDS,
  FUEL_TYPES,
  TRANSMISSION_TYPES,
  isValidVehicleType,
} from './vehicle';

// User constants
export {
  USER_ROLES,
  ACCOUNT_STATUS,
  USER_ROLE_LABELS,
  ACCOUNT_STATUS_LABELS,
  USER_FIELDS,
  isAdmin,
  isAccountActive,
  isAccountSuspended,
} from './user';
