# Task ID: 128

**Title:** Resolve remaining npm audit advisories requiring major upgrades

**Status:** pending

**Dependencies:** None

**Priority:** low

**Description:** After lockfile-only safe fixes (critical/high cleared), ~33 moderate advisories remain that need semver-major upgrades of build-only tooling.

**Details:**

Remaining: @react-native-community/cli + cli-platform-android/ios (15.x -> 20.x) which MUST track the React Native version (currently 0.77) — do NOT bump independently; align during an RN upgrade. Also fast-xml-parser (transitive, major fix). These are build/dev tooling, not shipped in the app bundle, so real risk is low. Approach: (a) confirm each is dev/build-only via npm ls; (b) bump only what is safe and compatible with RN 0.77; (c) defer the RN CLI bump to a coordinated RN version upgrade. Re-run npm audit after. Verify Metro bundling + a release build still work (release smoke test).

**Test Strategy:**

npm audit shows 0 critical/high (already) and reduced moderate. App still builds (assembleRelease/bundleRelease) and Metro bundles without errors. jest + lint green.
