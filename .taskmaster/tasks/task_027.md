# Task ID: 27

**Title:** Enhance AdminScheduleScreen with Design System Components

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Refactor the AdminScheduleScreen to standardize the display of consultation items and actions using `Card` and `Button` components from the JCar Design System. Integrate the theme for calendar markers and handle empty states.

**Details:**

Use the `react-native-calendars` library, which is likely already in use, and provide a `theme` prop to style it. The theme object should map calendar-specific keys to `theme.colors`. Example: `markedDates` should use `theme.colors.primary.main` for selected, `theme.colors.feedback.success` for approved, etc. Each consultation item in the list for a selected date should be wrapped in a `<Card>`. The 'Approve' and 'Reject' actions, currently `TouchableOpacity`, must be replaced with `<Button variant="success">Approve</Button>` and `<Button variant="danger">Reject</Button>`. When a date is selected that has no consultations, display the `<StateScreen icon="event-busy" title="No consultations scheduled" />`.

**Test Strategy:**

Select various dates on the calendar. Verify that marked dates use colors from the application theme. Confirm each consultation item is rendered within a `Card`. Test the 'Approve' and 'Reject' buttons to ensure they are the design system's `Button` components and that their functionality is preserved. Select a date with no scheduled consultations and verify that the correct `StateScreen` is displayed. Check for consistent theme-based spacing and typography.
