/**
 * Firestore Collection Schemas
 *
 * This file defines the structure of Firestore documents using JSDoc comments.
 * These types serve as documentation and can be used for validation.
 */

/**
 * @typedef {Object} Vehicle
 * @property {string} vehicleId - Unique identifier for the vehicle
 * @property {string} vehicleName - Name/model of the vehicle
 * @property {string} manufacturer - Manufacturer/brand
 * @property {number} year - Manufacturing year
 * @property {string[]} imageUrl - Array of image URLs
 * @property {string} status - Vehicle status: 'pending' | 'approved' | 'rejected' | 'sold'
 * @property {firebase.firestore.Timestamp} createdAt - Creation timestamp
 *
 * --- Ownership Transfer Fields (Task 47) ---
 * @property {string|null} currentOwnerId - UID of current owner (replaces sellerId)
 * @property {OwnershipHistoryEntry[]} ownershipHistory - Array of ownership change records
 * @property {boolean} isAdminOwned - Whether vehicle is currently owned by admin (default: false)
 * @property {boolean} availableForPurchase - Whether vehicle is available for purchase (default: true)
 *
 * --- Other existing fields ---
 * @property {string} sellerId - (DEPRECATED: use currentOwnerId) Original seller ID
 * @property {number} price - Vehicle price
 * @property {number} mileage - Vehicle mileage
 * @property {string} fuelType - Fuel type
 * @property {string} transmission - Transmission type
 * @property {string} color - Vehicle color
 * @property {string} description - Vehicle description
 */

/**
 * @typedef {Object} OwnershipHistoryEntry
 * @property {string} transferId - Reference to ownership_transfers document ID
 * @property {firebase.firestore.Timestamp} transferredAt - Transfer timestamp
 * @property {string|null} fromUserId - Previous owner UID (null for initial admin acquisition)
 * @property {string|null} toUserId - New owner UID (null when transferred to admin)
 * @property {'sell_to_admin'|'admin_to_buyer'} transferType - Type of ownership transfer
 * @property {number} price - Transfer price
 */

/**
 * @typedef {Object} OwnershipTransfer
 * @property {string} transferId - Document ID (auto-generated)
 * @property {string} vehicleId - Reference to vehicles collection document ID
 * @property {string|null} consultationId - Reference to consultation_requests document ID (nullable)
 * @property {string|null} fromUserId - UID of user selling (null if admin is seller)
 * @property {string|null} toUserId - UID of user buying (null if admin is buyer)
 * @property {'sell_to_admin'|'admin_to_buyer'} transferType - Type of transfer
 * @property {firebase.firestore.Timestamp} transferredAt - Transfer timestamp
 * @property {number} price - Transfer amount
 * @property {string|null} notes - Optional notes about the transfer
 *
 * @description New collection to track all vehicle ownership transfers
 */

/**
 * @typedef {Object} ConsultationRequest
 * @property {string} id - Document ID
 * @property {string} userId - User who requested consultation
 * @property {string} vehicleId - Vehicle being consulted about
 * @property {string} preferredDate - Preferred consultation date
 * @property {string} preferredTime - Preferred consultation time
 * @property {'buy'|'sell'} type - Type of consultation
 * @property {string} consultationStatus - Status: 'pending'|'approved'|'rejected'|'completed'|'cancelled'|'archived'
 * @property {firebase.firestore.Timestamp} createdAt - Creation timestamp
 *
 * --- Ownership Transfer Fields (Task 47) ---
 * @property {boolean} isOwnershipTransferred - Whether ownership was transferred (default: false)
 * @property {string|null} transferId - Reference to ownership_transfers document ID (nullable)
 *
 * --- Rejection Fields (Task 45) ---
 * @property {string|null} rejectionReason - Reason for rejection
 * @property {AlternativeSlot[]|null} alternativeSlots - Alternative time slots if rejected
 *
 * --- Other fields ---
 * @property {string} userName - Name of user who requested
 * @property {string} vehicleName - Name of vehicle
 * @property {string|null} adminMemo - Admin notes
 */

/**
 * @typedef {Object} AlternativeSlot
 * @property {string} date - Alternative date
 * @property {string} time - Alternative time
 */

/**
 * @typedef {Object} User
 * @property {string} uid - User unique identifier
 * @property {string} name - User display name
 * @property {string} email - User email
 * @property {string} phoneNumber - User phone number
 * @property {'user'|'admin'} role - User role
 * @property {firebase.firestore.Timestamp} createdAt - Account creation timestamp
 */

/**
 * @typedef {Object} AdminOwnedVehicle
 * @property {string} vehicleId - Reference to vehicles collection
 * @property {string} vehicleName - Vehicle name for quick reference
 * @property {number} purchasePrice - Price admin paid to acquire vehicle
 * @property {firebase.firestore.Timestamp} acquiredAt - Acquisition timestamp
 * @property {string|null} soldTo - User ID if sold (null if not sold)
 * @property {number|null} soldPrice - Sale price if sold
 * @property {firebase.firestore.Timestamp|null} soldAt - Sale timestamp if sold
 *
 * @description Collection to track vehicles currently or previously owned by admin (Task 33)
 */

export {};
