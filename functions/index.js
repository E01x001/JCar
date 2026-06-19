/**
 * JCar Firebase Cloud Functions
 *
 * Entry point for all Cloud Functions including:
 * - FCM push notifications for consultation events
 * - FCM push notifications for vehicle approval/rejection
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");

// For cost control, set maximum number of concurrent function instances
// This helps mitigate the impact of unexpected traffic spikes
setGlobalOptions({maxInstances: 10});

// ============================================================================
// Consultation Notification Triggers
// ============================================================================
// Send push notifications when consultation status changes
// or admin actions occur

const consultationNotifications =
  require("./triggers/consultationNotifications");

// Consultation approved notification (pending → approved)
exports.onConsultationApproved =
  consultationNotifications.onConsultationApproved;

// Consultation rejected notification (→ rejected)
exports.onConsultationRejected =
  consultationNotifications.onConsultationRejected;

// Alternative time slots suggested notification
// (alternativeSlots field changed)
exports.onAlternativeSlotsSuggested =
  consultationNotifications.onAlternativeSlotsSuggested;

// Consultation completed notification (→ completed)
exports.onConsultationCompleted =
  consultationNotifications.onConsultationCompleted;

// Admin memo updated notification (adminMemo field changed)
exports.onAdminMemoUpdated =
  consultationNotifications.onAdminMemoUpdated;

// ============================================================================
// Vehicle Notification Triggers
// ============================================================================
// Send push notifications when vehicle registration status changes

const vehicleNotifications =
  require("./triggers/vehicleNotifications");

// Vehicle approval/rejection notification
// (pending → approved/rejected)
exports.onVehicleStatusChanged =
  vehicleNotifications.onVehicleStatusChanged;

// ============================================================================
// Account Management Functions
// ============================================================================
// Cascade delete user account and all related data

const accountManagement = require("./accountManagement/cascadeDelete");

// Cascade delete user account (callable function)
// Task #73-76: Soft delete with 30-day recovery period
exports.cascadeDeleteUser = accountManagement.cascadeDeleteUser;

// Recover soft deleted user account (callable function)
// Task #76: Account recovery within 30-day period
exports.recoverDeletedUser = accountManagement.recoverDeletedUser;

// User registration (callable function)
// Restored: server-side phone duplicate check + Auth/Firestore creation.
// Lost during the TypeScript cleanup (commit 5756d15); ported back from src/index.ts.
const registration = require("./accountManagement/registerUser");
exports.registerUser = registration.registerUser;

// ============================================================================
// Consultation Request Management Functions
// ============================================================================
// Rate limiting and validation for consultation requests

const consultationRateLimit = require("./consultations/rateLimit");

// Check consultation request rate limit (callable function)
exports.checkConsultationRateLimit =
  consultationRateLimit.checkConsultationRateLimit;

// ============================================================================
// External API Proxy Functions
// ============================================================================
// Proxy requests to external APIs with server-side API key storage

const carzenProxy = require("./externalApis/carzenProxy");

// CarZen vehicle info lookup (callable function)
// Task #72: Secure API key by moving to server-side
exports.getVehicleInfo = carzenProxy.getVehicleInfo;
