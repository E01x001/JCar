/**
 * Session Service (Phase 2a — Firebase Auth → Supabase Auth)
 * Handles user session management and token operations
 */

import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

/**
 * Get current user session
 */
export const getCurrentSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) { throw error; }
    const user = data?.session?.user;
    if (!user) {
      return null;
    }
    return {
      uid: user.id,
      email: user.email ?? null,
      phoneNumber: user.phone ?? null,
      emailVerified: !!user.email_confirmed_at,
    };
  } catch (error) {
    logger.error('Error getting current session:', error);
    throw error;
  }
};

/**
 * Refresh user token
 */
export const refreshToken = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) { throw error; }
    if (!data?.session) {
      throw new Error('No user logged in');
    }
    return data.session.access_token;
  } catch (error) {
    logger.error('Error refreshing token:', error);
    throw error;
  }
};

/**
 * Check if session is valid
 */
export const isSessionValid = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) { throw error; }
    return !!data?.session;
  } catch (error) {
    logger.error('Error checking session validity:', error);
    return false;
  }
};

/**
 * Get user token
 */
export const getUserToken = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) { throw error; }
    if (!data?.session) {
      throw new Error('No user logged in');
    }
    return data.session.access_token;
  } catch (error) {
    logger.error('Error getting user token:', error);
    throw error;
  }
};

export default {
  getCurrentSession,
  refreshToken,
  isSessionValid,
  getUserToken,
};
