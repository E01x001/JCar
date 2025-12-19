// src/firebase/firebaseConfig.js

import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getFunctions } from '@react-native-firebase/functions';
import { getStorage } from '@react-native-firebase/storage';

// ⚠️ initializeApp() 절대 사용 X
// RNFirebase는 google-services.json / plist 로 자동 초기화됨

export const firebaseAuth = getAuth();
export const firebaseDB = getFirestore();
export const firebaseFunctions = getFunctions();
export const firebaseStorage = getStorage();
