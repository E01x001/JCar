# Task ID: 17

**Title:** Implement Standardized Navigation Headers and Tab Bar

**Status:** done

**Dependencies:** 11 ✓

**Priority:** medium

**Description:** Apply a consistent design to the global navigation header and bottom tab bar across the application, using the styles defined in the PRD.

**Details:**

This task likely involves configuring the navigation library (e.g., React Navigation). Define a common `headerStyle` object using theme colors (`primary` for background, `white` for text) and apply it as a default screen option. For the tab bar, configure `tabBarOptions` or `tabBarStyle` to set the background, height, and active/inactive tint colors using the theme. The active tab's top border can be implemented using a custom tab bar component if the library doesn't support it directly.

**Test Strategy:**

Navigate through all major sections of the app and verify that the header and tab bar have a consistent appearance. Check that the active tab state (color, border) is correctly displayed on each screen.

## Subtasks

### 17.1. Define Centralized Navigation Style Constants

**Status:** done  
**Dependencies:** None  

Create a dedicated file to define and export style objects for the global header and tab bar, pulling values from the application's theme file.

**Details:**

Create a new file at `src/navigation/navigationStyles.js`. In this file, import the application's theme object. Export a `defaultHeaderOptions` object containing `headerStyle`, `headerTintColor`, and `headerTitleStyle`. Also, export a `defaultTabBarOptions` object containing `tabBarStyle`, `tabBarActiveTintColor`, and `tabBarInactiveTintColor`.

### 17.2. Apply Standardized Styles to the Global Header

**Status:** done  
**Dependencies:** 17.1  

Update the root Stack Navigator configuration to import and apply the centralized header style object as its default `screenOptions`.

**Details:**

Locate the primary `StackNavigator` component in the application, likely in `src/navigation/AppNavigator.js`. Import the `defaultHeaderOptions` object from `navigationStyles.js` and spread it into the `screenOptions` prop of the `Stack.Navigator` component to apply the style to all screens within that stack.

### 17.3. Apply Standardized Styles to the Bottom Tab Bar

**Status:** done  
**Dependencies:** 17.1  

Configure the main BottomTabNavigator to use the centralized tab bar style object for its background, height, and active/inactive icon and label colors.

**Details:**

Find the `BottomTabNavigator` component. Import the `defaultTabBarOptions` from `navigationStyles.js`. Apply these options to the `screenOptions` prop of the `Tab.Navigator`. This will set the `tabBarStyle`, `tabBarActiveTintColor`, and `tabBarInactiveTintColor` for all tabs.

### 17.4. Implement Active Tab Top Border Indicator

**Status:** done  
**Dependencies:** 17.3  

Implement the visual indicator (a colored top border) for the currently active tab in the bottom tab bar as specified in the PRD.

**Details:**

Since React Navigation's default tab bar doesn't directly support a top border on the active item, update the `tabBarIcon` function for each `Tab.Screen`. The function should return a `View` that wraps the icon. This `View` will conditionally apply a `borderTopWidth` and `borderTopColor` style when its `focused` prop is true.

### 17.5. Full App Navigation Style Verification and Cleanup

**Status:** done  
**Dependencies:** 17.2, 17.4  

Perform a comprehensive review of the entire application to ensure the new navigation styles are applied consistently and remove any old, screen-specific header or tab bar style overrides.

**Details:**

Manually navigate to every screen, including nested screens within stacks. Identify any screens that still have local `options` prop styling for the header that conflicts with the new global style. Remove these local overrides unless they are intentionally different. Ensure a consistent user experience across the app.
