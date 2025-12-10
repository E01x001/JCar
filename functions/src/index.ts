import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
import {getMessaging} from "firebase-admin/messaging";
import {getStorage} from "firebase-admin/storage";
import {setGlobalOptions} from "firebase-functions/v2/options";
import {onCall, onRequest, HttpsError} from "firebase-functions/v2/https";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

initializeApp();
const db = getFirestore();
const auth = getAuth();
const messaging = getMessaging();
const storage = getStorage();

setGlobalOptions({maxInstances: 10});

// 기본 샘플 함수
export const helloWorld = onRequest((req, res) => {
  res.send("Hello from Firebase!");
});

/**
 * ⭐ Cloud Functions v2 - 회원가입
 * - email/password로 Auth 생성
 * - users/{uid} Firestore 문서 생성
 * - 전화번호 중복 검사 포함
 */
export const registerUser = onCall(async (request) => {
  const {email, password, name, phoneNumber} = request.data;

  if (!email || !password || !name || !phoneNumber) {
    throw new HttpsError("invalid-argument", "필수 항목이 없습니다.");
  }

  // 1) 전화번호 중복 체크
  const phoneQuery = await db
      .collection("users")
      .where("phoneNumber", "==", phoneNumber)
      .get();

  if (!phoneQuery.empty) {
    throw new HttpsError("already-exists", "이미 존재하는 전화번호입니다.");
  }

  // 2) Firebase Auth 계정 생성
  let newUser;
  try {
    newUser = await auth.createUser({
      email,
      password,
    });
  } catch (e: any) {
    throw new HttpsError("already-exists", "이미 존재하는 이메일입니다.");
  }

  const uid = newUser.uid;

  // 3) Firestore users/{uid} 생성
  await db.collection("users").doc(uid).set({
    email,
    name,
    phoneNumber,
    role: "user",
    createdAt: FieldValue.serverTimestamp(),
  });

  return {uid};
});

/**
 * ⭐ Cloud Functions v2 - 상담 요청 상태 변경 시 알림 전송
 * - consultation_requests 문서가 업데이트될 때 트리거
 * - status 필드가 변경된 경우에만 알림 전송
 * - 사용자의 FCM 토큰을 조회하여 푸시 알림 발송
 * - rejected 상태인 경우 거절 사유 및 대체 시간 제안 포함
 */
export const sendConsultationNotification = onDocumentUpdated(
    "consultation_requests/{requestId}",
    async (event) => {
      const beforeData = event.data?.before.data();
      const afterData = event.data?.after.data();

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
        const fcmToken = userData?.fcmToken;

        if (!fcmToken) {
          logger.warn(`No FCM token for user: ${userId}`);
          return;
        }

        // 상태에 따른 알림 메시지 설정
        let title = "";
        let body = "";
        const dataPayload: Record<string, string> = {
          requestId: event.params.requestId,
          status: newStatus,
          vehicleName,
        };

        switch (newStatus) {
          case "approved":
            title = "상담 요청이 승인되었습니다";
            body = `${vehicleName}에 대한 상담 요청이 승인되었습니다.`;
            break;
          case "rejected": {
            title = "상담 요청이 거절되었습니다";
            const rejectionReason = afterData.rejectionReason;
            if (rejectionReason) {
              body = `${vehicleName} 상담이 거절되었습니다.\n사유: ${rejectionReason}`;
              dataPayload.rejectionReason = rejectionReason;
            } else {
              body = `${vehicleName}에 대한 상담 요청이 거절되었습니다.`;
            }

            // Include alternative slots if provided
            const alternativeSlots = afterData.alternativeSlots;
            if (alternativeSlots && Array.isArray(alternativeSlots) &&
                alternativeSlots.length > 0) {
              body += `\n\n대체 시간이 ${alternativeSlots.length}개 제안되었습니다.`;
              dataPayload.hasAlternativeSlots = "true";
            }
            break;
          }
          case "pending":
            title = "상담 요청 상태 변경";
            body = `${vehicleName}에 대한 상담 요청이 대기 중입니다.`;
            break;
          case "on-hold":
            title = "상담 요청 보류";
            body = `${vehicleName}에 대한 상담 요청이 보류되었습니다.`;
            break;
          case "confirmed":
            title = "상담 일정 확정";
            body = `${vehicleName}에 대한 상담 일정이 확정되었습니다.`;
            break;
          case "meeting":
            title = "상담 진행 중";
            body = `${vehicleName}에 대한 상담이 진행 중입니다.`;
            break;
          case "completed":
            title = "상담 완료";
            body = `${vehicleName}에 대한 상담이 완료되었습니다.`;
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
          data: dataPayload,
          token: fcmToken,
        };

        const response = await messaging.send(message);
        logger.info(`Notification sent successfully: ${response}`);
      } catch (error) {
        logger.error("Error sending notification:", error);
      }
    },
);

/**
 * ⭐ Cloud Functions v2 - 긴급 차량 삭제
 * - 관리자 권한 확인
 * - 차량 문서와 관련 이미지를 Storage에서 삭제
 * - admin_activity_log에 삭제 작업 기록
 */
export const emergencyDeleteVehicle = onCall(async (request) => {
  const {vehicleId} = request.data;

  if (!vehicleId) {
    throw new HttpsError("invalid-argument", "차량 ID가 필요합니다.");
  }

  // 1) 관리자 권한 확인
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "인증이 필요합니다.");
  }

  const uid = request.auth.uid;

  try {
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "사용자를 찾을 수 없습니다.");
    }

    const userData = userDoc.data();
    if (userData?.role !== "admin") {
      throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
    }

    // 2) 차량 문서 조회
    const vehicleDoc = await db.collection("vehicles").doc(vehicleId).get();

    if (!vehicleDoc.exists) {
      throw new HttpsError("not-found", "차량을 찾을 수 없습니다.");
    }

    const vehicleData = vehicleDoc.data();

    // 3) Storage에서 이미지 삭제
    const bucket = storage.bucket();
    const imageUrls: string[] = [];

    // 단일 이미지 URL
    if (vehicleData?.imageUrl) {
      imageUrls.push(vehicleData.imageUrl);
    }

    // 다중 이미지 URL 배열
    if (vehicleData?.imageUrls && Array.isArray(vehicleData.imageUrls)) {
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
      } catch (error) {
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
      vehicleName: vehicleData?.vehicleName || "Unknown",
      timestamp: FieldValue.serverTimestamp(),
      deletedImageCount: imageUrls.length,
    });

    logger.info(`Admin ${uid} deleted vehicle ${vehicleId}`);

    return {
      success: true,
      message: "차량이 성공적으로 삭제되었습니다.",
      deletedImages: imageUrls.length,
    };
  } catch (error: any) {
    logger.error("Error in emergencyDeleteVehicle:", error);

    // HttpsError는 그대로 던지고, 그 외는 internal로 처리
    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "차량 삭제 중 오류가 발생했습니다.");
  }
});
