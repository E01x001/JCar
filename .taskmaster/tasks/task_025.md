# Task ID: 25

**Title:** Refactor AdminVehiclesListScreen with JCar Design System

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Overhaul the AdminVehiclesListScreen to align with the user-facing visual style by implementing the JCar Design System. This involves replacing hardcoded styles and plain components with themed, standardized components for layout, vehicle items, and actions.

**Details:**

Refactor the entire screen, starting with the root view. Replace the current root with `<SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.secondary }}>`. Use a FlatList to render vehicle items. Each item, previously a View, should be wrapped in a `<Card>` component. Inside the card, display vehicle details using `<theme.typography.Body>` and similar components. The vehicle type should be rendered using `<Badge text={item.vehicleType} />`. The delete button must be replaced with `<Button variant="danger" onPress={() => handleDelete(item.id)}>Delete</Button>`. For loading states, use the `<SkeletonLoader>` component, displaying 3-4 placeholder cards. For the empty state, conditionally render `<StateScreen icon="directions-car" title="등록된 차량이 없습니다." />` when the vehicle list is empty. Add a header card with `<Card><theme.typography.H4>차량 관리</theme.typography.H4></Card>`.

**Test Strategy:**

Verify the screen's background color matches `theme.colors.background.secondary`. Confirm all vehicle items are rendered inside `Card` components. Check that `Badge` components correctly display the vehicle type. Test the delete `Button` functionality, ensuring it triggers the Firebase Function. Manually set the data source to an empty array and confirm the `StateScreen` appears. Simulate a loading state and ensure the `SkeletonLoader` is displayed. Use a code linter or manual inspection to ensure no hardcoded color, font, or spacing values exist.

## Subtasks

### 25.1. Refactor AdminVehiclesListScreen Root Layout and Add Header

**Status:** done  
**Dependencies:** None  

Replace the current root `<View>` with a themed `<SafeAreaView>` and add a `<Card>` component to serve as the screen header containing the title '차량 관리'.

**Details:**

Use the `useTheme` hook to access theme properties. The root component should be a `SafeAreaView` with its style set to `{ flex: 1, backgroundColor: theme.colors.background.secondary }`. Add a `<Card>` component at the top of the screen containing `<theme.typography.H4>차량 관리</theme.typography.H4>`.

### 25.2. Replace ScrollView with a Performant FlatList

**Status:** done  
**Dependencies:** 25.1  

Upgrade the vehicle list rendering from the current implementation (likely a `ScrollView` with a `.map()` function) to a more performant and standard `FlatList` component.

**Details:**

Import `FlatList` from 'react-native'. Configure its `data` prop with the fetched vehicles array, `keyExtractor` to use `item.id`, and `renderItem` which will render the new vehicle item component. Add appropriate spacing between items using `ItemSeparatorComponent` or content container styles.

### 25.3. Create and Integrate the JCar VehicleListItem Component

**Status:** done  
**Dependencies:** 25.2  

Create a new component for rendering a single vehicle item using the JCar Design System, including `Card`, `Badge`, and themed typography, and integrate it into the `FlatList`.

**Details:**

The new component will receive a vehicle `item` as a prop. The root element will be a `<Card>`. Inside the card, display vehicle details using `<theme.typography.Body>`. The vehicle type must be rendered using `<Badge text={item.vehicleType} />`. This component will be returned by the `FlatList`'s `renderItem` function.

### 25.4. Implement Loading and Empty States using Design System Components

**Status:** done  
**Dependencies:** 25.1  

Replace the simple text-based loading and empty state indicators with the standardized `SkeletonLoader` and `StateScreen` components for a consistent user experience.

**Details:**

When the data is loading, render the `<SkeletonLoader>` component, configured to display 3-4 placeholders that mimic the `Card` layout. If the data has loaded and the vehicle list is empty, render `<StateScreen icon="directions-car" title="등록된 차량이 없습니다." />`.

### 25.5. Refactor Delete Action with Design System Button

**Status:** done  
**Dependencies:** 25.3  

Replace the old `TouchableOpacity` delete button within each vehicle item with the JCar Design System `<Button>` component and ensure its functionality.

**Details:**

Inside the new `VehicleListItem` component, add a `<Button variant="danger" onPress={() => handleDelete(item.id)}>Delete</Button>`. Ensure the `handleDelete` function is correctly passed as a prop and is triggered when the button is pressed.
