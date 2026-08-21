// src/context/AuthContext.js
// Phase 2a: Firebase Auth → Supabase Auth 전환.
// 컨텍스트 shape은 기존과 동일하게 유지한다:
//   { user, role, sellerName, sellerPhone, sellerEmail, loading }
// user에는 기존 화면 호환을 위해 uid 별칭(= Supabase user.id)을 넣는다.
import React, { createContext, useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import Toast from 'react-native-toast-message';
import { supabase } from '../lib/supabase';
import { getMyProfile, signOutUser, saveMyFcmToken } from '../services/auth/supabaseAuthService';
import { saveFcmToken } from '../services/notification/fcmService';
import { recordInstallSignal } from '../services/notification/installSignalService';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { getMessaging, onTokenRefresh } from '../services/notification/firebaseNative';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [sellerName, setSellerName] = useState(null);
  const [sellerPhone, setSellerPhone] = useState(null);
  const [sellerEmail, setSellerEmail] = useState(null);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

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

        // 계정 정지/삭제대기 체크 — 30일 유예 중 계정도 로그인 차단(리뷰 반영)
        if (profile?.status === 'suspended' || profile?.account_status === 'pending_deletion') {
          const isPendingDeletion = profile?.account_status === 'pending_deletion';
          await signOutUser();
          Toast.show({
            type: 'error',
            text1: isPendingDeletion ? '삭제 대기 중인 계정' : '계정 정지',
            text2: isPendingDeletion
              ? '탈퇴 처리된 계정입니다. 복구를 원하시면 고객센터로 문의해주세요.'
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

    // 초기 세션 복원 + 변경 구독
    supabase.auth.getSession().then(({ data }) => applySession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      // onAuthStateChange 콜백 안에서 다른 supabase 호출 시 데드락 방지를 위해
      // 비동기 작업은 마이크로태스크로 분리 (Supabase 문서 권장)
      setTimeout(() => applySession(session), 0);
    });

    return () => subscription.subscription.unsubscribe();
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
      value={{ user, role, sellerName, sellerPhone, sellerEmail, profileCompleted, refreshProfile, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
