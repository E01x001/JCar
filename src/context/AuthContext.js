// src/context/AuthContext.js
// Phase 2a: Firebase Auth → Supabase Auth 전환.
// 컨텍스트 shape은 기존과 동일하게 유지한다:
//   { user, role, sellerName, sellerPhone, sellerEmail, loading }
// user에는 기존 화면 호환을 위해 uid 별칭(= Supabase user.id)을 넣는다.
import React, { createContext, useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, hadRecoveryLinkOnLoad } from '../lib/supabase';
import { getMyProfile, signOutUser, saveMyFcmToken } from '../services/auth/supabaseAuthService';
import { saveFcmToken } from '../services/notification/fcmService';
import { recordInstallSignal } from '../services/notification/installSignalService';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { getMessaging, onTokenRefresh } from '../services/notification/firebaseNative';

export const AuthContext = createContext(null);

/**
 * 복구 세션 표시 — 세션과 같은 수명을 갖는다.
 *
 * URL 프래그먼트는 supabase-js가 한 번 읽고 지우고, PASSWORD_RECOVERY도 그때
 * 한 번만 온다. 반면 세션은 저장소에 남는다. 그 비대칭을 메우지 않으면
 * **새로고침 한 번으로 재설정 게이트가 열린다** — 메일함을 본 사람이 비밀번호를
 * 모른 채 앱을 쓰게 된다.
 */
const RECOVERY_PENDING_KEY = '@jcar/auth-recovery-pending';

/**
 * 게이트 표시의 수명.
 *
 * 표시에 만료가 없으면 **재설정을 포기한 사람이 그 기기에 영구히 갇힌다.**
 * 링크를 눌러 재설정 화면까지 갔다가 비밀번호를 정하지 않고 창을 닫으면,
 * 세션과 표시가 함께 남아 이후 모든 방문이 재설정 화면으로 간다. 로그아웃
 * 버튼이 그 화면 안에 있으니 빠져나올 길이 아주 없진 않지만, 그걸 알아채기를
 * 기대할 수는 없다(2026-09-01 실제로 이 상태에 빠졌다).
 *
 * 복구 링크 자체가 1시간이면 만료되므로 표시도 그 이상 살아 있을 이유가 없다.
 */
const RECOVERY_PENDING_TTL_MS = 60 * 60 * 1000;

const markRecoveryPending = () => (
  AsyncStorage.setItem(RECOVERY_PENDING_KEY, String(Date.now()))
);
const clearRecoveryPending = () => AsyncStorage.removeItem(RECOVERY_PENDING_KEY);

/**
 * 복구 표시의 상태. 'none' | 'valid' | 'expired'
 *
 * 'expired'를 따로 두는 이유는 처리가 다르기 때문이다. 표시만 지우고 넘어가면
 * **복구 링크가 만든 세션이 그대로 살아남아** 애초에 막으려던 상황이 된다 —
 * 메일함을 본 사람이 비밀번호를 모른 채 로그인 상태가 되는 것. 그래서 만료된
 * 경우에는 세션도 함께 끊는다.
 *
 * 예전 형식('1')은 만료로 본다. 만료 없이 저장된 값이라 언제 찍힌 것인지 알 수
 * 없고, 그 표시를 남긴 사람은 이미 갇혀 있다.
 */
