"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = exports.helloWorld = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const options_1 = require("firebase-functions/v2/options");
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
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
//# sourceMappingURL=index.js.map