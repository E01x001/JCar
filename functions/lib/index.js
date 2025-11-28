"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emergencyDeleteVehicle = exports.sendConsultationNotification = exports.registerUser = exports.helloWorld = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const messaging_1 = require("firebase-admin/messaging");
const storage_1 = require("firebase-admin/storage");
const options_1 = require("firebase-functions/v2/options");
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const firestore_2 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
const messaging = (0, messaging_1.getMessaging)();
const storage = (0, storage_1.getStorage)();
(0, options_1.setGlobalOptions)({ maxInstances: 10 });
// 기본 샘플 함수
exports.helloWorld = (0, https_2.onRequest)((req, res) => {
    res.send("Hello from Firebase!");
});
/**
 * ⭐ Cloud Functions v2 - 회원가입
 * - email/password로 Auth 생성
 * - users/{uid} Firestore 문서 생성
 * - 전화번호 중복 검사 포함
 */
exports.registerUser = (0, https_1.onCall)(async (request) => {
    const { email, password, name, phoneNumber } = request.data;
    if (!email || !password || !name || !phoneNumber) {
        throw new https_1.HttpsError("invalid-argument", "필수 항목이 없습니다.");
    }
    // 1) 전화번호 중복 체크
    const phoneQuery = await db
        .collection("users")
        .where("phoneNumber", "==", phoneNumber)
        .get();
    if (!phoneQuery.empty) {
        throw new https_1.HttpsError("already-exists", "이미 존재하는 전화번호입니다.");
    }
    // 2) Firebase Auth 계정 생성
    let newUser;
    try {
        newUser = await auth.createUser({
            email,
            password,
        });
    }
    catch (e) {
        throw new https_1.HttpsError("already-exists", "이미 존재하는 이메일입니다.");
    }
    const uid = newUser.uid;
    // 3) Firestore users/{uid} 생성
    await db.collection("users").doc(uid).set({
        email,
        name,
        phoneNumber,
        role: "user",
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { uid };
});
/**
 * ⭐ Cloud Functions v2 - 상담 요청 상태 변경 시 알림 전송
 * - consultation_requests 문서가 업데이트될 때 트리거
 * - status 필드가 변경된 경우에만 알림 전송
 * - 사용자의 FCM 토큰을 조회하여 푸시 알림 발송
 */
exports.sendConsultationNotification = (0, firestore_2.onDocumentUpdated)("consultation_requests/{requestId}", async (event) => {
    var _a, _b;
    const beforeData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const afterData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!beforeData || !afterData) {
        logger.warn("No data in before or after");
        return;
    }
    // status 필드가 변경되지 않았으면 종료
    if (beforeData.status === afterData.status) {
        logger.info("Status unchanged, no notification sent");
        return;
    }
    const userId = afterData.userId;
    const vehicleName = afterData.vehicleName || "차량";
    const newStatus = afterData.status;
    if (!userId) {
        logger.warn("No userId found in consultation request");
        return;
    }
    try {
        // 사용자 문서에서 FCM 토큰 조회
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            logger.warn(`User document not found: ${userId}`);
            return;
        }
        const userData = userDoc.data();
        const fcmToken = userData === null || userData === void 0 ? void 0 : userData.fcmToken;
        if (!fcmToken) {
            logger.warn(`No FCM token for user: ${userId}`);
            return;
        }
        // 상태에 따른 알림 메시지 설정
        let title = "";
        let body = "";
        switch (newStatus) {
            case "approved":
                title = "상담 요청이 승인되었습니다";
                body = `${vehicleName}에 대한 상담 요청이 승인되었습니다.`;
                break;
            case "rejected":
                title = "상담 요청이 거절되었습니다";
                body = `${vehicleName}에 대한 상담 요청이 거절되었습니다.`;
                break;
            case "pending":
                title = "상담 요청 상태 변경";
                body = `${vehicleName}에 대한 상담 요청이 대기 중입니다.`;
                break;
            default:
                title = "상담 요청 상태 업데이트";
                body = `${vehicleName}에 대한 상담 요청 상태가 변경되었습니다.`;
        }
        // FCM 알림 전송
        const message = {
            notification: {
                title,
                body,
            },
            data: {
                requestId: event.params.requestId,
                status: newStatus,
                vehicleName,
            },
            token: fcmToken,
        };
        const response = await messaging.send(message);
        logger.info(`Notification sent successfully: ${response}`);
    }
    catch (error) {
        logger.error("Error sending notification:", error);
    }
});
/**
 * ⭐ Cloud Functions v2 - 긴급 차량 삭제
 * - 관리자 권한 확인
 * - 차량 문서와 관련 이미지를 Storage에서 삭제
 * - admin_activity_log에 삭제 작업 기록
 */
