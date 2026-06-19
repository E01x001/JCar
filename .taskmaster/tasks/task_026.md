# Task ID: 26

**Title:** Refactor AdminVehicleDetailScreen with JCar Design System

**Status:** done

**Dependencies:** 25 ✓

**Priority:** high

**Description:** Rebuild the AdminVehicleDetailScreen to use `Card` components for information grouping and apply the JCar Design System for all UI elements, including typography, spacing, and colors. This will eliminate hardcoded styles and improve visual consistency.

**Details:**

Replace the main container with a themed view, likely a `ScrollView`. Group related information ('차량 정보', '부품 정보', '등록자 정보') into separate `<Card>` components, each with a title using `<theme.typography.H5>`. Use `<Badge>` components to display the vehicle type and status. The current loading text should be replaced with a full-screen `<StateScreen icon="directions-car" message="Loading vehicle details..." />`. Remove the manually implemented back button and ensure the screen relies on the default React Navigation header. All `Text` components must be replaced with the appropriate components from `theme.typography` (e.g., `Body`, `Caption`). All padding and margin values must be derived from `theme.spacing`.

**Test Strategy:**

Navigate from the AdminVehiclesListScreen to this screen. Verify that information is correctly grouped within three distinct `Card` components. Check that `Badge` components are used for vehicle type and status. Simulate a loading state and confirm the `StateScreen` is shown. Ensure the manual back button is gone and the standard navigation header works. Inspect the component tree to confirm all text uses `theme.typography` and no inline styles for spacing or color are present.
