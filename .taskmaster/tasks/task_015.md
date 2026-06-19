# Task ID: 15

**Title:** Refactor Login and Sign-up Screens

**Status:** done

**Dependencies:** 12 ✓, 13 ✓

**Priority:** high

**Description:** Apply the new design system to the Login and Sign-up screens, replacing existing elements with the new unified Button and Input Field components and adjusting layout spacing.

**Details:**

Navigate to the authentication screen files. Replace all `<Button>` and `<TextInput>` instances with the new `<Button>` and `<InputField>` components. Use the 'primary' variant for the main action button and 'text' variant for links like '비밀번호 찾기'. Remove any hardcoded style values and use spacing tokens from the theme for margins and paddings between the logo, input fields, and buttons as per the PRD.

**Test Strategy:**

Perform visual regression testing to compare the old screens with the newly styled ones. Manually test the login and sign-up flows to ensure functionality is unchanged. Check that focus, error, and button press states work as expected.

## Subtasks

### 15.1. Refactor Input Fields and Layout on Login Screen

**Status:** done  
**Dependencies:** None  

Navigate to the Login screen file. Replace all existing `TextInput` components with the new, unified `InputField` component from the design system. Adjust the layout by removing hardcoded styles and applying spacing tokens from the theme for consistent margins and padding between the logo, inputs, and other elements.

**Details:**

Identify the main login screen file, likely located at `src/screens/auth/LoginScreen.tsx`. Import the new `InputField` component. Systematically replace each `TextInput` for email and password. Utilize the theme provider hook (e.g., `useTheme`) to access spacing tokens (`theme.spacing.medium`, etc.) and apply them via the style prop for vertical spacing.

### 15.2. Refactor Buttons on Login Screen

**Status:** done  
**Dependencies:** 15.1  

In the Login screen file, replace the existing primary action button and any text-based navigation links with the new unified `Button` component, using the appropriate variants.

**Details:**

In `src/screens/auth/LoginScreen.tsx`, import the new `Button` component. Replace the main login submission button with `<Button variant="primary" title="로그인">`. Replace text links like '비밀번호 찾기' and '회원가입' with `<Button variant="text" title="비밀번호 찾기">`. Ensure all `onPress` handlers are correctly reassigned to the new components.

### 15.3. Refactor Input Fields and Layout on Sign-up Screen

**Status:** done  
**Dependencies:** 15.2  

Navigate to the Sign-up screen file. Replace all `TextInput` components with the new `InputField` component and apply theme spacing tokens to standardize the layout, similar to the Login screen.

**Details:**

Locate the sign-up screen file, likely at `src/screens/auth/SignUpScreen.tsx`. Import the `InputField` component. Replace all text inputs (e.g., email, password, confirm password, name) with the new component. Apply spacing tokens from the theme to ensure consistent vertical rhythm between form elements.

### 15.4. Refactor Buttons on Sign-up Screen

**Status:** done  
**Dependencies:** 15.3  

In the Sign-up screen file, replace the existing primary action button and text links with the new `Button` component, applying the correct variants.

**Details:**

In `src/screens/auth/SignUpScreen.tsx`, import the `Button` component. Replace the main registration button with `<Button variant="primary" title="회원가입">`. Convert the '이미 계정이 있나요? 로그인' link to use the `<Button variant="text">`. Re-connect the `onPress` handlers to the new components.

### 15.5. Final Review and Functional Testing of Auth Flow

**Status:** done  
**Dependencies:** 15.2, 15.4  

Perform a comprehensive visual review and functional test of the entire authentication flow, covering both the Login and Sign-up screens, to ensure functionality is preserved and styling is consistent.

**Details:**

Manually navigate between the Login and Sign-up screens. Test the complete sign-up process with valid and invalid data to check error states. Test the login process with correct and incorrect credentials. Perform a visual comparison of both screens against the PRD mockups to catch any inconsistencies in layout, spacing, or component styling.
