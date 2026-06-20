/**
 * Account Service
 * Handles user account management operations
 */

import auth from '@react-native-firebase/auth';
import { logger } from '../../utils/logger';
import firestore from '@react-native-firebase/firestore';

/**
 * Update user profile
 */
export const updateUserProfile = async (uid, updates) => {
  try {
    await firestore()
      .collection('users')
      .doc(uid)
      .update({
        ...updates,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    return { success: true };
  } catch (error) {
    logger.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Delete user account
 */
export const deleteUserAccount = async (uid) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser || currentUser.uid !== uid) {
      throw new Error('Unauthorized: Cannot delete account');
    }

    // Delete user document from Firestore
    await firestore()
      .collection('users')
      .doc(uid)
      .delete();

    // Delete Firebase Auth user
    await currentUser.delete();

    return { success: true };
  } catch (error) {
    logger.error('Error deleting user account:', error);
    throw error;
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (uid) => {
  try {
    const userDoc = await firestore()
      .collection('users')
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      throw new Error('User profile not found');
    }

    return userDoc.data();
  } catch (error) {
    logger.error('Error getting user profile:', error);
    throw error;
  }
};

/**
 * Update email address
 */
export const updateEmail = async (newEmail) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    await currentUser.updateEmail(newEmail);

    // Update in Firestore
    await firestore()
      .collection('users')
      .doc(currentUser.uid)
      .update({
        email: newEmail,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    return { success: true };
  } catch (error) {
    logger.error('Error updating email:', error);
    throw error;
  }
};

/**
 * Update password
 */
export const updatePassword = async (newPassword) => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    await currentUser.updatePassword(newPassword);

    return { success: true };
  } catch (error) {
    logger.error('Error updating password:', error);
    throw error;
  }
};

export default {
  updateUserProfile,
  deleteUserAccount,
  getUserProfile,
  updateEmail,
  updatePassword,
};
