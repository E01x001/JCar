# Task ID: 123

**Title:** Standardize user feedback: Alert vs Toast

**Status:** pending

**Dependencies:** None

**Priority:** low

**Description:** 48 Alert.alert calls across 14 files coexist with the useToast hook. Convert informational single-button alerts to toasts; keep Alert (or a custom modal) only for confirmations/choices.

**Details:**

useToast (src/hooks/useToast.js) provides showSuccess/Error/Info/Warning. Classify each Alert.alert: (a) informational single-button -> replace with toast; (b) confirmation/choice dialogs MUST stay (Toast has no buttons): e.g. MyPageScreen.js:127 (delete account), VehicleRegistrationScreen.js:54 (gallery/camera choice), ConsultationRequestScreen confirm-then-goBack. TRAP: do not blanket-replace, it breaks blocking confirm flows. Establish a one-line convention (toast = notify, Alert/modal = decide) and apply across screens/services.

**Test Strategy:**

Manually verify each converted site shows a toast and each retained dialog still blocks/branches correctly. Lint clean.
