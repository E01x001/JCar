# Task ID: 37

**Title:** Redesign and Implement `ConsultationCard` Component

**Status:** done

**Dependencies:** 36 ✓

**Priority:** medium

**Description:** Update the existing consultation card or create a new one to display the required information and dynamic action buttons based on the `consultationStatus`.

**Details:**

Use the JCar `Card` component as a base. Display vehicle name, image, customer info, and creation date. Add a `Badge` component for `consultationStatus`, mapping statuses to colors as specified in the PRD (e.g., `pending` -> `theme.colors.warning.main`). Implement conditional rendering for action buttons (`Button` component) based on the `consultationStatus`: e.g., if status is 'pending', show '채결', '보류', '거절' buttons.

**Test Strategy:**

Create a Storybook or a test screen to render the `ConsultationCard` with props for every possible `consultationStatus`. Verify that the correct information, badge color, and set of action buttons are displayed for each state.

## Subtasks

### 37.1. Create ConsultationCard Component and Define Props

**Status:** done  
**Dependencies:** None  

Create the basic file structure for the `ConsultationCard` component and define its props interface. The component should be built using the JCar `Card` as its root element.

**Details:**

Create a new file at `src/components/consultation/ConsultationCard.tsx`. Define a `ConsultationCardProps` interface that accepts a consultation object containing vehicle name, image URL, customer info, creation date, and consultationStatus.

### 37.2. Display Basic Consultation Information

**Status:** done  
**Dependencies:** 37.1  

Render the static information within the `ConsultationCard`, including the vehicle name, image, customer details, and the consultation creation date.

**Details:**

Inside the `ConsultationCard` component, use `Text` and `Image` components to display the data received from props. Arrange the elements in a clean, readable layout within the base `Card` component.

### 37.3. Implement Dynamic Status Badge

**Status:** done  
**Dependencies:** 37.1  

Integrate the `Badge` component to display the `consultationStatus`. The badge's color should change dynamically based on the status value.

**Details:**

Create a mapping object that links each `consultationStatus` (e.g., 'pending', 'confirmed', 'rejected') to a specific color from the theme (e.g., `theme.colors.warning.main`). Use this map to set the `color` prop of the `Badge` component.

### 37.4. Implement Conditional Action Buttons

**Status:** done  
**Dependencies:** 37.1  

Add a section for action buttons that render conditionally based on the `consultationStatus` prop. The buttons will not have functionality yet, only the correct UI.

**Details:**

Use a switch statement or a series of conditional checks on the `consultationStatus` prop. For each status, render the appropriate set of `Button` components. For 'pending', render '채결', '보류', '거절' buttons. For other statuses, render the relevant buttons or none at all.

### 37.5. Create Storybook for All Component States

**Status:** done  
**Dependencies:** 37.2, 37.3, 37.4  

Create a comprehensive Storybook file for the `ConsultationCard` that showcases all possible variations of the component based on the `consultationStatus`.

**Details:**

Create `ConsultationCard.stories.tsx`. Add a separate story for each possible `consultationStatus` (e.g., 'Pending', 'Confirmed', 'OnHold', 'Rejected'). Pass mock data to each story to ensure it accurately represents a real-world use case.
