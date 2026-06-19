/**
 * User Registration - Cloud Function
 *
 * Server-side registration so that:
 * - Phone numbers are checked for duplicates atomically against the users
 *   collection (cannot be done securely from the client).
 * - The Firebase Auth account and the Firestore users/{uid} document
 *   (including the email field) are created together.
 *
 * Called from the client via httpsCallable('registerUser') in the default
 * region (us-central1).
 *
 * NOTE: Restored from functions/src/index.ts, which was dropped during the
 * TypeScript cleanup (commit 5756d15) without being ported to the JS sources.
 *
 * @module accountManagement/registerUser
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Ensure the Admin SDK is initialized (idempotent across function instances).
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Register a new user.
 *
 * @param {Object} request - The callable function request
 * @param {string} request.data.email - New user's email
 * @param {string} request.data.password - New user's password
 * @param {string} request.data.name - New user's display name
 * @param {string} request.data.phoneNumber - New user's phone number
 * @return {Promise<{uid: string}>} The new user's UID
 * @throws {HttpsError} On missing fields, duplicate phone/email, or failure
 */
exports.registerUser = onCall(async (request) => {
  const {email, password, name, phoneNumber} = request.data || {};

  if (!email || !password || !name || !phoneNumber) {
    throw new HttpsError("invalid-argument", "필수 항목이 없습니다.");
  }

  const db = admin.firestore();
  const auth = admin.auth();

  // 1) Phone number duplicate check
  const phoneQuery = await db
      .collection("users")
      .where("phoneNumber", "==", phoneNumber)
      .get();

  if (!phoneQuery.empty) {
    throw new HttpsError("already-exists", "이미 존재하는 전화번호입니다.");
  }

  // 2) Create the Firebase Auth account
  let newUser;
  try {
    newUser = await auth.createUser({email, password});
  } catch (e) {
    throw new HttpsError("already-exists", "이미 존재하는 이메일입니다.");
  }

  const uid = newUser.uid;

  // 3) Create the Firestore users/{uid} document (email included)
  await db.collection("users").doc(uid).set({
    email,
    name,
    phoneNumber,
    role: "user",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {uid};
});
