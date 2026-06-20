/**
 * Account Deletion - Cascade Delete Cloud Function
 *
 * Provides comprehensive user account deletion with cascade deletion of all related data:
 * - User's vehicles from Firestore
 * - Consultation requests (as buyer and seller)
 * - Uploaded images from Firebase Storage
 * - User document from users collection
 *
 * This function should be called via HTTPS callable function to ensure proper authentication.
 *
 * @module accountManagement/cascadeDelete
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const functions = require("firebase-functions");

/**
 * Cascade Delete User Account and All Related Data
 *
 * This Cloud Function performs a comprehensive deletion of a user account
 * and all associated data from Firestore and Firebase Storage.
 *
 * Authentication: User must be authenticated and can only delete their own account
 * (unless they are an admin).
 *
 * Steps performed:
 * 1. Verify user authentication and authorization
 * 2. Query and delete all user's vehicles from Firestore
 * 3. Query and delete all consultation requests (as buyer and seller)
 * 4. Delete all uploaded images from Firebase Storage
 * 5. Delete user document from users collection
 * 6. Delete Firebase Auth user account
 *
 * @param {Object} request - The callable function request
 * @param {string} request.data.userId - The ID of the user to delete
 * @return {Promise<Object>} Result object with deletion statistics
 * @throws {HttpsError} If user is not authenticated or not authorized
 */
