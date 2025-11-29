import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { firebaseFunctions } from '../firebase/firebaseConfig';
import { useTheme } from '../theme/ThemeProvider';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { useToast } from '../hooks/useToast';

const RegisterScreen = ({ navigation }) => {
  const theme = useTheme();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState({});

  const isValidPassword = (password) => /^(?=.*[a-z])(?=.*\d).{8,}$/.test(password);

  const handleRegister = async () => {
    const newErrors = {};

    if (!name) {newErrors.name = '이름을 입력해주세요.';}
    if (!phoneNumber) {newErrors.phoneNumber = '전화번호를 입력해주세요.';}
    if (!email) {newErrors.email = '이메일을 입력해주세요.';}
    if (!password) {newErrors.password = '비밀번호를 입력해주세요.';}
    if (!confirmPassword) {newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';}

    if (password && confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    if (password && !isValidPassword(password)) {
      newErrors.password = '비밀번호는 8자 이상이며, 소문자와 숫자를 포함해야 합니다.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      // RNFirebase Functions 호출 방식 (핵심 수정)
      const registerUser = firebaseFunctions.httpsCallable('registerUser');

      const result = await registerUser({ email, password, name, phoneNumber });
      console.log('[DEBUG] registerUser result:', result.data);

      toast.showSuccess('회원가입 완료', '로그인 화면으로 이동합니다.');
      setTimeout(() => navigation.navigate('Login'), 1000);

    } catch (error) {
      console.error('--- registerUser Cloud Function Error ---');
      console.error(error);

      const errorMsg = error?.code
        ? `${error.code}: ${error.message}`
        : error?.message || '알 수 없는 오류가 발생했습니다.';
      toast.showError('회원가입 실패', errorMsg);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <Text style={[styles.title, {
        fontSize: theme.typography.fontSize.h2,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.lg,
      }]}>회원가입</Text>

      <InputField
        label="이름"
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (errors.name) {setErrors({...errors, name: ''});}
        }}
        placeholder="이름 입력"
        error={errors.name}
      />
      <InputField
        label="전화번호"
        value={phoneNumber}
        onChangeText={(text) => {
          setPhoneNumber(text);
          if (errors.phoneNumber) {setErrors({...errors, phoneNumber: ''});}
        }}
        placeholder="전화번호 입력 (예: 01012345678)"
        keyboardType="phone-pad"
        error={errors.phoneNumber}
      />
      <InputField
        label="이메일"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (errors.email) {setErrors({...errors, email: ''});}
        }}
        placeholder="이메일 입력"
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />
      <InputField
        label="비밀번호"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (errors.password) {setErrors({...errors, password: ''});}
        }}
        placeholder="비밀번호 입력 (8자 이상, 소문자+숫자 포함)"
        secureTextEntry
        error={errors.password}
      />
      <InputField
        label="비밀번호 확인"
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          if (errors.confirmPassword) {setErrors({...errors, confirmPassword: ''});}
        }}
        placeholder="비밀번호 확인"
        secureTextEntry
        error={errors.confirmPassword}
      />

      <Button
        variant="primary"
        title="회원가입"
        onPress={handleRegister}
        style={{ marginTop: theme.spacing.md }}
      />

      <Button
        variant="secondary"
        title="로그인으로 돌아가기"
        onPress={() => navigation.navigate('Login')}
        style={{ marginTop: theme.spacing.md }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
  },
});

export default RegisterScreen;
