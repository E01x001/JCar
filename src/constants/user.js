/**
 * User Constants
 *
 * Central location for all user-related constant values.
 * Use these constants instead of magic strings throughout the codebase.
 *
 * @module constants/user
 */

/**
 * User Roles
 *
 * Defines access levels in the application:
 * - USER: Regular user (can register vehicles, request consultations)
 * - ADMIN: Administrator (can approve vehicles, manage consultations, access admin features)
 */
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

/**
 * Account Status
 *
 * Represents the state of a user account:
 * - ACTIVE: Normal active account
 * - SUSPENDED: Temporarily suspended (will be reactivated after suspendedUntil date)
 * - BANNED: Permanently banned
 * - PENDING_DELETION: Marked for deletion (soft delete with 30-day recovery period)
 */
export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
  PENDING_DELETION: 'pending_deletion',
};

/**
 * User Role Labels for UI Display (Korean)
 */
export const USER_ROLE_LABELS = {
  [USER_ROLES.USER]: '일반 사용자',
  [USER_ROLES.ADMIN]: '관리자',
};

/**
 * Account Status Labels for UI Display (Korean)
 */
export const ACCOUNT_STATUS_LABELS = {
  [ACCOUNT_STATUS.ACTIVE]: '활성',
  [ACCOUNT_STATUS.SUSPENDED]: '정지됨',
  [ACCOUNT_STATUS.BANNED]: '영구 정지',
  [ACCOUNT_STATUS.PENDING_DELETION]: '삭제 예정',
};

/**
 * User Data Fields
 *
 * Standard field names used in user documents:
 */
export const USER_FIELDS = {
  UID: 'uid',
  NAME: 'name',
  EMAIL: 'email',
  PHONE_NUMBER: 'phoneNumber',
  ROLE: 'role',
  ACCOUNT_STATUS: 'accountStatus',
  SUSPENDED_UNTIL: 'suspendedUntil',
  SUSPENSION_REASON: 'suspensionReason',
  FCM_TOKEN: 'fcmToken',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
};

/**
 * Check if user is admin
 *
 * @param {Object} user - User object with role property
 * @return {boolean} True if user is admin
 */
export const isAdmin = (user) => {
  return user?.role === USER_ROLES.ADMIN;
};

/**
 * Check if account is active
 *
 * @param {Object} user - User object with accountStatus property
 * @return {boolean} True if account is active
 */
export const isAccountActive = (user) => {
  return !user?.accountStatus || user.accountStatus === ACCOUNT_STATUS.ACTIVE;
};

/**
 * Check if account is suspended
 *
 * @param {Object} user - User object with accountStatus property
 * @return {boolean} True if account is suspended or banned
 */
export const isAccountSuspended = (user) => {
  return user?.accountStatus === ACCOUNT_STATUS.SUSPENDED ||
         user?.accountStatus === ACCOUNT_STATUS.BANNED;
};
