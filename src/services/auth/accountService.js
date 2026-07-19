/**
 * Account Service (Phase 2 — Firestore users → Supabase profiles)
 * Handles user account management operations
 */

import { supabase } from '../../lib/supabase';
import { rowToApp, appToRow } from '../../lib/mappers';
import { logger } from '../../utils/logger';

/**
 * Update user profile
 */
export const updateUserProfile = async (uid, updates) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(appToRow({ ...updates, updatedAt: new Date().toISOString() }))
      .eq('id', uid);
    if (error) { throw error; }
    return { success: true };
  } catch (error) {
    logger.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Delete user account (Edge Function이 auth + 데이터 cascade 삭제)
 */
export const deleteUserAccount = async (uid) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) { throw authError; }
    if (!authData?.user || authData.user.id !== uid) {
      throw new Error('Unauthorized: Cannot delete account');
    }

    const { error } = await supabase.functions.invoke('delete-account');
    if (error) { throw error; }

    await supabase.auth.signOut();
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) { throw error; }
    if (!data) {
      throw new Error('User profile not found');
    }
    return rowToApp(data);
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
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) { throw authError; }
    if (!authData?.user) {
      throw new Error('No user logged in');
    }

    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) { throw error; }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email: newEmail, updated_at: new Date().toISOString() })
      .eq('id', authData.user.id);
    if (profileError) { throw profileError; }

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
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { throw error; }
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
