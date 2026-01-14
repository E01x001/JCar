/**
 * Session Service
 * Handles user session management and token operations
 */

import auth from '@react-native-firebase/auth';

/**
 * Get current user session
 */
export const getCurrentSession = async () => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return null;
    }

    return {
      uid: currentUser.uid,
      email: currentUser.email,
      phoneNumber: currentUser.phoneNumber,
      emailVerified: currentUser.emailVerified,
    };
  } catch (error) {
    console.error('Error getting current session:', error);
    throw error;
  }
};

/**
 * Refresh user token
 */
export const refreshToken = async () => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const token = await currentUser.getIdToken(true);
    return token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

/**
 * Check if session is valid
 */
export const isSessionValid = () => {
  try {
    const currentUser = auth().currentUser;
    return currentUser !== null;
  } catch (error) {
    console.error('Error checking session validity:', error);
    return false;
  }
};

/**
 * Get user token
 */
export const getUserToken = async () => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const token = await currentUser.getIdToken();
    return token;
  } catch (error) {
    console.error('Error getting user token:', error);
    throw error;
  }
};

export default {
  getCurrentSession,
  refreshToken,
  isSessionValid,
  getUserToken,
};
