import React, { useState } from 'react';
import { logger } from '../utils/logger';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { firebaseFunctions } from '../firebase/firebaseConfig';
import { useTheme } from '../theme/ThemeProvider';
import Button from '../components/Button';
import InputField from '../components/InputField';
import Card from '../components/Card';
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
  const [loading, setLoading] = useState(false);

  const isValidPassword = (password) => /^(?=.*[a-z])(?=.*\d).{8,}$/.test(password);

  const handleRegister = async () => {
    // 중복 제출 방지
    if (loading) {
      return;
    }

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
    setLoading(true);

    try {
      // RNFirebase Functions 호출 방식 (핵심 수정)
      const registerUser = firebaseFunctions.httpsCallable('registerUser');

      const result = await registerUser({ email, password, name, phoneNumber });
      logger.debug('[DEBUG] registerUser result:', result.data);

      toast.showSuccess('회원가입 완료', '로그인 화면으로 이동합니다.');
      setTimeout(() => navigation.navigate('Login'), 1000);

    } catch (error) {
      logger.error('--- registerUser Cloud Function Error ---');
      logger.error(error);

      const errorMsg = error?.code
        ? `${error.code}: ${error.message}`
        : error?.message || '알 수 없는 오류가 발생했습니다.';
      toast.showError('회원가입 실패', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: theme.colors.background.secondary }]} edges={['top']}>
      {/* 헤더바: ‹ 회원가입 */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border.light }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
          <Icon name="chevron-left" size={28} color={theme.colors.primary.main} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>회원가입</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.intro, { color: theme.colors.text.secondary }]}>
          J-Car 계정을 만들고 안전한 중고차 거래를 시작하세요
        </Text>

        <Card elevated style={styles.formCard}>
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
        </Card>

        <Button
          variant="primary"
          title="회원가입"
          onPress={handleRegister}
          loading={loading}
          disabled={loading}
          fullWidth
          style={styles.submitButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 32,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  container: {
    flexGrow: 1,
    padding: 20,
  },
  intro: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  formCard: {
    padding: 20,
  },
  submitButton: {
    marginTop: 20,
  },
});

export default RegisterScreen;
