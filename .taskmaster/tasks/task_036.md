# Task ID: 36

**Title:** Implement Firestore Queries for New Consultation Tabs

**Status:** done

**Dependencies:** 35 ✓

**Priority:** high

**Description:** Create and integrate the Firestore query logic to fetch the correct data for the '구매상담', '판매상담', and '거래완료' tabs.

**Details:**

In your Firestore service, create three new functions: `getBuyConsultations`, `getSellConsultations`, `getCompletedConsultations`. `getBuyConsultations`: `where('type', '!=', 'sell').where('consultationStatus', '!=', 'completed')`. `getSellConsultations`: `where('type', '==', 'sell').where('consultationStatus', '!=', 'completed')`. `getCompletedConsultations`: `where('consultationStatus', '==', 'completed')`. These queries may require creating composite indexes in Firestore. Integrate these functions into the respective list components within the `AdminConsultationScreen` tabs.

**Test Strategy:**

Create mock data in Firestore that matches all three tab conditions. Verify that each tab displays only the correct set of consultations. Check the Firestore console for any index creation prompts. Test empty states using the `StateScreen` component.
