# Task ID: 122

**Title:** Introduce a __DEV__-gated logger and prune production console noise

**Status:** done

**Dependencies:** None

**Priority:** low

**Description:** src has ~240 console.* calls across 47 files; many are debug spam left in user hot paths (e.g. ConsultationRequestScreen checkDuplicateConsultation logs each doc). Add a small logger util gated on __DEV__ and migrate the noisy debug logs; keep error reporting via reportCrashlyticsError.

**Details:**

Create src/utils/logger.js exposing log/warn/info gated by __DEV__ (error may stay or route to Crashlytics). Follow the existing if(__DEV__) pattern already used in src/utils/errorHandler.js:260. Migrate the highest-noise files first: src/screens/ConsultationRequestScreen.js (~19 calls incl. per-doc duplicate-check logs), src/services/consultation/consultationService.js, src/stores/*.js. Do NOT blanket-delete: many console.error calls are intentional error logging. Scope iteratively to keep diffs reviewable.

**Test Strategy:**

npm run lint stays clean (no-console warnings drop where migrated). Confirm release build emits no debug logs in migrated paths; error reporting still reaches Crashlytics.
