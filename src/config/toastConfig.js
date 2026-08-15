/**
 * Toast Message Configuration
 *
 * Custom toast components using react-native-toast-message
 * with JCar design system theme integration.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { theme } from '../theme';

/**
 * Custom Toast Component
 *
 * @param {object} props - Toast properties
 * @param {string} props.text1 - Primary text (title)
 * @param {string} props.text2 - Secondary text (description)
 * @param {string} props.type - Toast type ('success', 'danger', 'info', 'warning')
 */
const CustomToast = ({ text1, text2, type }) => {
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: theme.colors.success.main,
          icon: 'check-circle',
        };
      case 'danger':
        return {
          backgroundColor: theme.colors.danger.main,
          icon: 'error',
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning.main,
          icon: 'warning',
        };
      case 'info':
      default:
        return {
          backgroundColor: theme.colors.info.main,
          icon: 'info',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <View
      style={[
        styles.toastContainer,
        {
          backgroundColor: config.backgroundColor,
          borderRadius: theme.borderRadius.medium,
          padding: theme.spacing.md,
        },
      ]}
    >
      <Icon name={config.icon} size={24} color={theme.colors.text.white} />
      <View style={styles.textContainer}>
        {text1 && (
          <Text
            style={[
              styles.text1,
              {
                fontSize: theme.typography.fontSize.body,
                fontWeight: theme.typography.fontWeight.semiBold,
                color: theme.colors.text.white,
              },
            ]}
          >
            {text1}
          </Text>
        )}
        {text2 && (
          <Text
            style={[
              styles.text2,
              {
                fontSize: theme.typography.fontSize.bodySmall,
                color: theme.colors.text.white,
                marginTop: theme.spacing.xs,
              },
            ]}
          >
            {text2}
          </Text>
        )}
      </View>
    </View>
  );
};

/**
 * Toast configuration object for react-native-toast-message
 */
export const toastConfig = {
  success: (props) => <CustomToast {...props} type="success" />,
  danger: (props) => <CustomToast {...props} type="danger" />,
  info: (props) => <CustomToast {...props} type="info" />,
  warning: (props) => <CustomToast {...props} type="warning" />,
};

const styles = StyleSheet.create({
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    width: '90%',
    maxWidth: 400,
    marginHorizontal: 16,
    elevation: 4,
    shadowColor: theme.colors.neutral?.black || '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  text1: {},
  text2: {},
});

export default toastConfig;
