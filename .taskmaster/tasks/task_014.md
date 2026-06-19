# Task ID: 14

**Title:** Develop Card and Status Badge Components

**Status:** done

**Dependencies:** 11 ✓

**Priority:** high

**Description:** Create reusable Card and Badge components. The Card will be a container for content sections, and the Badge will be used to display status labels like '대기중', '승인', etc.

**Details:**

For `src/components/Card.js`, create a `View` with styles defined by the PRD (background, border radius, padding, shadow). It should accept `children` to render any content inside. For `src/components/Badge.js`, the component should take a `status` prop ('waiting', 'approved', 'rejected', 'completed'). Based on the status, it should apply the corresponding semantic color from the theme (Warning for waiting, Success for approved, etc.) for its background. All styling should be derived from the theme.

**Test Strategy:**

Visually test the Card component with various child elements to ensure padding and shadow are correct. For the Badge, create a Storybook story that displays all status variants to confirm correct color mapping and styling. Unit test the Badge to ensure the `status` prop correctly maps to the theme color.

## Subtasks

### 14.1. Create Card.js Component File and Basic Structure

**Status:** done  
**Dependencies:** None  

Initialize the `Card.js` file within `src/components/`. Set up a basic React Native functional component that accepts and renders `children` props within a `View`.

**Details:**

Create the file at `src/components/Card.js`. The component should be a simple functional component that receives `children` and an optional `style` prop and renders them inside a `View`. Example: `const Card = ({ children, style }) => <View style={[styles.container, style]}>{children}</View>;`

### 14.2. Apply Theme-Based Styling to the Card Component

**Status:** done  
**Dependencies:** 14.1  

Enhance the `Card` component by applying styles for background color, border radius, padding, and shadow. These styles must be derived from the application's theme.

**Details:**

Access the theme context to retrieve styling values. Apply a background color (e.g., `theme.colors.surface`), padding (e.g., `theme.spacing.m`), and border radius (e.g., `theme.radii.m`). Implement platform-specific shadow for iOS and elevation for Android.

### 14.3. Create Badge.js Component File and Define Prop Interface

**Status:** done  
**Dependencies:** None  

Create the `src/components/Badge.js` file. Set up a functional component that accepts a `status` prop with defined possible values ('waiting', 'approved', 'rejected', 'completed') and renders a `View` containing a `Text` element.

**Details:**

Create the file `src/components/Badge.js`. The component signature should be `const Badge = ({ status }) => { ... };`. It should be prepared to handle dynamic styling and text content based on the `status` prop.

### 14.4. Implement Dynamic Styling and Text Mapping for Badge

**Status:** done  
**Dependencies:** 14.3  

Implement the core logic for the `Badge` component. This includes mapping the `status` prop to a specific background color from the theme and a corresponding Korean text label (e.g., 'waiting' -> '대기중').

**Details:**

Create a helper function or a configuration object to map each status to its theme color and text. For example: `const config = { waiting: { color: theme.colors.warning, text: '대기중' }, approved: { color: theme.colors.success, text: '승인' } };`. Use this config to dynamically set the `backgroundColor` of the `View` and the content of the `Text` component.

### 14.5. Finalize Badge Styling and Document with Storybook

**Status:** done  
**Dependencies:** 14.2, 14.4  

Add final styling touches to the Badge, such as padding, border radius, and text styling. Create a Storybook story to display all variants of the Badge, and an example of the Card containing content.

**Details:**

In `Badge.js`, apply styles from the theme for horizontal/vertical padding, border-radius, and text color/font size to ensure readability and a polished look. Create `Badge.stories.js` to render a list of all badge variants ('waiting', 'approved', 'rejected', 'completed') for visual regression testing.
