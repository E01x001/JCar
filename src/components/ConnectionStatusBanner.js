/**
 * JCar Design System - ConnectionStatusBanner Component
 *
 * Task 59: Displays global connection status and offline mode indicators
 */

import React from 'react';
import { logger } from '../utils/logger';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeProvider';
import { useConnection } from '../context/ConnectionContext';
import NetInfo from '@react-native-community/netinfo';

/**
 * ConnectionStatusBanner Component
 *
 * Task 59: Shows connection status at the top of the screen
 * - Reconnecting state with retry count
 * - Offline mode with cached data indicator
 * - Manual refresh button
 */
const ConnectionStatusBanner = () => {
  const theme = useTheme();
  const {
    isConnected,
    isReconnecting,
    retryAttempt,
    isOfflineMode,
  } = useConnection();

  /**
   * Handle manual refresh
   * Task 59: Triggers NetInfo refresh to check connection
   */
  const handleRefresh = async () => {
    try {
      const state = await NetInfo.refresh();
      logger.debug('📡 Manual refresh - Connection:', state.isConnected);
    } catch (error) {
      logger.error('Manual refresh failed:', error);
    }
  };

  // Don't show banner if connected and online
  if (isConnected && !isReconnecting && !isOfflineMode) {
    return null;
  }

  // Reconnecting state
  if (isReconnecting) {
    return (
      <View
        style={[
          styles.banner,
          {
            backgroundColor: theme.colors.warning.main,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
          },
        ]}
      >
        <View style={styles.content}>
          <ActivityIndicator size="small" color={theme.colors.text.white} />
          <Text
            style={[
              styles.text,
              {
                fontSize: theme.typography.fontSize.bodySmall,
                color: theme.colors.text.white,
                marginLeft: theme.spacing.sm,
                flex: 1,
              },
            ]}
          >
            재연결 중... (시도 {retryAttempt}/5)
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={{
              padding: theme.spacing.xs,
            }}
          >
            <MaterialIcons
              name="refresh"
              size={20}
              color={theme.colors.text.white}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Offline mode
  if (isOfflineMode || !isConnected) {
    return (
      <View
        style={[
          styles.banner,
          {
            backgroundColor: theme.colors.text.secondary,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
          },
        ]}
      >
        <View style={styles.content}>
          <MaterialIcons
            name="cloud-off"
            size={20}
            color={theme.colors.text.white}
          />
          <Text
            style={[
              styles.text,
              {
                fontSize: theme.typography.fontSize.bodySmall,
                color: theme.colors.text.white,
                marginLeft: theme.spacing.sm,
                flex: 1,
              },
            ]}
          >
            오프라인 모드 (캐시된 데이터)
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={{
              padding: theme.spacing.xs,
            }}
          >
            <MaterialIcons
              name="refresh"
              size={20}
              color={theme.colors.text.white}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  banner: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {},
});

ConnectionStatusBanner.propTypes = {};

export default ConnectionStatusBanner;
