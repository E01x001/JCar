/**
 * Supabase 클라이언트 (Firebase → Supabase 이전, Phase 1)
 *
 * - 키는 publishable key(공개 가능)만 사용한다. service_role/secret 키는
 *   절대 앱 번들에 넣지 않는다(Edge Function 전용).
 * - 세션 영속화는 AsyncStorage. 네이티브에는 URL이 없어 detectSessionInUrl=false이지만,
 *   웹은 OAuth 리다이렉트가 URL 프래그먼트로 세션을 돌려주므로 true여야 한다.
 * - 스키마/RLS: supabase/migrations/20260708161043_initial_schema.sql 참고.
 *   DB는 snake_case — 앱 경계 매핑은 services 레이어에서 담당한다.
 */
import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://thorgkxpbhsttgskhepu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_tcC3WnbxkcI8bveaPvhYQg_U8UZmDzt';

/**
 * 비밀번호 재설정 링크로 들어온 적재인가 — **createClient보다 먼저 읽는다.**
 *
 * 왜 이게 필요한가: supabase-js는 `_initialize()` 안에서 URL을 소비하며
 * PASSWORD_RECOVERY를 쏘고, 그 직후 history.replaceState로 프래그먼트를 지운다.
 * 그 시점은 React가 마운트되기 전일 수 있어서, AuthContext의 onAuthStateChange가
 * 구독을 붙였을 땐 이벤트가 이미 지나가 있을 수 있다. 이벤트 하나에만 기대면
 * 재설정 게이트가 **조용히** 열리지 않는다.
 *
 * 그래서 모듈 로드 시점(동기)에 URL을 한 번 직접 본다. 이벤트와 이 값 둘 중
 * 하나만 잡혀도 게이트가 선다.
 */
const recoveryLinkOnLoad = Platform.OS === 'web'
  && typeof window !== 'undefined'
  && /(^|[#&?])type=recovery(&|$)/.test(`${window.location.hash}${window.location.search}`);

/** 이 페이지 적재가 재설정 링크로 시작됐는지 (웹 전용, 네이티브는 항상 false) */
export const hadRecoveryLinkOnLoad = () => recoveryLinkOnLoad;

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// 앱이 포그라운드일 때만 토큰 자동 갱신 (Supabase RN 권장 패턴)
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
