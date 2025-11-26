// src/services/firebaseService.js
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';

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
    Alert.alert('오류', '상담 요청 저장에 실패했습니다.');
    return { success: false, error };
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
    Alert.alert('오류', error.message || '상담 삭제 중 오류가 발생했습니다.');
  }
};
