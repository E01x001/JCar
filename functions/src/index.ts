import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();
const auth = getAuth();

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
