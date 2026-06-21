/**
 * CarZen API Proxy Function
 *
 * Proxies vehicle information requests to CarZen API
 * Keeps API key secure on server side
 *
 * Task #72: Generate and Revoke Exposed API Keys
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");

// Define secret for CarZen API key (stored in Firebase Secret Manager)
const carzenApiKey = defineSecret("CARZEN_API_KEY");

/**
 * Proxy function to query vehicle information from CarZen API
 *
 * @param {object} data - Request data containing:
 *   - regiNumber: Vehicle registration number (required)
 *   - ownerName: Vehicle owner name (required)
 * @returns {object} Vehicle information from CarZen API
 * @throws {HttpsError} If validation fails or API returns error
 */
exports.getVehicleInfo = onCall(
    {
      secrets: [carzenApiKey],
      maxInstances: 10,
      region: "asia-northeast3", // Seoul region for lower latency
    },
    async (request) => {
      // Ensure user is authenticated
      if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "로그인이 필요합니다.",
        );
      }

      const {regiNumber, ownerName} = request.data;

      // Validate input
      if (!regiNumber || !ownerName) {
        throw new HttpsError(
            "invalid-argument",
            "차량번호와 소유자명은 필수 입력값입니다.",
        );
      }

      // Validate registration number format
      const regiNumberRegex = /^([가-힣]{0,2})?(\d{2,3})([가-힣A-Z외임])\s?(\d{3,4})$/;
      if (!regiNumberRegex.test(regiNumber.replace(/\s+/g, ""))) {
        throw new HttpsError(
            "invalid-argument",
            "올바른 차량번호 형식이 아닙니다.",
        );
      }

      try {
        const response = await fetch(
            "https://datahub-dev.scraping.co.kr/assist/common/carzen/CarAllInfoInquiry",
            {
              method: "POST",
              headers: {
                "Authorization": carzenApiKey.value(),
                "Content-Type": "application/json;charset=UTF-8",
              },
              body: JSON.stringify({
                REGINUMBER: regiNumber,
                OWNERNAME: ownerName,
              }),
            },
        );

        const jsonResponse = await response.json();

        // 진단용: 실제 응답 메타(데이터 본문 제외) 로깅 — 성공 판정 필드 확인
        console.log("CarZen response meta:", JSON.stringify({
          errCode: jsonResponse.errCode,
          errMsg: jsonResponse.errMsg,
          result: jsonResponse.result,
          status: jsonResponse.data?.STATUS,
        }));

        // Check for API errors.
        // STATUS는 숫자/문자 모두 올 수 있어 String()으로 정규화 후 비교.
        if (
          jsonResponse.errCode !== "0000" ||
          jsonResponse.result !== "SUCCESS" ||
          String(jsonResponse.data?.STATUS) !== "200"
        ) {
          throw new HttpsError(
              "not-found",
              jsonResponse.errMsg || "차량 정보를 찾을 수 없습니다.",
          );
        }

        // Return vehicle data
        return {
          success: true,
          data: jsonResponse.data,
        };
      } catch (error) {
        // Re-throw HttpsError as-is
        if (error instanceof HttpsError) {
          throw error;
        }

        // Log unexpected errors
        console.error("CarZen API request failed:", error);
        throw new HttpsError(
            "internal",
            "차량 정보를 조회하는 중 오류가 발생했습니다.",
        );
      }
    },
);
