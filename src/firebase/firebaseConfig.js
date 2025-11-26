// src/firebase/firebaseConfig.js

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import storage from '@react-native-firebase/storage';

// ⚠️ initializeApp() 절대 사용 X
// RNFirebase는 google-services.json / plist 로 자동 초기화됨

export const firebaseAuth = auth();
export const firebaseDB = firestore();
export const firebaseFunctions = functions();
export const firebaseStorage = storage();
