/**
 * 구글 로그인 (네이티브 구현).
 *
 * 네이티브에서는 Google Play 서비스의 네이티브 SDK로 ID 토큰을 받아
 * Supabase에 교환한다(signInWithIdToken). 브라우저를 거치지 않아 흐름이 짧고
 * 계정 선택 UI가 OS 기본 시트로 뜬다.
 *
 * 웹에는 Play 서비스가 없어 이 경로가 통째로 실패하므로 googleAuth.web.js가
 * 리다이렉트 기반 OAuth로 대체한다(Metro가 플랫폼별로 자동 선택).
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

/**
 * 구글/Play 서비스 고유 에러 코드를 사용자 메시지로 옮긴다.
 * 해당 없는 코드면 null을 돌려 공통 매핑이 이어받게 한다.
 */
export const googleErrorMessage = (code) => {
  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'Google Play 서비스를 사용할 수 없습니다. 업데이트 후 다시 시도해주세요.';
  }
  if (code === statusCodes.IN_PROGRESS) {
    return '이미 로그인을 진행 중입니다.';
  }
  return null;
};
