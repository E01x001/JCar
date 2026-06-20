/**
 * Scheduled Permanent Account Deletion (Task 126)
 *
 * Runs daily and permanently destroys accounts whose recovery window has
 * elapsed (accountStatus == 'pending_deletion' && permanentDeleteDate <= now).
 *
 * This is the ONLY place that destroys soft-deleted users' data — cascadeDeleteUser
 * merely hides it during the recovery window, so recoverDeletedUser can fully
 * restore an account before this function purges it.
 *
 * @module accountManagement/permanentDelete
 */

const {onSchedule} = require("firebase-functions/v2/scheduler");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

// Each vehicle = up to 2 writes (private subdoc + doc); cap chunk well under 500.
const CHUNK = 200;

/**
 * Extract the Storage object path from a Firebase Storage download URL.
 * @param {string} url - download URL
 * @return {string|null} object path, or null if not a Firebase Storage URL
 */
function storagePathFromUrl(url) {
  if (!url || !url.includes("firebasestorage.googleapis.com")) {
    return null;
  }
  const parts = url.split("/o/");
  if (parts.length < 2) {
    return null;
  }
  return decodeURIComponent(parts[1].split("?")[0]);
}

/**
 * Permanently delete a single user's data, Storage images, and Auth account.
 * Best-effort per resource; designed to be idempotent (safe to re-run).
 * @param {FirebaseFirestore.Firestore} db - Firestore
 * @param {object} bucket - default Storage bucket
 * @param {string} uid - user id
 * @return {Promise<{vehicles: number, consultations: number}>}
 */
async function purgeUser(db, bucket, uid) {
  const vehicles = await db.collection("vehicles")
      .where("sellerId", "==", uid)
      .get();

  // 1) Delete Storage images (both legacy imageUrl and the imageUrls array).
  for (const v of vehicles.docs) {
    const data = v.data();
    const urls = [];
    if (data.imageUrl) {
      urls.push(data.imageUrl);
    }
    if (Array.isArray(data.imageUrls)) {
      urls.push(...data.imageUrls);
    }
    const paths = [...new Set(urls.map(storagePathFromUrl).filter(Boolean))];
    for (const p of paths) {
      try {
        await bucket.file(p).delete();
      } catch (e) {
        functions.logger.warn("permanent-delete: storage delete failed", {
          path: p, error: e.message,
        });
      }
    }
  }

  // 2) Delete vehicle docs + their private contact subdocs (chunked).
  for (let i = 0; i < vehicles.docs.length; i += CHUNK) {
    const batch = db.batch();
    vehicles.docs.slice(i, i + CHUNK).forEach((d) => {
      batch.delete(d.ref.collection("private").doc("contact"));
      batch.delete(d.ref);
    });
    await batch.commit();
  }

  // 3) Delete consultation requests (as buyer and seller).
  const buy = await db.collection("consultation_requests")
      .where("userId", "==", uid).get();
  const sell = await db.collection("consultation_requests")
      .where("sellerId", "==", uid).get();
  const cdocs = [...buy.docs, ...sell.docs];
  for (let i = 0; i < cdocs.length; i += CHUNK) {
    const batch = db.batch();
    cdocs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // 4) Delete the user document. (admin_owned_vehicles are admin assets — kept.)
  await db.collection("users").doc(uid).delete();

  // 5) Delete the Firebase Auth account.
  try {
    await admin.auth().deleteUser(uid);
  } catch (e) {
    functions.logger.warn("permanent-delete: auth delete failed", {
      uid, error: e.message,
    });
  }

  return {vehicles: vehicles.size, consultations: cdocs.length};
}

/**
 * Daily scheduled permanent deletion of past-due soft-deleted accounts.
 */
exports.scheduledPermanentDelete = onSchedule({
  schedule: "every day 03:00",
  timeZone: "Asia/Seoul",
  timeoutSeconds: 540,
  memory: "512MiB",
}, async () => {
  const db = admin.firestore();
  const bucket = admin.storage().bucket();
  const now = new Date();

  // Query by status only (no composite index needed); filter the date in code.
  const pending = await db.collection("users")
      .where("accountStatus", "==", "pending_deletion")
      .get();

  const due = pending.docs.filter((d) => {
    const pdd = d.data().permanentDeleteDate;
    return pdd && pdd.toDate() <= now;
  });

  functions.logger.info("permanent-delete: due accounts", {
    pending: pending.size, due: due.length,
  });

  for (const userDoc of due) {
    const uid = userDoc.id;
    try {
      const r = await purgeUser(db, bucket, uid);
      functions.logger.info("permanent-delete: purged", {uid, ...r});
    } catch (e) {
      // Leave the account pending_deletion so the next run retries.
      functions.logger.error("permanent-delete: failed (will retry)", {
        uid, error: e.message,
      });
    }
  }

  return null;
});
