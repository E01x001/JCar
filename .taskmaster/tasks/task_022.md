# Task ID: 22

**Title:** Implement Tab View on MyPage Screen for Improved UX

**Status:** done

**Dependencies:** 11 ✓, 14 ✓, 17 ✓, 20 ✓

**Priority:** high

**Description:** Refactor the MyPage screen to use a tab-based navigation for separating 'Buy Consultations', 'Sell Consultations', and 'My Vehicles'. This will replace the current single scroll view, improving UI clarity and user experience.

**Details:**

First, install and configure the 'react-native-tab-view' library. Refactor the existing MyPageScreen.js to serve as the main container, keeping the top user info card (from Task 20) positioned above the new tab view. Create three new child components: BuyConsultationsTab.js, SellConsultationsTab.js, and MyVehiclesTab.js. Each of these components will be responsible for fetching and displaying its respective data in a FlatList, reusing the standardized <Card> component (from Task 14) for list items. In MyPageScreen.js, implement the TabView component, configure the routes for the three tabs, and pass the new components as the scenes. The tab bar should be styled using the application theme (from Task 11), with the active tab indicator using the 'primary' theme color. For the 'Buy' and 'Sell' tabs, fetch the count of items and pass it to a custom tab bar renderer to display a numeric <Badge> component. Ensure the 'Logout' and 'Account Deletion' buttons remain accessible, positioned below the tab view container.

**Test Strategy:**

1. Perform a visual comparison of the new MyPage screen against the design mockups, ensuring the user info card, tab bar, and tab content are correctly laid out. 2. Test navigation between the three tabs by both tapping on the tab labels and using swipe gestures. 3. Verify that each tab correctly displays its corresponding data list (buy consultations, sell consultations, and user's registered vehicles). 4. Confirm that the badge counters on the 'Buy' and 'Sell' tabs accurately reflect the number of items in their lists, including when the list is empty. 5. Ensure that all list items within the tabs are rendered using the consistent <Card> component and that theme colors are applied correctly, especially for the active tab indicator. 6. Verify that the 'Logout' and 'Account Deletion' buttons are visible and fully functional.

## Subtasks

### 22.1. Install and Configure react-native-tab-view Library

**Status:** done  
**Dependencies:** None  

Add the `react-native-tab-view` and its peer dependency `react-native-pager-view` to the project. Configure it for both iOS and Android platforms as per the library's documentation.

**Details:**

Run `npm install react-native-tab-view react-native-pager-view` or the yarn equivalent. Follow up with `npx pod-install` for iOS. Ensure the native dependencies are correctly linked and the app builds successfully on both platforms after the installation.

### 22.2. Refactor MyPageScreen.js to Host the Tab View

**Status:** in-progress  
**Dependencies:** 22.1  

Modify `MyPageScreen.js` to be the main container for the new tab layout. It should render the existing user info card at the top, the `TabView` component in the middle, and the 'Logout'/'Account Deletion' buttons at the bottom.

**Details:**

Structure the screen layout using a `View` or `SafeAreaView`. Position the existing user info card component above the `TabView`. Initialize the state for the `TabView` with `index` and `routes`. The routes will be: `[{ key: 'buy', title: 'Buy Consultations' }, { key: 'sell', title: 'Sell Consultations' }, { key: 'vehicles', title: 'My Vehicles' }]`. Place the action buttons below the tab view container.

### 22.3. Create Child Components for Tab Content

**Status:** pending  
**Dependencies:** 22.2  

Create three new functional components: `BuyConsultationsTab.js`, `SellConsultationsTab.js`, and `MyVehiclesTab.js`. These components will serve as the scenes for the `TabView` and will contain the logic for their respective content.

**Details:**

Create a new directory `src/screens/MyPage/tabs`. Inside, create the three component files. Each file should export a default React Native component. For now, they can render simple placeholder text (e.g., `<Text>Buy Consultations</Text>`). These will be connected as scenes in `MyPageScreen.js`.

### 22.4. Implement Data Fetching and Display in Tab Components

**Status:** pending  
**Dependencies:** 22.3  

Implement the logic within each of the three new tab components to fetch their respective data from Firestore and display the results in a `FlatList` using the standardized `<Card>` component.

**Details:**

In each tab component, use a `useEffect` hook to fetch data from Firestore based on the current user's ID. Use `consultation_requests` for the buy/sell tabs (filtering by requester/seller ID) and the `vehicles` collection for the My Vehicles tab. Render the fetched data in a `FlatList`, using the existing `<Card>` component (from Task 14) for list items. Implement loading and empty state UI.

### 22.5. Style Tab Bar and Implement Custom Badge Renderer

**Status:** pending  
**Dependencies:** 22.4  

Customize the `TabBar` of the `TabView` to match the application theme. Implement a custom renderer to display a numeric `<Badge>` component showing the item count for the 'Buy' and 'Sell' tabs.

**Details:**

In `MyPageScreen.js`, pass a custom function to the `renderTabBar` prop of `TabView`. Use the theme context (from Task 11) to style the tab bar's background, labels, and indicator, setting the active indicator color to `theme.colors.primary`. Fetch the count for 'buy' and 'sell' items and pass these counts to the custom tab bar to render a `<Badge>` component next to the respective tab titles.
