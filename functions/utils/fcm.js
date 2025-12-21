/**
 * FCM (Firebase Cloud Messaging) Utility Module
 *
 * Provides common functions for sending push notifications via Firebase Admin SDK.
 * Handles FCM token retrieval, message sending, and error handling.
 *
 * @module utils/fcm
 */

const admin = require("firebase-admin");
const functions = require("firebase-functions");

/**
 * Initialize Firebase Admin SDK
 *
 * Initializes the Firebase Admin SDK if not already initialized.
 * Should be called once at the start of the Cloud Functions runtime.
 *
 * @return {void}
 */
const initializeAdmin = () => {
  if (!admin.apps.length) {
    admin.initializeApp();
    functions.logger.info("Firebase Admin SDK initialized successfully");
  }
};

/**
 * Send a push notification to a specific FCM token
 *
 * Sends a notification using Firebase Cloud Messaging with proper error handling.
 * Gracefully handles invalid or unregistered tokens by logging without throwing.
 *
 * @param {string} fcmToken - The FCM registration token
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {Object} data - Additional data payload (all values must be strings)
 * @return {Promise<void>}
 * @throws {Error} For non-token-related errors
 */
const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  try {
    // Ensure all data values are strings (FCM requirement)
    const stringifiedData = {};
    Object.keys(data).forEach((key) => {
      stringifiedData[key] = String(data[key]);
    });

    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: stringifiedData,
    };

    await admin.messaging().send(message);

    functions.logger.info("Successfully sent FCM message", {
      fcmToken: fcmToken.substring(0, 20) + "...", // Log partial token for security
      title,
    });
  } catch (error) {
    // Handle specific FCM errors gracefully
    if (error.code === "messaging/invalid-argument") {
      functions.logger.error("FCM: Invalid argument provided", {
        fcmToken: fcmToken.substring(0, 20) + "...",
        error: error.message,
      });
    } else if (error.code === "messaging/registration-token-not-registered") {
      functions.logger.error("FCM: Token not registered or expired", {
        fcmToken: fcmToken.substring(0, 20) + "...",
        error: error.message,
      });
      // Don't throw - this is expected when users uninstall the app
      return;
    } else if (error.code === "messaging/invalid-registration-token") {
      functions.logger.error("FCM: Invalid registration token format", {
        fcmToken: fcmToken.substring(0, 20) + "...",
        error: error.message,
      });
      // Don't throw - token is malformed
      return;
    } else {
      // For unexpected errors, log and re-throw
      functions.logger.error("FCM: Unexpected error sending message", {
        fcmToken: fcmToken.substring(0, 20) + "...",
        error: error.message,
        code: error.code,
      });
      throw error;
    }
  }
};

/**
 * Get FCM token for a specific user from Firestore
 *
 * Retrieves the FCM registration token stored in the users collection.
 * Returns undefined if the user doesn't exist or has no token.
 *
 * @param {string} userId - The Firestore user document ID
 * @return {Promise<string|undefined>} The FCM token or undefined
 */
const getUserFcmToken = async (userId) => {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      functions.logger.warn("FCM: User document not found", {userId});
      return undefined;
    }

    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      functions.logger.warn("FCM: No token available for user", {userId});
      return undefined;
    }

    return fcmToken;
  } catch (error) {
    functions.logger.error("FCM: Error retrieving user token from Firestore", {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Send a push notification to a user by their userId
 *
 * High-level helper that retrieves the user's FCM token and sends a notification.
 * Handles cases where the user has no token gracefully.
 *
 * @param {string} userId - The Firestore user document ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {Object} data - Additional data payload
 * @return {Promise<void>}
 */
const sendNotificationToUser = async (userId, title, body, data = {}) => {
  try {
    const fcmToken = await getUserFcmToken(userId);

    if (!fcmToken) {
      functions.logger.warn("FCM: No token available for user, notification not sent", {
        userId,
        title,
      });
      return;
    }

    await sendPushNotification(fcmToken, title, body, data);

    functions.logger.info("Notification process completed for user", {
      userId,
      title,
    });
  } catch (error) {
    functions.logger.error("FCM: Failed to send notification to user", {
      userId,
      title,
      error: error.message,
    });
    // Don't throw - we've already logged the error
    // Notification failures shouldn't break the calling function
  }
};

// Initialize Admin SDK when module is loaded
initializeAdmin();

module.exports = {
  initializeAdmin,
  sendPushNotification,
  getUserFcmToken,
  sendNotificationToUser,
};
