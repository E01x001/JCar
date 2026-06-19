# Task ID: 121

**Title:** Consolidate consultation status enum to match the real 8-state model

**Status:** pending

**Dependencies:** None

**Priority:** medium

**Description:** constants/consultation.js only defines 5 statuses but the live model uses 8 (adds confirmed, on-hold, archived). Align the enum, labels, colors, and transition rules, and replace remaining magic strings.

**Details:**

CONSULTATION_STATUS in src/constants/consultation.js lists pending/approved/rejected/completed/cancelled, but the real model also includes confirmed, on-hold, and archived. Evidence: src/components/Badge.js (8-status union + propTypes), src/types/FIRESTORE_SCHEMA.md, src/components/ConsultationCard.js (sets on-hold via a button; branches on confirmed/on-hold), src/services/consultation/consultationQueryService.js (queries confirmed/on-hold). Work: (1) add CONFIRMED/ON_HOLD/ARCHIVED to CONSULTATION_STATUS; (2) extend CONSULTATION_STATUS_LABELS and CONSULTATION_STATUS_COLORS; (3) review and update VALID_STATUS_TRANSITIONS for the full lifecycle (e.g. pending->confirmed/on-hold, on-hold->approved/rejected, etc.); (4) replace magic-string literals with constants in consultationService.cancelConsultation (currently keeps literal confirmed/on-hold) and other call sites; (5) confirm theme/colors.js on-hold color is referenced via the constant. Touches the status model broadly, so verify admin and user flows after.

**Test Strategy:**

Verify Badge, ConsultationCard, and query services render/filter all 8 statuses correctly. Manually exercise admin status transitions (pending->confirmed/on-hold/approved/rejected->completed) and user cancel (allowed only for early states). Run npm run lint and the consultation-related Jest tests.
