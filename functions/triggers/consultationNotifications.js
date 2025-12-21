/**
 * Consultation Notifications Triggers
 *
 * Firebase Cloud Functions that send push notifications when consultation
 * request statuses change or when admin actions occur.
 *
 * @module triggers/consultationNotifications
 */

const functions = require("firebase-functions");
const {sendNotificationToUser} = require("../utils/fcm");

/**
 * Trigger: Send push notification when consultation is approved
 *
 * Monitors consultation_requests collection for status changes from
 * 'pending' to 'approved' and sends a notification to the user.
 *
 * @fires when consultationStatus: pending → approved
 */
exports.onConsultationApproved = functions.firestore
    .document("consultation_requests/{consultationId}")
    .onUpdate(async (change, context) => {
      try {
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // Check if status changed from pending to approved
        const beforeStatus = beforeData.consultationStatus;
        const afterStatus = afterData.consultationStatus;

        if (beforeStatus !== "pending" || afterStatus !== "approved") {
        // Not the status transition we're looking for
          return null;
        }

        // Extract consultation details
        const {userId, preferredDate, preferredTime, vehicleName, type} = afterData;
        const consultationId = context.params.consultationId;

        // Validate required fields
        if (!userId) {
          functions.logger.error("onConsultationApproved: Missing userId", {consultationId});
          return null;
        }

        // Construct notification payload
        const consultationType = type === "sell" ? "판매" : "구매";
        const title = "상담 승인";
        const vehicleInfo = vehicleName ? ` (${vehicleName})` : "";
        const body =
          `${preferredDate} ${preferredTime} ${consultationType} 상담이 승인되었습니다.${vehicleInfo}`;
        const data = {
          type: "consultation_approved",
          consultationId: consultationId,
          screen: "UserConsultationDetail",
        };

        // Send notification
        await sendNotificationToUser(userId, title, body, data);

        functions.logger.info("Consultation approval notification sent successfully", {
          consultationId,
          userId,
        });

        return null;
      } catch (error) {
        functions.logger.error("onConsultationApproved: Unexpected error", {
          error: error.message,
          stack: error.stack,
        });
        // Don't throw - we don't want to retry notification sends
        return null;
      }
    });

/**
 * Trigger: Send push notification when consultation is rejected
 *
 * Monitors consultation_requests collection for status changes to 'rejected'
 * and sends a notification to the user with rejection reason if available.
 *
 * @fires when consultationStatus → rejected
 */
exports.onConsultationRejected = functions.firestore
    .document("consultation_requests/{consultationId}")
    .onUpdate(async (change, context) => {
      try {
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // Check if status changed to rejected
        const beforeStatus = beforeData.consultationStatus;
        const afterStatus = afterData.consultationStatus;

        if (afterStatus !== "rejected" || beforeStatus === "rejected") {
        // Not a new rejection
          return null;
        }

        // Extract consultation details
        const {userId, rejectionReason, vehicleName, type} = afterData;
        const consultationId = context.params.consultationId;

        // Validate required fields
        if (!userId) {
          functions.logger.error("onConsultationRejected: Missing userId", {consultationId});
          return null;
        }

        // Construct notification payload
        const consultationType = type === "sell" ? "판매" : "구매";
        const title = "상담 거절";
        const reasonText = rejectionReason ? ` 사유: ${rejectionReason}` : "";
        const body = `${consultationType} 상담 요청이 거절되었습니다.${reasonText}${vehicleName ? ` (${vehicleName})` : ""}`;
        const data = {
          type: "consultation_rejected",
          consultationId: consultationId,
          screen: "UserConsultationDetail",
        };

        // Send notification
        await sendNotificationToUser(userId, title, body, data);

        functions.logger.info("Consultation rejection notification sent successfully", {
          consultationId,
          userId,
        });

        return null;
      } catch (error) {
        functions.logger.error("onConsultationRejected: Unexpected error", {
          error: error.message,
          stack: error.stack,
        });
        return null;
      }
    });

/**
 * Trigger: Send push notification when alternative time slots are suggested
 *
 * Monitors consultation_requests collection for changes to the alternativeSlots
 * field and sends a notification to the user.
 *
 * @fires when alternativeSlots field is added or modified
 */
