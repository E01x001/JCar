/**
 * GlobalLoader Component
 *
 * A full-screen modal overlay with a loading spinner.
 * Used for global loading states across the app.
 */

import React from 'react';
import { View, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * GlobalLoader Component
 *
 * @param {object} props - Component props
 * @param {boolean} props.visible - Whether the loader is visible
 * @returns {JSX.Element}
 */
const GlobalLoader = ({ visible = false }) => {
  const theme = useTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GlobalLoader;
