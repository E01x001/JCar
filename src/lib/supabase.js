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
