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
      .update(appToRow(updates)) // profiles에는 updated_at 컬럼이 없다
      .eq('id', uid);
    if (error) { throw error; }
    return { success: true };
  } catch (error) {
    logger.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * 회원탈퇴 — 30일 유예 소프트삭제.
 *
 * 데이터를 즉시 파기하지 않는다. 차량·상담·소유권 이전 기록은 회사가 보존해야 하는
 * 자산이라 남기고, 유예가 끝나면 개인 식별정보만 익명화된다
 * (pg_cron → purge-deleted-accounts → app_private.anonymize_account).
 *
 * 예전에는 즉시 hard delete하는 delete-account 경로가 따로 있었으나,
 * 보존 정책과 정면으로 충돌해 제거했다. 탈퇴 경로는 이 하나뿐이다.
 *
 * @returns {Promise<{ success: boolean, permanentDeleteDate?: string }>}
 */
export const deleteUserAccount = async (uid) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) { throw authError; }
    if (!authData?.user || authData.user.id !== uid) {
      throw new Error('Unauthorized: Cannot delete account');
    }

    const { data, error } = await supabase.functions.invoke('cascade-delete-user');
    if (error) { throw error; }
    if (!data?.success) {
      throw new Error(data?.message || '계정 삭제 처리에 실패했습니다.');
    }

    await supabase.auth.signOut();
    return { success: true, permanentDeleteDate: data.permanentDeleteDate };
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
      .update({ email: newEmail })
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
