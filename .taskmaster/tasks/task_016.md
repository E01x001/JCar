# Task ID: 16

**Title:** Refactor Vehicle List and Detail Screens

**Status:** done

**Dependencies:** 12 ✓, 14 ✓

**Priority:** high

**Description:** Update the Vehicle List and Detail screens using the new design system components, including Card, Badge, and standardized typography and layout.

**Details:**

On the Vehicle List screen, wrap each list item in the new `<Card>` component. Use theme spacing for gaps between cards. Re-style the header according to the PRD. Inside the card, use the `<Badge>` for vehicle type and apply H3/Body typography from the theme. On the Vehicle Detail screen, structure content into sections with H4 titles. Use the theme for padding and spacing. Implement the fixed bottom action button using the primary `<Button>` component.

**Test Strategy:**

Manually navigate through the vehicle list and tap into detail pages. Verify that all elements use the new components and theme styles. Check for layout consistency across different list items. Ensure the bottom action button on the detail screen is fixed and functional.

## Subtasks

### 16.1. Refactor VehicleListItem to use Card and Badge Components

**Status:** done  
**Dependencies:** None  

Update the individual item component rendered in the vehicle list to use the new <Card> as its root element. Inside the card, replace existing elements with <Badge> for the vehicle type and apply H3/Body typography from the theme for other text.

**Details:**

Locate the component used for rendering each vehicle in the FlatList on the Vehicle List Screen. Replace the main container View with the <Card> component. Import and use the <Badge> component for vehicle status/type. Apply theme.typography.h3 and theme.typography.body styles to the relevant <Text> components.

### 16.2. Update Vehicle List Screen Layout and Header

**Status:** done  
**Dependencies:** 16.1  

Adjust the main FlatList on the Vehicle List screen to use theme spacing for the gap between the new Card items. Restyle the screen's header to match the new design system specifications.

**Details:**

In the VehicleListScreen file, modify the FlatList props. Use ItemSeparatorComponent or contentContainerStyle with a gap property set from the theme (e.g., theme.spacing.m). Update the header component or options in the navigation stack to apply the new typography and layout.

### 16.3. Restructure Vehicle Detail Screen with Theme Spacing and Typography

**Status:** in-progress  
**Dependencies:** None  

Refactor the layout of the Vehicle Detail screen to organize content into logical sections. Apply H4 typography for section titles and use theme-defined padding and spacing for all elements.

**Details:**

Open the VehicleDetailScreen file. Wrap content sections in <View> containers. Apply padding to the main screen container using theme.spacing.l. For each section, add a <Text> component with theme.typography.h4 style for the title. Ensure all margins and paddings use the theme's spacing tokens.

### 16.4. Implement Fixed Bottom Action Button on Vehicle Detail Screen

**Status:** pending  
**Dependencies:** 16.3  

Add a primary <Button> component to the Vehicle Detail screen that is fixed to the bottom of the viewport for the main call-to-action, such as '상담 신청'.

**Details:**

In VehicleDetailScreen, import the new <Button> component. Place it inside a View with absolute positioning (position: 'absolute', bottom: 0, left: 0, right: 0) and appropriate padding from the theme. Set the variant to 'primary' and pass the correct onPress handler.

### 16.5. Verify Navigation and Perform Final Visual Review

**Status:** pending  
**Dependencies:** 16.2, 16.4  

Ensure the navigation from the refactored Vehicle List screen to the refactored Vehicle Detail screen is working correctly. Conduct a final visual review of both screens to catch any inconsistencies.

**Details:**

Test the onPress handler on the new <Card> component in the vehicle list to ensure it navigates with the correct vehicleId. Review both screens on different device sizes if possible. Clean up any unused styles or imports from the old implementation.
