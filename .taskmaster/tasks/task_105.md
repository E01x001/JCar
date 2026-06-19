# Task ID: 105

**Title:** Integrate Loading Skeletons on All Data-Loading Screens

**Status:** pending

**Dependencies:** None

**Priority:** medium

**Description:** Improve perceived performance and user experience by displaying loading skeletons on screens while data is being fetched.

**Details:**

Install `react-native-skeleton-placeholder`. Create reusable skeleton components, such as `<SkeletonCard />` for vehicle listings, `<SkeletonList />` for general list items, and `<SkeletonText />` for text placeholders. Integrate these components into `ConsultationRequestScreen` (during duplicate check), `VehicleRegistrationScreen` (during image upload), all admin screens (during data loading), and `VehiclesListScreen` (during initial load and refresh). Ensure skeletons closely match the layout of the actual content to prevent layout shifts.

**Test Strategy:**

Manually test each affected screen, ideally under slow network conditions (using a network throttler). Verify that the skeleton loaders appear smoothly before content loads, include shimmer animations, and disappear gracefully when data is available. Ensure that the skeleton layout is consistent with the final content layout.
