import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

initializeApp();
const db = getFirestore();
const auth = getAuth();
const messaging = getMessaging();

setGlobalOptions({ maxInstances: 10 });

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
  const { email, password, name, phoneNumber } = request.data;

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

  return { uid };
});

/**
 * ⭐ Cloud Functions v2 - 상담 요청 상태 변경 시 알림 전송
 * - consultation_requests 문서가 업데이트될 때 트리거
 * - status 필드가 변경된 경우에만 알림 전송
 * - 사용자의 FCM 토큰을 조회하여 푸시 알림 발송
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
    } catch (error) {
      logger.error("Error sending notification:", error);
    }
  }
);
