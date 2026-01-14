/**
 * Consultation Request Rate Limiting
 *
 * Prevents spam and abuse by limiting the number of consultation requests
 * a user can create within a specific time window.
 *
 * Rate Limit Policy:
 * - Maximum 5 consultation requests per hour per user
 * - Uses sliding window algorithm for accurate rate limiting
 * - Stores timestamps in Firestore for persistence across instances
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

/**
 * Check if a user has exceeded their consultation request rate limit
 *
 * @type {CallableFunction}
 * @param {CallableRequest} request - Contains auth context and request data
 * @return {Promise<{allowed: boolean, remainingRequests: number, resetTime: number}>}
 * @throws {HttpsError} If user is unauthenticated
 */
exports.checkConsultationRateLimit = onCall({
  timeoutSeconds: 30,
  memory: "256MiB",
}, async (request) => {
  // Authentication check
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "사용자 인증이 필요합니다.",
    );
  }

  const userId = request.auth.uid;
  const db = admin.firestore();

  // Rate limit configuration
  const MAX_REQUESTS_PER_HOUR = 5;
  const TIME_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

  try {
    // Reference to user's rate limit document
    const rateLimitRef = db
        .collection("consultation_rate_limits")
        .doc(userId);

    // Use transaction to ensure atomic read-modify-write
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const now = Date.now();

      let requestTimestamps = [];

      if (doc.exists) {
        const data = doc.data();
        requestTimestamps = data.timestamps || [];

        // Filter out timestamps outside the time window (sliding window)
        requestTimestamps = requestTimestamps.filter(
            (timestamp) => now - timestamp < TIME_WINDOW_MS,
        );
      }

      // Check if user has exceeded rate limit
      if (requestTimestamps.length >= MAX_REQUESTS_PER_HOUR) {
        const oldestTimestamp = Math.min(...requestTimestamps);
        const resetTime = oldestTimestamp + TIME_WINDOW_MS;

        return {
          allowed: false,
          remainingRequests: 0,
          resetTime: resetTime,
          message: `시간당 최대 ${MAX_REQUESTS_PER_HOUR}개의 상담 신청만 가능합니다. ` +
                   `${new Date(resetTime).toLocaleString("ko-KR")}에 다시 시도해주세요.`,
        };
      }

      // Add current timestamp to the list
      requestTimestamps.push(now);

      // Update Firestore with new timestamps
      transaction.set(rateLimitRef, {
        userId: userId,
        timestamps: requestTimestamps,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        allowed: true,
        remainingRequests: MAX_REQUESTS_PER_HOUR - requestTimestamps.length,
        resetTime: now + TIME_WINDOW_MS,
        message: "상담 신청이 허용되었습니다.",
      };
    });

    return result;
  } catch (error) {
    console.error("Rate limit check error:", error);
    throw new HttpsError(
        "internal",
        "Rate limit 확인 중 오류가 발생했습니다.",
    );
  }
});
