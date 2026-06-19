# Task ID: 35

**Title:** Refactor `AdminConsultationScreen` with New Tab Structure

**Status:** done

**Dependencies:** 33 ✓

**Priority:** high

**Description:** Rebuild the `AdminConsultationScreen` using `react-native-tab-view` to replace the old status-based tabs with the new '구매상담', '판매상담', and '거래완료' tabs.

**Details:**

Install or update `react-native-tab-view`. Replace the existing tab navigation logic in `AdminConsultationScreen` with the `TabView` component. Define three routes: 'buy', 'sell', 'completed'. Each route will render a list component (e.g., `ConsultationList`). Use placeholders for the lists initially. Ensure the tab bar styles are consistent with the JCar Design System.

**Test Strategy:**

Render the screen in an emulator/device. Verify that the three new tabs are displayed correctly. Test swiping and tapping to switch between tabs. Ensure there are no crashes and the basic structure is sound.