exports.onAlternativeSlotsSuggested = functions.firestore
    .document("consultation_requests/{consultationId}")
    .onUpdate(async (change, context) => {
      try {
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // Check if alternativeSlots field was added or modified
        const beforeSlots = beforeData.alternativeSlots;
        const afterSlots = afterData.alternativeSlots;

        // Skip if no alternativeSlots in new data or if it hasn't changed
        if (!afterSlots || JSON.stringify(beforeSlots) === JSON.stringify(afterSlots)) {
          return null;
        }

        // Extract consultation details
        const {userId, vehicleName, type} = afterData;
        const consultationId = context.params.consultationId;

        // Validate required fields
        if (!userId) {
          functions.logger.error("onAlternativeSlotsSuggested: Missing userId", {consultationId});
          return null;
        }

        // Construct notification payload
        const consultationType = type === "sell" ? "판매" : "구매";
        const title = "대체 시간 제안";
        const body = `관리자가 ${consultationType} 상담 대체 시간을 제안했습니다. 확인해주세요.${vehicleName ? ` (${vehicleName})` : ""}`;
        const data = {
          type: "alternative_slots_suggested",
          consultationId: consultationId,
          screen: "UserConsultationDetail",
        };

        // Send notification
        await sendNotificationToUser(userId, title, body, data);

        functions.logger.info("Alternative slots notification sent successfully", {
          consultationId,
          userId,
        });

        return null;
      } catch (error) {
        functions.logger.error("onAlternativeSlotsSuggested: Unexpected error", {
          error: error.message,
          stack: error.stack,
        });
        return null;
      }
    });

/**
 * Trigger: Send push notification when consultation is completed
 *
 * Monitors consultation_requests collection for status changes to 'completed'
 * and sends a notification to the user with deal amount if available.
 *
 * @fires when consultationStatus → completed
 */
exports.onConsultationCompleted = functions.firestore
    .document("consultation_requests/{consultationId}")
    .onUpdate(async (change, context) => {
      try {
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // Check if status changed to completed
        const beforeStatus = beforeData.consultationStatus;
        const afterStatus = afterData.consultationStatus;

        if (afterStatus !== "completed" || beforeStatus === "completed") {
        // Not a new completion
          return null;
        }

        // Extract consultation details
        const {userId, dealAmount, vehicleName, type} = afterData;
        const consultationId = context.params.consultationId;

        // Validate required fields
        if (!userId) {
          functions.logger.error("onConsultationCompleted: Missing userId", {consultationId});
          return null;
        }

        // Construct notification payload
        const consultationType = type === "sell" ? "판매" : "구매";
        const title = "상담 완료";
        const amountText = dealAmount ?
        ` 거래 금액: ${dealAmount.toLocaleString("ko-KR")}원` :
        "";
        const body = `${consultationType} 상담이 완료되었습니다.${amountText}${vehicleName ? ` (${vehicleName})` : ""}`;
        const data = {
          type: "consultation_completed",
          consultationId: consultationId,
          screen: "UserConsultationDetail",
        };

        // Send notification
        await sendNotificationToUser(userId, title, body, data);

        functions.logger.info("Consultation completion notification sent successfully", {
          consultationId,
          userId,
        });

        return null;
      } catch (error) {
        functions.logger.error("onConsultationCompleted: Unexpected error", {
          error: error.message,
          stack: error.stack,
        });
        return null;
      }
    });

/**
 * Trigger: Send push notification when admin memo is updated (Optional)
 *
 * Monitors consultation_requests collection for changes to the adminMemo field
 * and sends a notification to the user if meaningful content was added.
 *
 * @fires when adminMemo field is added or modified with non-empty content
 */
exports.onAdminMemoUpdated = functions.firestore
    .document("consultation_requests/{consultationId}")
    .onUpdate(async (change, context) => {
      try {
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // Check if adminMemo was added or modified
        const beforeMemo = beforeData.adminMemo;
        const afterMemo = afterData.adminMemo;

        // Skip if no meaningful change (empty, null, or unchanged)
        if (!afterMemo || beforeMemo === afterMemo || afterMemo.trim() === "") {
          return null;
        }

        // Extract consultation details
        const {userId, vehicleName, type} = afterData;
        const consultationId = context.params.consultationId;

        // Validate required fields
        if (!userId) {
          functions.logger.error("onAdminMemoUpdated: Missing userId", {consultationId});
          return null;
        }

        // Construct notification payload
        const consultationType = type === "sell" ? "판매" : "구매";
        const title = "관리자 메모";
        const body = `${consultationType} 상담에 새로운 메모가 추가되었습니다.${vehicleName ? ` (${vehicleName})` : ""}`;
        const data = {
          type: "admin_memo_added",
          consultationId: consultationId,
          screen: "UserConsultationDetail",
        };

        // Send notification
        await sendNotificationToUser(userId, title, body, data);

        functions.logger.info("Admin memo notification sent successfully", {
          consultationId,
          userId,
        });

        return null;
      } catch (error) {
        functions.logger.error("onAdminMemoUpdated: Unexpected error", {
          error: error.message,
          stack: error.stack,
        });
        return null;
      }
    });