exports.emergencyDeleteVehicle = (0, https_1.onCall)(async (request) => {
    const { vehicleId } = request.data;
    if (!vehicleId) {
        throw new https_1.HttpsError("invalid-argument", "차량 ID가 필요합니다.");
    }
    // 1) 관리자 권한 확인
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "인증이 필요합니다.");
    }
    const uid = request.auth.uid;
    try {
        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError("not-found", "사용자를 찾을 수 없습니다.");
        }
        const userData = userDoc.data();
        if ((userData === null || userData === void 0 ? void 0 : userData.role) !== "admin") {
            throw new https_1.HttpsError("permission-denied", "관리자 권한이 필요합니다.");
        }
        // 2) 차량 문서 조회
        const vehicleDoc = await db.collection("vehicles").doc(vehicleId).get();
        if (!vehicleDoc.exists) {
            throw new https_1.HttpsError("not-found", "차량을 찾을 수 없습니다.");
        }
        const vehicleData = vehicleDoc.data();
        // 3) Storage에서 이미지 삭제
        const bucket = storage.bucket();
        const imageUrls = [];
        // 단일 이미지 URL
        if (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.imageUrl) {
            imageUrls.push(vehicleData.imageUrl);
        }
        // 다중 이미지 URL 배열
        if ((vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.imageUrls) && Array.isArray(vehicleData.imageUrls)) {
            imageUrls.push(...vehicleData.imageUrls);
        }
        // Storage에서 이미지 파일 삭제
        for (const imageUrl of imageUrls) {
            try {
                // Firebase Storage URL에서 파일 경로 추출
                // 예: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile.jpg?alt=media
                const urlMatch = imageUrl.match(/\/o\/(.+?)\?/);
                if (urlMatch && urlMatch[1]) {
                    const filePath = decodeURIComponent(urlMatch[1]);
                    const file = bucket.file(filePath);
                    await file.delete();
                    logger.info(`Deleted image: ${filePath}`);
                }
            }
            catch (error) {
                logger.warn(`Failed to delete image: ${imageUrl}`, error);
                // 이미지 삭제 실패해도 계속 진행
            }
        }
        // 4) Firestore 문서 삭제
        await vehicleDoc.ref.delete();
        logger.info(`Deleted vehicle document: ${vehicleId}`);
        // 5) admin_activity_log에 기록
        await db.collection("admin_activity_log").add({
            adminUid: uid,
            action: "emergency_delete_vehicle",
            targetVehicleId: vehicleId,
            vehicleName: (vehicleData === null || vehicleData === void 0 ? void 0 : vehicleData.vehicleName) || "Unknown",
            timestamp: firestore_1.FieldValue.serverTimestamp(),
            deletedImageCount: imageUrls.length,
        });
        logger.info(`Admin ${uid} deleted vehicle ${vehicleId}`);
        return {
            success: true,
            message: "차량이 성공적으로 삭제되었습니다.",
            deletedImages: imageUrls.length,
        };
    }
    catch (error) {
        logger.error("Error in emergencyDeleteVehicle:", error);
        // HttpsError는 그대로 던지고, 그 외는 internal로 처리
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "차량 삭제 중 오류가 발생했습니다.");
    }
});
//# sourceMappingURL=index.js.map