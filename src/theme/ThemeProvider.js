/**
 * JCar Design System - Theme Provider
 *
 * React Context-based theme provider to make theme accessible
 * throughout the application component tree.
 */

import React, { createContext, useContext } from 'react';
import { theme as defaultTheme } from './index';

/**
 * Theme Context
 */
const ThemeContext = createContext(defaultTheme);

/**
 * ThemeProvider Component
 *
 * Wraps the application tree and provides theme access to all children.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} [props.theme] - Optional custom theme object (defaults to default theme)
 */
export const ThemeProvider = ({ children, theme = defaultTheme }) => {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * useTheme Hook
 *
 * Custom hook to access theme from any component.
 *
 * @returns {Object} The current theme object
 *
 * @example
 * const MyComponent = () => {
 *   const theme = useTheme();
 *   return <View style={{ backgroundColor: theme.colors.primary.main }} />;
 * };
 */
export const useTheme = () => {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
};

export default ThemeProvider;
