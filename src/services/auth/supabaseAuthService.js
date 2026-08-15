/**
 * Supabase Auth Service (Phase 2a — Firebase Auth 대체)
 *
 * - 가입: supabase.auth.signUp + user_metadata(name/phone_number)
 *   → DB 트리거(app_private.handle_new_user)가 profiles 행을 자동 생성.
 *   전화번호 중복은 profiles.phone_number UNIQUE 제약이 가입 트랜잭션째 거부.
 * - 이메일 인증: Supabase 기본 확인 메일 발송(기존 UI-only였던 2단계가 실제 동작).
 * - 에러 메시지는 여기서 한글로 매핑해 화면은 문자열만 노출한다.
 */
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

// 웹 클라이언트 ID — 네이티브 SDK가 받아오는 ID 토큰의 발급 대상(aud)이며
// Supabase Google provider에 등록된 값과 일치해야 한다.
// 비밀이 아니다(android/app/google-services.json에도 들어 있다).
const GOOGLE_WEB_CLIENT_ID =
  '135120379076-e5bqh6jab60hrriviusduk66m8iq76u5.apps.googleusercontent.com';

let googleConfigured = false;
const ensureGoogleConfigured = () => {
  if (googleConfigured) { return; }
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  googleConfigured = true;
};

/** Supabase Auth 에러 → 사용자용 한글 메시지 */
export const mapAuthError = (error) => {
  const code = error?.code || '';
  const msg = error?.message || '';
  if (code === 'invalid_credentials' || /Invalid login credentials/i.test(msg)) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (code === 'email_not_confirmed' || /Email not confirmed/i.test(msg)) {
    return '이메일 인증이 완료되지 않았습니다. 받은 메일의 링크를 눌러주세요.';
  }
  if (code === 'user_already_exists' || /already registered/i.test(msg)) {
    return '이미 가입된 이메일입니다.';
  }
  if (code === 'over_email_send_rate_limit' || /rate limit/i.test(msg)) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  if (code === 'weak_password') {
    return '비밀번호가 너무 약합니다. 8자 이상, 소문자와 숫자를 포함해주세요.';
  }
  if (/duplicate key|unique constraint|profiles_phone_number/i.test(msg)) {
    // profiles.phone_number UNIQUE 위반 → 가입 자체가 롤백됨
    return '이미 등록된 전화번호입니다.';
  }
  if (/network|fetch/i.test(msg)) {
    return '네트워크 연결을 확인해주세요.';
  }
  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'Google Play 서비스를 사용할 수 없습니다. 업데이트 후 다시 시도해주세요.';
  }
  if (code === statusCodes.IN_PROGRESS) {
    return '이미 로그인을 진행 중입니다.';
  }
  return '요청 처리 중 오류가 발생했습니다. 다시 시도해주세요.';
};

/** 로그인 */
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    logger.error('signIn 오류:', error);
    throw error;
  }
  return data;
};

/** 가입 — 프로필은 DB 트리거가 생성 */
export const signUp = async ({ email, password, name, phoneNumber }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone_number: phoneNumber },
    },
  });
  if (error) {
    logger.error('signUp 오류:', error);
    throw error;
  }
  return data;
};

/**
 * 구글 로그인 (네이티브 SDK → ID 토큰 → Supabase).
 * 웹 리디렉트 대신 네이티브 계정 선택창을 쓰므로 브라우저 이동이 없다.
 *
 * 주의: 구글은 전화번호를 제공하지 않는다. 최초 로그인 사용자는
 * profiles.profile_completed=false 상태로 남아 ProfileCompletionScreen으로 유도된다.
 *
 * @returns {Promise<{cancelled: boolean}>} 사용자가 창을 닫으면 cancelled=true
 */
export const signInWithGoogle = async () => {
  ensureGoogleConfigured();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();

    // v13+는 { type, data } 형태, 구버전은 결과를 그대로 반환한다
    if (result?.type === 'cancelled') { return { cancelled: true }; }
    const idToken = result?.data?.idToken ?? result?.idToken;
    if (!idToken) {
      throw new Error('구글 인증 토큰을 받지 못했습니다');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) { throw error; }

    return { cancelled: false };
  } catch (error) {
    if (error?.code === statusCodes.SIGN_IN_CANCELLED) { return { cancelled: true }; }
    logger.error('구글 로그인 오류:', error);
    throw error;
  }
};

/** 구글 세션 정리 — 로그아웃 시 다음 로그인에서 계정 선택창이 다시 뜨도록 */
export const signOutGoogle = async () => {
  try {
    ensureGoogleConfigured();
    await GoogleSignin.signOut();
  } catch (error) {
    // 구글로 로그인한 적 없으면 실패하는 게 정상 — 로그아웃 흐름을 막지 않는다
    logger.debug('구글 세션 정리 건너뜀:', error?.message);
  }
};

/** 가입 확인 메일 재전송 */
export const resendConfirmationEmail = async (email) => {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) {
    logger.error('resend 오류:', error);
    throw error;
  }
};

/** 비밀번호 재설정 메일 */
export const sendPasswordReset = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    logger.error('resetPasswordForEmail 오류:', error);
    throw error;
  }
};

/** 로그아웃 */
export const signOutUser = async () => {
  await signOutGoogle(); // 구글 계정 선택창이 다음 로그인에서 다시 뜨도록
  const { error } = await supabase.auth.signOut();
  if (error) {
    logger.error('signOut 오류:', error);
    throw error;
  }
};

/** 내 프로필 조회 (profiles — RLS로 본인 행만) */
export const getMyProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, phone_number, role, status, account_status, fcm_token, profile_completed')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    logger.error('getMyProfile 오류:', error);
    throw error;
  }
  return data; // 없으면 null (가입 직후 트리거 지연 등)
};

/**
 * 필수 프로필 정보(이름·휴대폰) 설정.
 * 구글 로그인은 전화번호를 주지 않고 이메일 가입도 metadata가 비어 오는 경로가 있어,
 * 완성 여부를 DB(profile_completed)가 강제한다 — 미완성이면 차량 등록·상담 신청이 막힌다.
 * 형식 검증과 중복 검사는 서버(complete_profile RPC)가 수행한다.
 */
export const completeProfile = async (name, phoneNumber) => {
  const { error } = await supabase.rpc('complete_profile', {
    p_name: name,
    p_phone: phoneNumber,
  });
  if (error) {
    logger.error('completeProfile 오류:', error);
    throw error;
  }
};

/** FCM 토큰 저장 (profiles.fcm_token — 컬럼 그랜트로 본인만 수정 가능) */
export const saveMyFcmToken = async (userId, token) => {
  const { error } = await supabase
    .from('profiles')
    .update({ fcm_token: token })
    .eq('id', userId);
  if (error) {
    logger.error('fcm_token 저장 오류:', error);
    throw error;
  }
};

export default {
  mapAuthError,
  completeProfile,
  signIn,
  signInWithGoogle,
  signOutGoogle,
  signUp,
  resendConfirmationEmail,
  sendPasswordReset,
  signOutUser,
  getMyProfile,
  saveMyFcmToken,
};
