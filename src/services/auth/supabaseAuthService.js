/**
 * Supabase Auth Service (Phase 2a — Firebase Auth 대체)
 *
 * - 가입: supabase.auth.signUp + user_metadata(name/phone_number)
 *   → DB 트리거(app_private.handle_new_user)가 profiles 행을 자동 생성.
 *   전화번호 중복은 profiles.phone_number UNIQUE 제약이 가입 트랜잭션째 거부.
 * - 이메일 인증: Supabase 기본 확인 메일 발송(기존 UI-only였던 2단계가 실제 동작).
 * - 에러 메시지는 여기서 한글로 매핑해 화면은 문자열만 노출한다.
 */
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
// 구글 로그인은 네이티브/웹 구현이 완전히 달라 플랫폼별 모듈로 분리했다
import { signInWithGoogle, signOutGoogle, googleErrorMessage } from './googleAuth';
import { logger } from '../../utils/logger';

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
  const googleMsg = googleErrorMessage(code);
  if (googleMsg) { return googleMsg; }
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
export { signInWithGoogle, signOutGoogle };

/** 가입 확인 메일 재전송 */
export const resendConfirmationEmail = async (email) => {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) {
    logger.error('resend 오류:', error);
    throw error;
  }
};

/**
 * 재설정 링크가 돌아올 주소.
 *
 * **항상 웹 주소를 쓴다.** 앱에서 요청하고 메일은 PC에서 여는 일이 흔한데,
 * `jcar://`로 보내면 그 경우가 통째로 깨진다. 웹은 어디서 열어도 열린다.
 * 안드로이드 App Links로 앱에 되돌리려면 assetlinks.json과 네이티브 설정이
 * 필요하므로, 그건 별도 작업이다(그때까지 앱 사용자는 브라우저에서 바꾼 뒤
 * 새 비밀번호로 로그인한다).
 *
 * 웹에서는 실행 중인 오리진을 쓴다 — 로컬 개발에서도 동작해야 하고,
 * Supabase 허용목록에 localhost가 이미 들어 있다.
 */
const PRODUCTION_WEB_URL = 'https://jcar-platform.vercel.app';

const recoveryRedirectTo = () => (
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : PRODUCTION_WEB_URL
);

/**
 * 비밀번호 찾기.
 *
 * Edge Function(`forgot-password`)에 맡긴다. 직접 `resetPasswordForEmail`을
 * 부르지 않는 이유는 **계정 종류에 따라 보낼 메일이 다르기 때문**이다:
 * 구글로만 가입한 사람에게 재설정 링크를 보내면 구글 계정에 더 약한 비밀번호가
 * 하나 붙는다. 그런 계정에는 "구글로 로그인하세요" 안내만 나간다.
 *
 * 그 판단은 **서버 안에서만** 이뤄진다. 여기로 돌아오는 응답은 계정이 없든,
 * 비밀번호가 있든, 구글 전용이든 전부 같다 — 다르면 로그인하지 않은 사람이
 * 임의의 이메일로 계정 존재 여부를 알아낼 수 있다(계정 열거).
 *
 * 그래서 호출부는 성공/실패만 알 뿐 무엇이 발송됐는지 알 수 없고, 알 필요도 없다.
 */
export const sendPasswordReset = async (email) => {
  const { error } = await supabase.functions.invoke('forgot-password', {
    body: { email, redirectTo: recoveryRedirectTo() },
  });
  if (error) {
    logger.error('forgot-password 호출 오류:', error);
    throw error;
  }
};

/**
 * 비밀번호 변경.
 *
 * 두 곳에서 쓴다. 보안 성질이 다르므로 인자로 가른다:
 *
 *   재설정(복구 세션)  currentPassword 없음.
 *       메일 링크로 이메일 통제권을 이미 증명했다. 옛 비밀번호는 모르는 게 정상.
 *
 *   변경(로그인 상태)  currentPassword 필수.
 *       세션이 열린 기기를 주운 사람이 비밀번호를 바꿔 계정을 가져가는 것을 막는다.
 *       Supabase는 updateUser에 옛 비밀번호를 요구하지 않으므로, 같은 자격으로
 *       한 번 더 로그인해 직접 확인한다.
 *
 * 성공하면 **다른 기기의 세션을 전부 끊는다.** 비밀번호를 바꾸는 이유 자체가
 * 계정을 남이 쥐고 있어서인 경우가 많은데, 그 세션이 살아 있으면 바꾼 의미가 없다.
 * 현재 기기는 유지한다(방금 본인임을 증명했다).
 */
export const updateMyPassword = async (newPassword, { currentPassword, email } = {}) => {
  if (currentPassword) {
    if (!email) { throw new Error('현재 비밀번호를 확인할 수 없습니다.'); }
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    // 실패해도 기존 세션은 그대로다 — 로그인 시도 실패가 세션을 지우지는 않는다
    if (reauthError) { throw reauthError; }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    logger.error('updateUser(password) 오류:', error);
    throw error;
  }

  // 다른 세션 정리는 실패해도 비밀번호 변경 자체를 무르지 않는다.
  // 다만 조용히 넘기지는 않는다 — "다 끊었다"고 안내하면 안 되기 때문이다.
  try {
    await supabase.auth.signOut({ scope: 'others' });
    return { success: true, othersRevoked: true };
  } catch (revokeError) {
    logger.error('다른 세션 종료 실패:', revokeError);
    return { success: true, othersRevoked: false };
  }
};

/**
 * 내 계정에 비밀번호가 설정돼 있는가.
 *
 * 클라이언트만으로는 알 수 없다. 구글로 가입한 사람이 재설정으로 비밀번호를
 * 만들어도 `identities`는 `["google"]` 그대로이고 `app_metadata.providers`도
 * 그대로다(2026-08-31 실계정 확인). 그래서 서버에 직접 묻는다 —
 * `has_password()`는 불리언 하나만 돌려주는 SECURITY DEFINER 함수다.
 *
 * 실패하면 `true`로 본다. 있는 항목을 잠깐 보여주는 쪽이, 비밀번호가 있는
 * 사람에게서 바꿀 수단을 빼앗는 쪽보다 낫다.
 */
export const hasPassword = async () => {
  const { data, error } = await supabase.rpc('has_password');
  if (error) {
    logger.error('has_password 조회 실패:', error);
    return true;
  }
  return data !== false;
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
  updateMyPassword,
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
