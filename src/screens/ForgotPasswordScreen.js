import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import auth from '@react-native-firebase/auth';
import crashlytics from '@react-native-firebase/crashlytics';
import Toast from 'react-native-toast-message';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 이메일 형식 검증 함수
  const validateEmail = (emailInput) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailInput);
  };

  const handlePasswordReset = async () => {
    // 속도 제한: 이미 제출 중이면 무시
    if (isSubmitting) {
      return;
    }

    // 빈 값 체크
    if (!email) {
      setEmailError('이메일 주소를 입력해주세요.');
      return;
    }

    // 이메일 형식 검증
    if (!validateEmail(email)) {
      setEmailError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    // 에러 초기화
    setEmailError('');

    // 제출 중 상태로 변경 (버튼 비활성화)
    setIsSubmitting(true);

    try {
      // Firebase 비밀번호 재설정 이메일 발송
      await auth().sendPasswordResetEmail(email);

      // 성공 시 일반화된 메시지 표시 (보안: 이메일 존재 여부 노출 방지)
      Toast.show({
        type: 'info',
        text1: '비밀번호 재설정',
        text2: '등록된 이메일인 경우 비밀번호 재설정 링크가 발송되었습니다.',
        position: 'top',
        visibilityTime: 4000,
      });

      // 로그인 화면으로 이동
      setTimeout(() => {
        navigation.navigate('Login');
      }, 1000);
    } catch (error) {
      // 에러 로깅 (개발자용)
      crashlytics().recordError(error);
      crashlytics().log(`ForgotPasswordScreen: Password reset failed - ${error.code}`);

      // 사용자에게는 동일한 일반화된 메시지 표시 (보안: 시스템 정보 노출 방지)
      Toast.show({
        type: 'info',
        text1: '비밀번호 재설정',
        text2: '등록된 이메일인 경우 비밀번호 재설정 링크가 발송되었습니다.',
        position: 'top',
        visibilityTime: 4000,
      });

      // 로그인 화면으로 이동
      setTimeout(() => {
        navigation.navigate('Login');
      }, 1000);
    } finally {
      // 30초 후 버튼 재활성화 (무차별 대입 공격 방지)
      setTimeout(() => {
        setIsSubmitting(false);
      }, 30000);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>‹ 뒤로</Text>
      </TouchableOpacity>
      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <Text style={styles.title}>비밀번호 찾기</Text>
      <Text style={styles.subtitle}>{'가입 시 사용한 이메일 주소를 입력하시면,\n비밀번호 재설정 링크를 보내드립니다.'}</Text>
      <TextInput
        style={[styles.input, emailError ? styles.inputError : null]}
        placeholder="이메일 입력"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (emailError) {
            setEmailError('');
          }
        }}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {emailError ? (
        <Text style={styles.errorText}>{emailError}</Text>
      ) : null}
      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handlePasswordReset}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? '처리 중...' : '재설정 이메일 발송'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2B4593',
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#2B4593',
    borderRadius: 8,
    paddingLeft: 15,
    marginBottom: 5,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#DC3545',
  },
  errorText: {
    width: '100%',
    color: '#DC3545',
    fontSize: 12,
    marginBottom: 15,
    paddingLeft: 5,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#2B4593',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ADB5BD',
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen;
