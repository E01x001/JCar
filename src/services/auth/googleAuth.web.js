/**
 * 구글 로그인 (웹 구현).
 *
 * 웹에는 Google Play 서비스가 없어 네이티브 SDK 경로가 hasPlayServices에서
 * 곧바로 실패한다. 대신 Supabase의 리다이렉트 기반 OAuth를 쓴다.
 *
 * 흐름: signInWithOAuth → 구글 동의 화면으로 페이지 이동 → 현재 origin으로
 * 복귀하며 URL 프래그먼트에 토큰이 실려 온다. 이를 세션으로 회수하는 건
 * 클라이언트의 detectSessionInUrl(웹에서만 true, src/lib/supabase.js)이 담당하므로
 * 여기서 별도 처리를 하지 않는다.
 *
 * 복귀 URL은 Supabase Auth의 redirect allow list에 등록돼 있어야 한다.
 * 등록돼 있지 않으면 Supabase가 조용히 Site URL로 대신 보내버린다.
 */
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

export const signInWithGoogle = async () => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) { throw error; }

    // 여기 도달했다면 페이지가 곧 구글로 넘어간다. 호출부가 로딩 상태를
    // 풀어버리지 않도록 취소가 아님을 알린다.
    return { cancelled: false };
  } catch (error) {
    logger.error('구글 로그인 오류:', error);
    throw error;
  }
};

/**
 * 웹에는 정리할 네이티브 구글 세션이 없다. 구글 계정 자체의 로그아웃은
 * 브라우저 세션에 속하며 앱이 건드릴 대상이 아니다.
 */
export const signOutGoogle = async () => {};

/** 웹에는 Play 서비스 고유 에러가 없다 — 공통 매핑에 맡긴다 */
export const googleErrorMessage = () => null;
