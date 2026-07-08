// src/context/AuthContext.js
// Task 62.4: Migrated to React Native Firebase Modular API (v22+)
// Task 63.2: Migrated Crashlytics and Messaging to v22 Modular API
import React, { createContext, useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from '@react-native-firebase/firestore';
import { saveFcmToken } from '../services/notification/fcmService';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { getMessaging, onTokenRefresh } from '@react-native-firebase/messaging';
import Toast from 'react-native-toast-message';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // logger.debug('🔐 AuthProvider initializing...');

  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [sellerName, setSellerName] = useState(null);
  const [sellerPhone, setSellerPhone] = useState(null);
  const [sellerEmail,setSellerEmail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Task 62.4: Use modular onAuthStateChanged
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const db = getFirestore();
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();

            // 계정 정지 체크
            if (userData.status === 'suspended') {
              // 강제 로그아웃
              await auth.signOut();

              // 사용자에게 알림
              Toast.show({
                type: 'error',
                text1: '계정 정지',
                text2: '귀하의 계정이 정지되었습니다. 관리자에게 문의하세요.',
                position: 'top',
                visibilityTime: 5000,
              });

              setUser(null);
              setRole(null);
              setLoading(false);
              return;
            }

            setUser(currentUser);
            setRole(userData.role || 'user');
            setSellerName(userData.name || 'Unknown');
            setSellerPhone(userData.phoneNumber || 'Unknown');
            setSellerEmail(userData.email || 'Unknown');

            // ✅ FCM 토큰 저장
            await saveFcmToken(currentUser.uid);
          } else {
            // 인증은 됐지만 users/{uid} 문서가 없는 경우(가입 직후 전파 지연,
            // 또는 registerUser의 Firestore 쓰기 실패). 이전에는 조용히
            // user=null로 남아 로그인 화면으로 튕겼다 → 기본 프로필로 진입시키고
            // 서버에 상황을 보고한다.
            logCrashlyticsMessage(`AuthContext: users/${currentUser.uid} doc missing — defaulting to user role`);
            setUser(currentUser);
            setRole('user');
            setSellerName(currentUser.displayName || 'Unknown');
            setSellerPhone('Unknown');
            setSellerEmail(currentUser.email || 'Unknown');
          }
        } catch (error) {
          logger.error('AuthContext: Error loading user data:', error);
          reportCrashlyticsError(error);
          logCrashlyticsMessage('AuthContext: Failed to load user data');
          // 프로필 조회 실패(네트워크 등)로 인증 사용자를 로그인 화면으로
          // 되돌리지 않는다 — 최소 권한(user)으로 진입시킨다.
          setUser(currentUser);
          setRole('user');
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // FCM 토큰 갱신 리스너
  useEffect(() => {
    const messagingInstance = getMessaging();
    const unsubscribeTokenRefresh = onTokenRefresh(messagingInstance, async (newToken) => {
      logger.debug('🔄 FCM 토큰 갱신됨:', newToken);

      // Task 62.4: Use modular currentUser
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const db = getFirestore();
          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, { fcmToken: newToken });
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
    <AuthContext.Provider value={{ user, role, sellerName, sellerPhone, sellerEmail, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
