import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { getAuth, signInWithEmailAndPassword } from '@react-native-firebase/auth';
import crashlytics from '@react-native-firebase/crashlytics';
import { useTheme } from '../theme/ThemeProvider';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { useToast } from '../hooks/useToast';

const LoginScreen = ({ navigation }) => {
  const theme = useTheme();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');

  // 이메일 형식 검증 함수
  const validateEmail = (emailInput) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailInput);
  };

  const handleLogin = async () => {
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

    if (!password) {
      toast.showError('입력 오류', '비밀번호를 입력해주세요.');
      return;
    }

    // 에러 초기화
    setEmailError('');

    try {
      // Task 62.4: Use modular signInWithEmailAndPassword
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      toast.showSuccess('로그인 성공', '환영합니다!');
    } catch (error) {
      crashlytics().recordError(error);
      crashlytics().log('LoginScreen: Login failed');
      toast.showError('로그인 실패', error.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />

      <View style={[styles.formContainer, { marginTop: theme.spacing.xl }]}>
        <InputField
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (emailError) {
              setEmailError('');
            }
          }}
          placeholder="이메일 입력"
          keyboardType="email-address"
          autoCapitalize="none"
          error={emailError}
        />
        <InputField
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호 입력"
          secureTextEntry
        />

        <Button
          variant="primary"
          title="로그인"
          onPress={handleLogin}
          style={{ marginTop: theme.spacing.sm }}
        />

        <View style={styles.subActionsContainer}>
          <Button
            variant="text"
            title="비밀번호 찾기"
            onPress={() => navigation.navigate('ForgotPassword')}
          />
          <Button
            variant="text"
            title="회원가입"
            onPress={() => navigation.navigate('Register')}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
  formContainer: {
    width: '100%',
  },
  subActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
});

export default LoginScreen;