const readRecoveryPending = async () => {
  const raw = await AsyncStorage.getItem(RECOVERY_PENDING_KEY);
  if (!raw) { return 'none'; }

  const markedAt = Number(raw);
  if (Number.isFinite(markedAt) && Date.now() - markedAt < RECOVERY_PENDING_TTL_MS) {
    return 'valid';
  }
  return 'expired';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [sellerName, setSellerName] = useState(null);
  const [sellerPhone, setSellerPhone] = useState(null);
  const [sellerEmail, setSellerEmail] = useState(null);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // 비밀번호 재설정 링크로 들어온 세션인가.
  //
  // Supabase의 복구 링크는 **정식 세션을 만든다.** 그대로 두면 재설정 링크가
  // 사실상 로그인 링크가 되어, 메일함을 본 사람이 비밀번호를 모른 채 앱을 쓴다.
  // 이 값이 true인 동안 AppNavigator는 재설정 화면 말고는 아무것도 렌더하지 않는다.
  //
  // 초기값을 URL에서 읽는 이유는 lib/supabase.js의 주석에 있다 — 이벤트가
  // 구독보다 먼저 지나갈 수 있어서, 둘 중 하나만 잡혀도 게이트가 서야 한다.
  //
  // 그런데 URL과 이벤트만으로는 **새로고침 한 번에 게이트가 열린다.** 복구
  // 링크가 만든 세션은 저장소에 남는데, 다시 적재하면 프래그먼트는 이미 지워져
  // 있고 이벤트도 다시 오지 않기 때문이다(복원은 SIGNED_IN이다). 그래서 표시를
  // **세션과 같은 수명으로** 저장한다 — 비밀번호를 실제로 바꾸거나 로그아웃할
  // 때만 지운다. 아래 bootstrap이 그 표시를 loading이 내려가기 전에 읽는다.
  const [recoveryMode, setRecoveryMode] = useState(hadRecoveryLinkOnLoad);

  useEffect(() => {
    // 세션 변화 처리 공통 로직
    const applySession = async (session) => {
      const authUser = session?.user;
      if (!authUser) {
        setUser(null);
        setRole(null);
        setProfileCompleted(false);
        setLoading(false);
        return;
      }

      try {
        const profile = await getMyProfile(authUser.id);

        // 계정 정지/승인대기/삭제대기 체크 — 30일 유예 중 계정도 로그인 차단(리뷰 반영)
        //
        // 승인 대기(pending)는 가입 승인제 때문에 생긴 상태다. 정지와 달리 "잘못한 것"이
        // 아니므로 문구를 나눈다. 실제 권한 차단은 DB의 is_active_user()가 하고,
        // 여기서는 안내와 함께 세션을 정리한다.
        const isBlocked = profile?.status === 'suspended'
          || profile?.status === 'pending'
          || profile?.account_status === 'pending_deletion';

        if (isBlocked) {
          const isPendingDeletion = profile?.account_status === 'pending_deletion';
          const isAwaitingApproval = profile?.status === 'pending';
          await signOutUser();
          Toast.show({
            type: isAwaitingApproval ? 'info' : 'error',
            text1: isPendingDeletion
              ? '삭제 대기 중인 계정'
              : isAwaitingApproval ? '가입 승인 대기 중' : '계정 정지',
            text2: isPendingDeletion
              ? '탈퇴 처리된 계정입니다. 복구를 원하시면 고객센터로 문의해주세요.'
              : isAwaitingApproval
                ? '관리자 승인 후 이용할 수 있습니다. 승인되면 다시 로그인해주세요.'
                : '귀하의 계정이 정지되었습니다. 관리자에게 문의하세요.',
            position: 'top',
            visibilityTime: 5000,
          });
          setUser(null);
          setRole(null);
          setLoading(false);
          return;
        }

        // 기존 화면 호환: user.uid 별칭 유지
        setUser({ ...authUser, uid: authUser.id });
        setRole(profile?.role || 'user');
        setSellerName(profile?.name || authUser.user_metadata?.name || 'Unknown');
        setSellerPhone(profile?.phone_number || 'Unknown');
        setSellerEmail(profile?.email || authUser.email || 'Unknown');
        setProfileCompleted(!!profile?.profile_completed);

        // FCM 토큰 저장 (실패해도 로그인 흐름은 막지 않음)
        saveFcmToken(authUser.id).catch(() => {});

        // 설치 출처 기록(기록 전용, 아무것도 차단하지 않음).
        // 사용자·앱버전당 1회만 쌓이며 실패는 내부에서 삼킨다.
        recordInstallSignal(authUser.id);
      } catch (error) {
        logger.error('AuthContext: 프로필 로드 오류:', error);
        reportCrashlyticsError(error);
        logCrashlyticsMessage('AuthContext: Failed to load profile');
        // 프로필 조회 실패(네트워크 등)로 인증 사용자를 로그인 화면으로
        // 되돌리지 않는다 — 최소 권한(user)으로 진입시킨다. (배포점검 C7)
        setUser({ ...authUser, uid: authUser.id });
        setRole('user');
      }
      setLoading(false);
    };

    // 초기 세션 복원 + 변경 구독.
    //
    // 복구 표시를 **먼저** 읽는다. applySession이 loading을 내리는 순간
    // AppNavigator가 게이트를 판단하므로, 그때 이미 값이 서 있어야 한다.
    let cancelled = false;
    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      try {
        if (!session) {
          // 세션이 없으면 재설정할 대상도 없다. 링크가 만료돼 세션이 만들어지지
          // 않은 경우가 여기로 온다 — 표시를 남기면 그다음 **정상 로그인한**
          // 사람을 재설정 화면에 가둔다.
          await clearRecoveryPending();
          if (!cancelled) { setRecoveryMode(false); }
        } else if (hadRecoveryLinkOnLoad()) {
          // 이번 적재가 링크로 시작됐고 세션도 생겼다 — 새로고침을 견디도록 남긴다
          await markRecoveryPending();
          if (!cancelled) { setRecoveryMode(true); }
        } else {
          const pending = await readRecoveryPending();
          if (pending === 'valid') {
            // 링크로 시작된 세션이 새로고침을 넘어 살아남은 경우
            if (!cancelled) { setRecoveryMode(true); }
          } else if (pending === 'expired') {
            // 재설정을 끝내지 않고 떠난 세션이다. 표시만 지우면 그 세션으로
            // 그냥 로그인된다 — 그래서 세션도 끊고 로그인 화면으로 보낸다.
            logger.warn('AuthContext: 만료된 복구 세션 — 로그아웃한다');
            await clearRecoveryPending();
            await supabase.auth.signOut();
            if (!cancelled) {
              setRecoveryMode(false);
              // SIGNED_OUT 이벤트가 오겠지만 그걸 기다리지 않는다 —
              // 안 오면 loading이 내려가지 않아 흰 화면이 남는다.
              await applySession(null);
            }
            return;
          }
        }
      } catch (error) {
        // 저장소를 못 읽었다고 로그인 자체를 막지는 않는다. 다만 이 경우
        // 게이트가 새로고침을 못 견딘다는 것을 로그로 남긴다.
        logger.error('AuthContext: 복구 표시 확인 실패:', error);
      }

      if (!cancelled) { await applySession(session); }
    };
    bootstrap();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      // 웹은 detectSessionInUrl이 URL 조각을 소비하면서 이 이벤트를 낸다.
      // 로그아웃되면 복구 상태도 함께 내려간다 — 세션이 없으면 재설정할 대상도 없다.
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
        markRecoveryPending().catch(() => {});
      } else if (event === 'SIGNED_OUT') {
        setRecoveryMode(false);
        clearRecoveryPending().catch(() => {});
      }

      // onAuthStateChange 콜백 안에서 다른 supabase 호출 시 데드락 방지를 위해
      // 비동기 작업은 마이크로태스크로 분리 (Supabase 문서 권장)
      setTimeout(() => applySession(session), 0);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // 프로필 완성 등으로 변경된 프로필을 다시 읽어 컨텍스트에 반영
  const refreshProfile = async () => {
    if (!user?.uid) { return; }
    try {
      const profile = await getMyProfile(user.uid);
      setRole(profile?.role || 'user');
      setSellerName(profile?.name || 'Unknown');
      setSellerPhone(profile?.phone_number || 'Unknown');
      setProfileCompleted(!!profile?.profile_completed);
    } catch (error) {
      logger.error('AuthContext: 프로필 갱신 실패:', error);
    }
  };

  // FCM 토큰 갱신 리스너 (FCM 발급은 Firebase 유지 — 하이브리드)
  useEffect(() => {
    const messagingInstance = getMessaging();
    const unsubscribeTokenRefresh = onTokenRefresh(messagingInstance, async (newToken) => {
      logger.debug('🔄 FCM 토큰 갱신됨:', newToken);
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        try {
          await saveMyFcmToken(data.user.id, newToken);
          logger.debug('✅ 갱신된 FCM 토큰 저장 완료');
        } catch (error) {
          logger.error('❌ 갱신된 FCM 토큰 저장 실패:', error);
          reportCrashlyticsError(error);
          logCrashlyticsMessage('onTokenRefresh: Failed to save new token');
        }
      }
    });

    return () => unsubscribeTokenRefresh();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user, role, sellerName, sellerPhone, sellerEmail, profileCompleted,
        refreshProfile, loading,
        recoveryMode,
        // 표시를 지우지 않으면 다음 적재에서 게이트가 다시 선다.
        // 비밀번호를 실제로 바꿨거나 로그아웃한 경우에만 호출된다.
        exitRecoveryMode: () => {
          setRecoveryMode(false);
          clearRecoveryPending().catch((error) => {
            logger.error('AuthContext: 복구 표시 삭제 실패:', error);
          });
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
