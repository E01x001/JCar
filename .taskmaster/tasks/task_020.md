# Task ID: 20

**Title:** Refactor MyPage and Admin Screens

**Status:** done

**Dependencies:** 12 ✓, 14 ✓, 17 ✓

**Priority:** medium

**Description:** Apply the new design system and components to the MyPage and Admin screens to ensure full app consistency.

**Details:**

For MyPage, use the `<Card>` component for the user info section and for each menu list item. Use appropriate button variants for 'Logout' (Secondary) and '회원탈퇴' (Danger Text). For Admin screens, implement the tab bar styling with the primary color bottom border for the active tab. Replace list items and buttons with the new `<Card>`, `<Badge>`, and `<Button>` (Success/Danger) components to standardize the interface.

**Test Strategy:**

Perform a visual audit of the MyPage and Admin screens, comparing them against the PRD mockups. Test all interactive elements, including menu navigation, logout, and admin actions (e.g., approving/rejecting items) to confirm functionality and consistent styling.

## Subtasks

### 20.1. Refactor MyPage User Info Section with Card Component

**Status:** done  
**Dependencies:** None  

Update the MyPage screen to display the user's profile information within the new <Card> component, replacing the existing View-based container.

**Details:**

Locate the MyPage screen file (likely 'src/screens/MyPage/MyPageScreen.js'). Import the <Card> component. Wrap the user avatar, name, and email section in a single <Card> component. Use theme spacing tokens for internal padding.

### 20.2. Update MyPage Menu List and Action Buttons

**Status:** done  
**Dependencies:** 20.1  

Convert the list of navigation links (e.g., '내 정보 수정', '고객센터') into individual <Card> components and update the 'Logout' and '회원탈퇴' buttons to use the new <Button> variants.

**Details:**

In the MyPage screen file, map over the menu items and render each as a pressable <Card>. Replace the existing logout button with <Button variant='Secondary'> and the withdrawal link/button with <Button variant='Danger Text'>.

### 20.3. Implement Styled Tab Bar for Admin Screens

**Status:** done  
**Dependencies:** None  

Apply the new design system styling to the tab bar in the Admin section. The active tab must have a primary-colored bottom border to indicate its state.

**Details:**

Locate the Admin Tab Navigator configuration. Use the 'tabBarOptions' or equivalent prop to customize the styling. Set 'activeTintColor' to the theme's primary color and apply a 'borderBottomWidth' and 'borderBottomColor' style to the active tab label or indicator.

### 20.4. Refactor Admin List Items using Card and Badge Components

**Status:** done  
**Dependencies:** 20.3  

Update the lists within the Admin screens (e.g., vehicle approval list) to use the new <Card> component for each item and the <Badge> component for status indicators.

**Details:**

In the relevant Admin screen file (e.g., 'VehicleApprovalScreen.js'), modify the list rendering logic. Each item in the FlatList or map should be wrapped in a <Card>. Use the <Badge> component to display item status (e.g., 'Pending', 'Approved').

### 20.5. Replace Admin Action Buttons with New Component Variants

**Status:** done  
**Dependencies:** 20.4  

Replace the existing approval and rejection buttons within the admin list items with the new <Button> component, using the 'Success' and 'Danger' variants.

**Details:**

Within the admin list item component, import the new <Button>. Replace the 'Approve' button with <Button variant='Success'> and the 'Reject' button with <Button variant='Danger'>. Ensure onPress handlers are correctly passed.
