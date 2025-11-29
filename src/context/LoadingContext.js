/**
 * LoadingContext
 *
 * Global loading state management for the app.
 * Provides methods to show/hide the GlobalLoader component.
 */

import React, { createContext, useContext, useState } from 'react';
import GlobalLoader from '../components/GlobalLoader';

const LoadingContext = createContext();

/**
 * LoadingProvider Component
 *
 * Wraps the app and provides global loading state.
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element}
 */
export const LoadingProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);

  /**
   * Show the global loader
   */
  const showLoading = () => {
    setLoading(true);
  };

  /**
   * Hide the global loader
   */
  const hideLoading = () => {
    setLoading(false);
  };

  return (
    <LoadingContext.Provider value={{ loading, showLoading, hideLoading }}>
      {children}
      <GlobalLoader visible={loading} />
    </LoadingContext.Provider>
  );
};

/**
 * useLoading Hook
 *
 * Access the loading context from any component.
 *
 * @returns {object} Loading state and methods
 */
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export default LoadingContext;
