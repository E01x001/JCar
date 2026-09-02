/**
 * 비밀번호 재설정 링크에서 토큰을 꺼낸다.
 *
 * 메일 링크는 이렇게 온다:
 *
 *   https://jcar-platform.vercel.app/reset?token_hash=<56자>&type=recovery
 *
 * **프래그먼트가 아니라 쿼리다.** supabase-js의 detectSessionInUrl은 프래그먼트의
 * access_token만 소비하므로, 이 링크로는 세션이 만들어지지 않는다. 그게 요점이다 —
 * 비밀번호를 잊은 사람에게 로그인된 세션을 주지 않는다.
 *
 * 모듈 로드 시점에 동기로 한 번 읽고, 주소창에서는 지운다. 재설정 토큰은
 * 자격증명이라 주소창·방문기록·공유 링크에 남을 이유가 없다.
 */
import { Platform } from 'react-native';

const readToken = () => {
  // 네이티브에는 URL이 없다. 링크는 웹으로 열린다(App Links는 별도 작업).
  if (Platform.OS !== 'web' || typeof window === 'undefined') { return null; }

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('type') !== 'recovery') { return null; }

    const tokenHash = params.get('token_hash');
    if (!tokenHash) { return null; }

    // 주소창에서 토큰을 지운다. 화면 전환이 아니라 기록 치환이라 뒤로가기로도
    // 되살아나지 않는다.
    if (window.history?.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    return tokenHash;
  } catch {
    // URL을 못 읽는다고 앱이 뜨지 않으면 안 된다.
    return null;
  }
};

const tokenOnLoad = readToken();

/** 이 적재가 재설정 링크로 시작됐다면 그 토큰, 아니면 null */
export const getResetToken = () => tokenOnLoad;
