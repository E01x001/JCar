/**
 * Connection Context
 *
 * Task 59: Provides global connection state for Firestore listeners
 * Tracks connection status, retry attempts, and offline mode
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';
import PropTypes from 'prop-types';
import NetInfo from '@react-native-community/netinfo';

/**
 * Connection state shape:
 * {
 *   isConnected: boolean,
 *   isReconnecting: boolean,
 *   retryAttempt: number,
 *   isOfflineMode: boolean,
 *   networkType: string,
 *   lastError: Error | null
 * }
 */
const ConnectionContext = createContext({
  isConnected: true,
  isReconnecting: false,
  retryAttempt: 0,
  isOfflineMode: false,
  networkType: 'unknown',
  lastError: null,
  setReconnecting: () => {},
  setRetryAttempt: () => {},
  setOfflineMode: () => {},
  setLastError: () => {},
  resetConnection: () => {},
});

/**
 * Connection Provider Component
 *
 * Task 59: Monitors network state and provides connection context to the app
 */
export const ConnectionProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [networkType, setNetworkType] = useState('unknown');
  const [lastError, setLastError] = useState(null);

  /**
   * Reset connection state to initial values
   * Task 59: Used when connection is successfully restored
   */
  const resetConnection = useCallback(() => {
    setIsReconnecting(false);
    setRetryAttempt(0);
    setIsOfflineMode(false);
    setLastError(null);
  }, []);

  /**
   * Task 59: Monitor network state changes using NetInfo
   */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable !== false;

      setIsConnected(connected);
      setNetworkType(state.type);

      // If connection restored, reset reconnection state
      if (connected && (isReconnecting || isOfflineMode)) {
        logger.debug('📡 Connection restored');
        resetConnection();
      }

      // If connection lost, enter offline mode
      if (!connected && !isOfflineMode) {
        logger.debug('📡 Connection lost - entering offline mode');
        setIsOfflineMode(true);
      }
    });

    // Fetch initial network state
    NetInfo.fetch().then(state => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      setIsConnected(connected);
      setNetworkType(state.type);

      if (!connected) {
        setIsOfflineMode(true);
      }
    });

    return () => unsubscribe();
  }, [isReconnecting, isOfflineMode, resetConnection]);

  const value = {
    isConnected,
    isReconnecting,
    retryAttempt,
    isOfflineMode,
    networkType,
    lastError,
    setReconnecting: setIsReconnecting,
    setRetryAttempt,
    setOfflineMode: setIsOfflineMode,
    setLastError,
    resetConnection,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};

ConnectionProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Hook to use connection context
 *
 * Task 59: Provides easy access to connection state throughout the app
 */
export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};

export default ConnectionContext;
