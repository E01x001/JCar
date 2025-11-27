// src/services/firebaseService.js
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import messaging from '@react-native-firebase/messaging';
import crashlytics from '@react-native-firebase/crashlytics';
import { Alert, Platform, PermissionsAndroid } from 'react-native';

// --------------------
// 회원가입
// --------------------
export const registerUser = async ({ email, password, name, phoneNumber }) => {
  try {
    // Firebase Authentication에 사용자 생성
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    const userId = userCredential.user.uid;

    // Firestore에 추가 정보 저장
    await firestore().collection('users').doc(userId).set({
      name,
      phoneNumber,
      role: 'user', // 기본 역할
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, userId };
  } catch (error) {
    console.error('회원가입 실패:', error);
    crashlytics().recordError(error);
    crashlytics().log('registerUser failed');
    Alert.alert('회원가입 오류', error.message || '알 수 없는 오류가 발생했습니다.');
    return { success: false, error };
  }
};

// --------------------
// 로그인
// --------------------
export const loginUser = async ({ email, password }) => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    return { success: true, userId: userCredential.user.uid };
  } catch (error) {
    console.error('로그인 실패:', error);
    crashlytics().recordError(error);
    crashlytics().log('loginUser failed');
    Alert.alert('로그인 오류', error.message || '알 수 없는 오류가 발생했습니다.');
    return { success: false, error };
  }
};

// --------------------
// 비밀번호 재설정
// --------------------
export const sendPasswordResetEmail = async (email) => {
  try {
    await auth().sendPasswordResetEmail(email);
    Alert.alert('알림', '비밀번호 재설정 메일을 발송했습니다.');
    return { success: true };
  } catch (error) {
    console.error('비밀번호 재설정 실패:', error);
    crashlytics().recordError(error);
    crashlytics().log('sendPasswordResetEmail failed');
    Alert.alert('오류', error.message || '비밀번호 재설정 중 오류가 발생했습니다.');
    return { success: false, error };
  }
};

// --------------------
// 상담 요청 저장
// --------------------
export const saveConsultationRequest = async (data) => {
  try {
    const validData = {
      userId: data.userId || null,
      userName: data.userName || '익명',
      userPhone: data.userPhone || '미등록',
      vehicleId: data.vehicleId || null,
      vehicleName: data.vehicleName || '알 수 없음',
      preferredDate: data.preferredDate || null,
      preferredTime: data.preferredTime || null,
      status: data.status || 'pending',
      type: data.type || 'buy',
      createdAt: firestore.FieldValue.serverTimestamp(),
    };

    await firestore().collection('consultation_requests').add(validData);
    return { success: true };
  } catch (error) {
    console.error('상담 요청 저장 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('saveConsultationRequest failed');
    Alert.alert('오류', '상담 요청 저장에 실패했습니다.');
    return { success: false, error };
  }
};

// --------------------
// 알림 권한 요청
// --------------------
export const requestNotificationPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        // Android 13 이상에서는 POST_NOTIFICATIONS 권한 요청
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: '알림 권한 요청',
            message: '중요한 알림을 받으려면 권한이 필요합니다.',
            buttonNeutral: '나중에',
            buttonNegative: '거부',
            buttonPositive: '허용',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('✅ 알림 권한 허용됨');
          return true;
        } else {
          console.log('❌ 알림 권한 거부됨');
          return false;
        }
      } else {
        // Android 12 이하에서는 자동으로 권한 허용
        console.log('✅ Android 12 이하 - 알림 권한 자동 허용');
        return true;
      }
    } else if (Platform.OS === 'ios') {
      // iOS에서는 Firebase Messaging의 requestPermission 사용
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ iOS 알림 권한 허용됨:', authStatus);
        return true;
      } else {
        console.log('❌ iOS 알림 권한 거부됨');
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error('알림 권한 요청 실패:', error);
    crashlytics().recordError(error);
    crashlytics().log('requestNotificationPermission failed');
    return false;
  }
};

// --------------------
// FCM 토큰 저장
// --------------------
export const saveFcmToken = async (userId) => {
  try {
    const token = await messaging().getToken();
    if (token) {
      await firestore().collection('users').doc(userId).update({ fcmToken: token });
      console.log('FCM 토큰 저장 완료:', token);
    }
  } catch (error) {
    console.error('FCM 토큰 저장 실패:', error);
    crashlytics().recordError(error);
    crashlytics().log('saveFcmToken failed');
  }
};

// --------------------
// Callable Functions 예시
// --------------------
export const deleteVehicleAdmin = async (vehicleId) => {
  try {
    const callable = functions().httpsCallable('deleteVehicleAdmin');
    await callable({ vehicleId });
    Alert.alert('알림', '차량이 삭제되었습니다.');
  } catch (error) {
    console.error('차량 삭제 실패:', error);
    crashlytics().recordError(error);
    crashlytics().log('deleteVehicleAdmin failed');
    Alert.alert('오류', error.message || '차량 삭제 중 오류가 발생했습니다.');
  }
};

export const deleteConsultationAdmin = async (consultationId) => {
  try {
    const callable = functions().httpsCallable('deleteConsultationAdmin');
    await callable({ consultationId });
    Alert.alert('알림', '상담이 삭제되었습니다.');
  } catch (error) {
    console.error('상담 삭제 실패:', error);
    crashlytics().recordError(error);
    crashlytics().log('deleteConsultationAdmin failed');
    Alert.alert('오류', error.message || '상담 삭제 중 오류가 발생했습니다.');
  }
};
