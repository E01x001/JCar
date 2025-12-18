// src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from '@react-native-firebase/firestore';
import crashlytics from '@react-native-firebase/crashlytics';
import messaging from '@react-native-firebase/messaging';
import { saveFcmToken } from '../services/firebaseService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // console.log('🔐 AuthProvider initializing...');

  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [sellerName, setSellerName] = useState(null);
  const [sellerPhone, setSellerPhone] = useState(null);
  const [sellerEmail,setSellerEmail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        try {
          const db = getFirestore();
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser(currentUser);
            setRole(userData.role || 'user');
            setSellerName(userData.name || 'Unknown');
            setSellerPhone(userData.phoneNumber || 'Unknown');
            setSellerEmail(userData.email || 'Unknown');

            // ✅ FCM 토큰 저장
            await saveFcmToken(currentUser.uid);
          }
        } catch (error) {
          console.error('AuthContext: Error loading user data:', error);
          crashlytics().recordError(error);
          crashlytics().log('AuthContext: Failed to load user data');
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
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
      console.log('🔄 FCM 토큰 갱신됨:', newToken);

      // 현재 로그인된 사용자의 토큰 업데이트
      const currentUser = auth().currentUser;
      if (currentUser) {
        try {
          const db = getFirestore();
          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, { fcmToken: newToken });
          console.log('✅ 갱신된 FCM 토큰 저장 완료');
        } catch (error) {
          console.error('❌ 갱신된 FCM 토큰 저장 실패:', error);
          crashlytics().recordError(error);
          crashlytics().log('onTokenRefresh: Failed to save new token');
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
