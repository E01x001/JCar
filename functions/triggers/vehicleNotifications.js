/**
 * Vehicle Notifications Triggers
 *
 * Firebase Cloud Functions that send push notifications when vehicle
 * registration statuses change (approval/rejection).
 *
 * @module triggers/vehicleNotifications
 */

const functions = require("firebase-functions");
const {sendNotificationToUser} = require("../utils/fcm");

/**
 * Trigger: Send push notification when vehicle status changes
 *
 * Monitors vehicles collection for status changes from 'pending' to
 * either 'approved' or 'rejected' and sends appropriate notifications
 * to the vehicle seller/owner.
 *
 * @fires when vehicle status: pending → approved/rejected
 */
exports.onVehicleStatusChanged = functions.firestore
    .document("vehicles/{vehicleId}")
    .onUpdate(async (change, context) => {
      try {
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // Check if status changed from pending to approved or rejected
        const beforeStatus = beforeData.status;
        const afterStatus = afterData.status;

        if (beforeStatus !== "pending") {
        // Only trigger on transitions FROM pending status
          return null;
        }

        if (afterStatus !== "approved" && afterStatus !== "rejected") {
        // Only care about approved or rejected
          return null;
        }

        // Extract vehicle details
        const {vehicleName} = afterData;
        const vehicleId = context.params.vehicleId;

        // Get seller/owner ID
        // Support both sellerId (legacy) and currentOwnerId (new schema)
        const ownerId = afterData.currentOwnerId || afterData.sellerId;

        // Validate required fields
        if (!ownerId) {
          functions.logger.error("onVehicleStatusChanged: Missing ownerId (sellerId/currentOwnerId)", {
            vehicleId,
            status: afterStatus,
          });
          return null;
        }

        if (!vehicleName) {
          functions.logger.warn("onVehicleStatusChanged: Missing vehicleName", {
            vehicleId,
            status: afterStatus,
          });
        }

        // Construct notification based on status
        let title; let body; let notificationType; let screen;

        if (afterStatus === "approved") {
        // Vehicle approved
          title = "차량 등록 승인";
          body = `${vehicleName || "등록하신 차량"}이 승인되어 판매 가능합니다.`;
          notificationType = "vehicle_approved";
          screen = "VehicleDetail";
        } else if (afterStatus === "rejected") {
        // Vehicle rejected
          title = "차량 등록 거절";
          body = `${vehicleName || "등록하신 차량"} 등록이 거절되었습니다.`;
          notificationType = "vehicle_rejected";
          screen = "MyPage";
        } else {
        // Shouldn't reach here due to earlier check, but safety fallback
          functions.logger.error("onVehicleStatusChanged: Unexpected status", {
            vehicleId,
            status: afterStatus,
          });
          return null;
        }

        const data = {
          type: notificationType,
          vehicleId: vehicleId,
          screen: screen,
        };

        // Send notification
        await sendNotificationToUser(ownerId, title, body, data);

        functions.logger.info("Vehicle status change notification sent successfully", {
          vehicleId,
          ownerId,
          status: afterStatus,
          notificationType,
        });

        return null;
      } catch (error) {
        functions.logger.error("onVehicleStatusChanged: Unexpected error", {
          error: error.message,
          stack: error.stack,
        });
        // Don't throw - we don't want to retry notification sends
        return null;
      }
    });
