# Task ID: 28

**Title:** Polish AdminPageScreen for Visual Consistency

**Status:** done

**Dependencies:** None

**Priority:** medium

**Description:** Perform minor but important UI cleanup on the AdminPageScreen to align it with other refactored admin screens. This includes removing informal elements like emojis and ensuring standardized components like `Badge` and `StateScreen` are used.

**Details:**

Locate the Crashlytics test button and update its text to remove the '🧪' emoji, rewording to 'Test Crashlytics' if necessary. In the vehicle list section on this screen, map over the vehicles and render a `<Badge text={item.vehicleType} />` for each item, similar to the main vehicle list. Implement the empty state for this list by conditionally rendering `<StateScreen icon="directions-car" title="등록된 차량이 없습니다" />` when the user has no registered vehicles. Review all spacing on the `Card` components to ensure it matches the standard `theme.spacing` values used on other screens.

**Test Strategy:**

Load the AdminPageScreen. Verify the Crashlytics test button has no emoji. If the logged-in admin has registered vehicles, confirm each one in the list displays a `Badge` with the vehicle type. If the admin has no vehicles, verify the `StateScreen` is shown instead of an empty list. Visually compare the spacing and layout to the `AdminConsultationScreen` and `MyPageScreen` to ensure consistency.