exports.cascadeDeleteUser = onCall({
  // Set appropriate resource limits
  timeoutSeconds: 540, // 9 minutes (max for 2nd gen functions)
  memory: "512MiB",
}, async (request) => {
  const {auth, data} = request;

  // ============================================================================
  // Step 1: Authentication and Authorization
  // ============================================================================

  // Verify user is authenticated
  if (!auth) {
    functions.logger.error("Cascade delete called without authentication");
    throw new HttpsError(
        "unauthenticated",
        "사용자 인증이 필요합니다.",
    );
  }

  const requestingUserId = auth.uid;
  const targetUserId = data?.userId || requestingUserId;

  functions.logger.info("Cascade delete requested", {
    requestingUserId,
    targetUserId,
  });

  // Check authorization: user can only delete their own account
  // (or admin can delete any account)
  const db = admin.firestore();
  const requestingUserDoc = await db.collection("users").doc(requestingUserId).get();

  if (!requestingUserDoc.exists) {
    throw new HttpsError(
        "not-found",
        "요청한 사용자를 찾을 수 없습니다.",
    );
  }

  const requestingUserData = requestingUserDoc.data();
  const isAdmin = requestingUserData.role === "admin";

  // Authorization check
  if (targetUserId !== requestingUserId && !isAdmin) {
    functions.logger.error("Unauthorized cascade delete attempt", {
      requestingUserId,
      targetUserId,
    });
    throw new HttpsError(
        "permission-denied",
        "본인 계정만 삭제할 수 있습니다.",
    );
  }

  // ============================================================================
  // Step 2: Initialize deletion counters
  // ============================================================================

  const deletionStats = {
    vehiclesDeleted: 0,
    consultationsDeleted: 0,
    imagesDeleted: 0,
    userDocumentDeleted: false,
    authUserDeleted: false,
  };

  try {
    // ========================================================================
    // Step 3: Delete user's vehicles
    // ========================================================================

    functions.logger.info("Starting vehicle deletion", {userId: targetUserId});

    const vehiclesSnapshot = await db.collection("vehicles")
        .where("sellerId", "==", targetUserId)
        .get();

    if (!vehiclesSnapshot.empty) {
      const vehicleBatch = db.batch();

      vehiclesSnapshot.docs.forEach((doc) => {
        // Task 125: also delete the private contact subdocument (seller PII).
        // Firestore does NOT cascade-delete subcollections, so deleting only the
        // parent would leave the PII doc orphaned in storage.
        vehicleBatch.delete(doc.ref.collection("private").doc("contact"));
        vehicleBatch.delete(doc.ref);
      });

      await vehicleBatch.commit();
      deletionStats.vehiclesDeleted = vehiclesSnapshot.size;

      functions.logger.info("Vehicles deleted", {
        count: deletionStats.vehiclesDeleted,
      });
    }

    // ========================================================================
    // Step 4: Delete consultation requests (as buyer and seller)
    // ========================================================================

    functions.logger.info("Starting consultation deletion", {userId: targetUserId});

    // Delete consultations where user is the requester (buyer)
    const buyerConsultationsSnapshot = await db.collection("consultation_requests")
        .where("userId", "==", targetUserId)
        .get();

    // Delete consultations where user is the seller
    // (consultation_requests has vehicleId, we need to find vehicles owned by this user)
    const sellerConsultationsSnapshot = await db.collection("consultation_requests")
        .where("sellerId", "==", targetUserId)
        .get();

    const consultationBatch = db.batch();

    buyerConsultationsSnapshot.docs.forEach((doc) => {
      consultationBatch.delete(doc.ref);
    });

    sellerConsultationsSnapshot.docs.forEach((doc) => {
      consultationBatch.delete(doc.ref);
    });

    if (buyerConsultationsSnapshot.size > 0 || sellerConsultationsSnapshot.size > 0) {
      await consultationBatch.commit();
      deletionStats.consultationsDeleted =
        buyerConsultationsSnapshot.size + sellerConsultationsSnapshot.size;

      functions.logger.info("Consultations deleted", {
        buyer: buyerConsultationsSnapshot.size,
        seller: sellerConsultationsSnapshot.size,
        total: deletionStats.consultationsDeleted,
      });
    }

    // ========================================================================
    // Step 5: Delete uploaded images from Firebase Storage
    // ========================================================================
    // Task #75: Delete vehicle images from Firebase Storage

    functions.logger.info("Starting Storage image deletion", {userId: targetUserId});

    const bucket = admin.storage().bucket();
    let storageDeleteErrors = 0;

    // Extract image URLs from vehicles and delete from Storage
    for (const vehicleDoc of vehiclesSnapshot.docs) {
      const vehicleData = vehicleDoc.data();
      const imageUrl = vehicleData.imageUrl;

      // Only process Firebase Storage URLs
      if (imageUrl && imageUrl.includes("firebasestorage.googleapis.com")) {
        try {
          // Extract storage path from URL
          // Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
          const urlParts = imageUrl.split("/o/");
          if (urlParts.length > 1) {
            const pathWithQuery = urlParts[1];
            const storagePath = decodeURIComponent(pathWithQuery.split("?")[0]);

            // Delete file from Storage
            await bucket.file(storagePath).delete();
            deletionStats.imagesDeleted++;

            functions.logger.info("Storage image deleted", {
              vehicleId: vehicleDoc.id,
              storagePath,
            });
          }
        } catch (storageError) {
          // Log error but continue deletion process
          storageDeleteErrors++;
          functions.logger.warn("Failed to delete storage image", {
            vehicleId: vehicleDoc.id,
            imageUrl,
            error: storageError.message,
          });
        }
      } else {
        // External URL (e.g., cartory.net), skip deletion
        functions.logger.info("Skipping external image URL", {
          vehicleId: vehicleDoc.id,
          imageUrl,
        });
      }
    }

    functions.logger.info("Storage deletion completed", {
      imagesDeleted: deletionStats.imagesDeleted,
      errors: storageDeleteErrors,
    });

    // ========================================================================
    // Step 6: Soft Delete - Mark user for deletion (30-day recovery period)
    // ========================================================================
    // Task #76: Implement soft delete with 30-day recovery period

    const deletionTimestamp = admin.firestore.FieldValue.serverTimestamp();
    const permanentDeleteDate = new Date();
    permanentDeleteDate.setDate(permanentDeleteDate.getDate() + 30);

    await db.collection("users").doc(targetUserId).update({
      deletedAt: deletionTimestamp,
      permanentDeleteDate: admin.firestore.Timestamp.fromDate(permanentDeleteDate),
      accountStatus: "pending_deletion",
      // Preserve user data for recovery
      _originalData: requestingUserData,
    });

    deletionStats.userDocumentDeleted = false; // Soft deleted, not hard deleted
    deletionStats.softDeleted = true;

    functions.logger.info("User soft deleted (30-day recovery period)", {
      userId: targetUserId,
      permanentDeleteDate: permanentDeleteDate.toISOString(),
    });

    // ========================================================================
    // Step 7: Disable Firebase Auth user account (but don't delete)
    // ========================================================================

    await admin.auth().updateUser(targetUserId, {
      disabled: true,
    });

    deletionStats.authUserDeleted = false; // Disabled, not deleted
    deletionStats.authUserDisabled = true;

    functions.logger.info("Firebase Auth user disabled", {
      userId: targetUserId,
      note: "Account will be permanently deleted after 30 days",
    });

    // ========================================================================
    // NOTE: Permanent deletion after 30 days
    // ========================================================================
    // TODO: Implement scheduled function to permanently delete accounts
    // where permanentDeleteDate <= current date
    // This will be a separate Firebase Scheduled Function that runs daily

    // ========================================================================
    // Step 8: Return success with deletion statistics
    // ========================================================================

    functions.logger.info("Cascade delete completed successfully", {
      userId: targetUserId,
      stats: deletionStats,
    });

    return {
      success: true,
      message: "계정이 30일 후 영구 삭제 예정입니다. 복구를 원하시면 고객센터로 문의해주세요.",
      stats: deletionStats,
      permanentDeleteDate: permanentDeleteDate.toISOString(),
    };
  } catch (error) {
    // Log detailed error for debugging
    functions.logger.error("Cascade delete failed", {
      userId: targetUserId,
      error: error.message,
      stack: error.stack,
      stats: deletionStats,
    });

    throw new HttpsError(
        "internal",
        `계정 삭제 중 오류가 발생했습니다: ${error.message}`,
        {stats: deletionStats},
    );
  }
});

