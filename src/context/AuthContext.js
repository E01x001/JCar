// src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [sellerName, setSellerName] = useState(null);
  const [sellerPhone, setSellerPhone] = useState(null);
  const [sellerEmail,setSellerEmail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          setUser(currentUser);
          setRole(userData.role || 'user');
          setSellerName(userData.name || 'Unknown');
          setSellerPhone(userData.phoneNumber || 'Unknown');
          setSellerEmail(userData.email || 'Unknown');

          // ✅ FCM 토큰 저장
          await saveFcmToken(currentUser.uid);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, sellerName, sellerPhone, sellerEmail, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
