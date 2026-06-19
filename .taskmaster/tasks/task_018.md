# Task ID: 18

**Title:** Create Interaction State Components (Loading, Empty, Error)

**Status:** done

**Dependencies:** 11 ✓, 12 ✓, 14 ✓

**Priority:** medium

**Description:** Develop reusable components for displaying global loading spinners, skeleton loaders for lists, and full-page empty/error states.

**Details:**

1. `GlobalLoader`: A modal overlay with a semi-transparent background and an `ActivityIndicator` using the theme's primary color. 2. `SkeletonLoader`: A component that mimics the layout of a `<Card>` but with placeholder shapes and a shimmering animation. 3. `StateScreen`: A generic component accepting `icon`, `title`, `message`, and `onRetry` props to display consistent empty or error screens. It should use the secondary `<Button>` for the retry action.

**Test Strategy:**

Use Storybook to visually test each state component. Unit test the `StateScreen` to ensure props are rendered correctly and the `onRetry` callback is fired. Manually trigger these states in the app (e.g., by simulating a network delay or error) to see them in context.

## Subtasks

### 18.1. Implement the GlobalLoader Component

**Status:** done  
**Dependencies:** None  

Create a reusable full-screen modal component that displays a loading indicator to block UI interactions during global asynchronous operations.

**Details:**

Create a new component at `src/components/common/GlobalLoader.tsx`. Utilize React Native's `Modal` component with a semi-transparent background overlay. Center an `ActivityIndicator` component within the modal and configure it to use the primary color from the application's theme.

### 18.2. Develop the SkeletonLoader Component

**Status:** done  
**Dependencies:** None  

Build a skeleton loader that mimics the layout and structure of a standard Card component, providing a placeholder UI with a shimmering animation while content is loading.

**Details:**

Create the component at `src/components/common/SkeletonLoader.tsx`. Use a library like `react-native-skeleton-placeholder` to define shapes (e.g., rectangles for images, lines for text) that match the card layout. Ensure the shimmering animation is smooth and performant.

### 18.3. Create the Generic StateScreen Component

**Status:** done  
**Dependencies:** None  

Develop a versatile, full-page component for displaying empty data states or error messages, complete with an optional retry action.

**Details:**

Create the file `src/components/common/StateScreen.tsx`. The component must accept `icon`, `title`, `message`, and an optional `onRetry` function as props. If the `onRetry` prop is provided, a secondary-styled `Button` should be rendered that triggers the callback when pressed.

### 18.4. Implement a LoadingContext for Global State Management

**Status:** done  
**Dependencies:** 18.1  

Establish a React Context to manage the visibility of the GlobalLoader, allowing any component in the app to toggle the loader without prop drilling.

**Details:**

Create a new context at `src/context/LoadingContext.tsx`. The context provider should manage a boolean state for the loader's visibility and render the `GlobalLoader` component. Expose `showLoader` and `hideLoader` functions via a custom hook (e.g., `useLoading`). Wrap the root component in `App.tsx` with this provider.

### 18.5. Integrate All State Components into Storybook

**Status:** done  
**Dependencies:** 18.1, 18.2, 18.3  

Create Storybook stories for all three new components (`GlobalLoader`, `SkeletonLoader`, `StateScreen`) to ensure they can be developed and reviewed in isolation.

**Details:**

In the project's stories directory, create `GlobalLoader.stories.tsx`, `SkeletonLoader.stories.tsx`, and `StateScreen.stories.tsx`. For `StateScreen`, define multiple named exports to showcase its different configurations (e.g., 'EmptyState', 'ErrorWithRetry').