/**
 * Recover Soft Deleted User Account
 *
 * This function restores a user account that was soft deleted
 * within the 30-day recovery period.
 *
 * Authentication: User must be authenticated and can only recover their own account
 * (or admin can recover any account).
 *
 * @param {Object} request - The callable function request
 * @param {string} request.data.userId - The ID of the user to recover
 * @return {Promise<Object>} Result object with recovery status
 * @throws {HttpsError} If user is not authenticated or recovery period expired
 */
exports.recoverDeletedUser = onCall({
  timeoutSeconds: 60,
  memory: "256MiB",
}, async (request) => {
  const {auth, data} = request;

  // Verify authentication
  if (!auth) {
    throw new HttpsError(
        "unauthenticated",
        "사용자 인증이 필요합니다.",
    );
  }

  const requestingUserId = auth.uid;
  const targetUserId = data?.userId || requestingUserId;

  functions.logger.info("Account recovery requested", {
    requestingUserId,
    targetUserId,
  });

  const db = admin.firestore();
  const userDoc = await db.collection("users").doc(targetUserId).get();

  if (!userDoc.exists) {
    throw new HttpsError(
        "not-found",
        "사용자를 찾을 수 없습니다.",
    );
  }

  const userData = userDoc.data();

  // Check if account is in pending_deletion status
  if (userData.accountStatus !== "pending_deletion") {
    throw new HttpsError(
        "failed-precondition",
        "복구 가능한 상태가 아닙니다.",
    );
  }

  // Check if recovery period has expired
  const now = new Date();
  const permanentDeleteDate = userData.permanentDeleteDate?.toDate();

  if (permanentDeleteDate && now > permanentDeleteDate) {
    throw new HttpsError(
        "deadline-exceeded",
        "복구 기간이 만료되었습니다.",
    );
  }

  try {
    // Restore user document
    await db.collection("users").doc(targetUserId).update({
      deletedAt: admin.firestore.FieldValue.delete(),
      permanentDeleteDate: admin.firestore.FieldValue.delete(),
      accountStatus: "active",
      recoveredAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Re-enable Firebase Auth account
    await admin.auth().updateUser(targetUserId, {
      disabled: false,
    });

    functions.logger.info("Account recovered successfully", {
      userId: targetUserId,
    });

    return {
      success: true,
      message: "계정이 성공적으로 복구되었습니다.",
    };
  } catch (error) {
    functions.logger.error("Account recovery failed", {
      userId: targetUserId,
      error: error.message,
    });

    throw new HttpsError(
        "internal",
        `계정 복구 중 오류가 발생했습니다: ${error.message}`,
    );
  }
});
