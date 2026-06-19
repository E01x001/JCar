# Task ID: 13

**Title:** Develop Unified Input Field Component

**Status:** done

**Dependencies:** 11 ✓

**Priority:** high

**Description:** Create a reusable text input component with consistent styling for default, focus, and error states as specified in the PRD.

**Details:**

Create `src/components/InputField.js`. This component will wrap React Native's `TextInput`. It should accept props like `value`, `onChangeText`, `placeholder`, `error` (a string for the error message), etc. Use the `useState` hook to track focus state (`onFocus`, `onBlur`). Apply conditional styling based on focus and the presence of the `error` prop. The error message should be displayed below the input field using the 'Danger' color. All styling (height, padding, border radius, colors) should come from the theme.

**Test Strategy:**

Visually test the component in different states: default, focused, with input text, and with an error message. Write unit tests to check that the border color and style change on focus/blur, and that the error message is rendered correctly when the `error` prop is provided.

## Subtasks

### 13.1. Create Basic InputField Component Structure

**Status:** done  
**Dependencies:** None  

Create the file `src/components/InputField.js` and set up a basic functional component that wraps the React Native `TextInput`. The component should accept and pass through essential props like `value`, `onChangeText`, and `placeholder`.

**Details:**

Initialize the file at `src/components/InputField.js`. The component should return a `View` containing a `TextInput`. Ensure props like `value`, `onChangeText`, and `placeholder` are correctly passed to the `TextInput` element.

### 13.2. Apply Default Styles from Theme

**Status:** done  
**Dependencies:** 13.1  

Integrate the application's theme to apply default styling to the InputField. This includes border radius, background color, padding, text color, and border color for the default (non-focused, no-error) state.

**Details:**

Use the theme context to access style values. Create a StyleSheet for the component. Apply theme values for `colors.border`, `colors.text`, `spacing.padding`, `borderRadius`, and a fixed height as specified in the PRD.

### 13.3. Implement Focus State and Styling

**Status:** done  
**Dependencies:** 13.2  

Use the `useState` hook to track the input's focus state. Implement `onFocus` and `onBlur` handlers to update the state, and apply conditional styling when the input is focused, such as changing the border color.

**Details:**

Create a state variable `isFocused` initialized to `false`. The `onFocus` prop of `TextInput` should set `isFocused` to `true`, and `onBlur` should set it to `false`. Use this state to conditionally change the `borderColor` to `theme.colors.primary`.

### 13.4. Implement Error State and Message Display

**Status:** done  
**Dependencies:** 13.3  

Handle the `error` prop. When an error string is passed, the input's border color should change to the 'danger' color. The error message itself should be displayed in a `Text` component directly below the input field.

**Details:**

The component should accept an `error` prop (string). If `error` has a value, override other border color styles with `theme.colors.danger`. Render a `<Text>` component conditionally (`{error && <Text>...}`), styling it with `theme.colors.danger`.

### 13.5. Finalize Props and Add Documentation

**Status:** done  
**Dependencies:** 13.4  

Ensure any additional `TextInput` props can be passed to the underlying component using the `...rest` spread operator. Add comprehensive JSDoc comments or PropTypes to document the component's API.

**Details:**

Modify the component's props to include `{ ...rest }`. Pass this `rest` object directly to the `TextInput` component. Add documentation for primary props like `value`, `onChangeText`, `placeholder`, and `error`.
