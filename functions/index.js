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
