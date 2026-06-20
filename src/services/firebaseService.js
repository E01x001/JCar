/**
 * @deprecated This file is deprecated as part of Task 88 modular service refactoring.
 * All functions have been migrated to specialized service modules:
 *
 * - Auth functions → src/services/auth/authService.js, sessionService.js, accountService.js
 * - Vehicle functions → src/services/vehicle/vehicleService.js, vehicleApprovalService.js, vehicleQueryService.js
 * - Consultation functions → src/services/consultation/consultationService.js, consultationQueryService.js, consultationValidation.js
 * - Notification functions → src/services/notification/fcmService.js, notificationService.js
 * - Storage functions → src/services/storage/imageService.js
 *
 * Please import from the specific service modules instead of this file.
 * This file will be removed in a future version.
 */

// Re-export functions for backward compatibility (temporary)
// These will be removed once all imports are updated

// Auth services
export { getCurrentSession, refreshToken, isSessionValid, getUserToken } from './auth/sessionService';
export { updateUserProfile, deleteUserAccount, getUserProfile, updateEmail, updatePassword } from './auth/accountService';

// Vehicle services
export { deleteVehicleAdmin } from './vehicle/vehicleService';
export { approveVehicle, rejectVehicle, getPendingVehicles, updateApprovalStatus } from './vehicle/vehicleApprovalService';
export { getApprovedVehicles, getVehicleById, getVehiclesBySellerId, getVehiclesByStatus, searchVehicles, getVehicleCountByStatus } from './vehicle/vehicleQueryService';

// Consultation services
export { saveConsultationRequest, deleteConsultationAdmin, updateConsultationStatus, updateAdminMemo, updateSuggestedSlots, completeConsultation, cancelConsultation, resubmitConsultation, createAdminOwnedVehicle, updateAdminOwnedVehicle } from './consultation/consultationService';
export { subscribeToBuyConsultations, subscribeToSellConsultations, subscribeToCompletedConsultations, fetchCompletedConsultationsPaginated, getAdminOwnedVehicles } from './consultation/consultationQueryService';
export { checkDuplicateConsultation, checkTimeSlotConflict, validateConsultationRequest, canModifyConsultation, canCancelConsultation } from './consultation/consultationValidation';

// Notification services
export { getFCMToken, requestFCMNotificationPermission, requestNotificationPermission, saveFcmToken } from './notification/fcmService';
export { reportCrashlyticsError, logCrashlyticsMessage } from './notification/notificationService';

// Storage services
export { uploadImage, uploadMultipleImages, deleteImage, deleteMultipleImages, getImageDownloadURL, compressAndUploadImage, imageExists, getImageMetadata } from './storage/imageService';
