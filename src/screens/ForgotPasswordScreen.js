import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getAuth, sendPasswordResetEmail } from '@react-native-firebase/auth';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../theme/ThemeProvider';
import InputField from '../components/InputField';
import Button from '../components/Button';

const ForgotPasswordScreen = ({ navigation }) => {
  const toast = useToast();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handlePasswordReset = async () => {
    if (isSubmitting) { return; }
    if (!email) { setEmailError('이메일 주소를 입력해주세요.'); return; }
    if (!validateEmail(email)) { setEmailError('올바른 이메일 형식이 아닙니다.'); return; }
    setEmailError('');
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(getAuth(), email);
      toast.showSuccess('비밀번호 재설정', '등록된 이메일인 경우 재설정 링크가 발송되었습니다.');
      setTimeout(() => navigation.navigate('Login'), 1500);
    } catch (error) {
      reportCrashlyticsError(error);
      logCrashlyticsMessage(`ForgotPasswordScreen: Password reset failed - ${error.code}`);
      if (error.code === 'auth/user-not-found') {
        toast.showSuccess('비밀번호 재설정', '등록된 이메일인 경우 재설정 링크가 발송되었습니다.');
        setTimeout(() => navigation.navigate('Login'), 1500);
      } else if (error.code === 'auth/too-many-requests') {
        toast.showError('오류 발생', '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
      } else if (error.code === 'auth/network-request-failed') {
        toast.showError('오류 발생', '네트워크 연결을 확인해주세요.');
      } else {
        toast.showError('오류 발생', '이메일 발송 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setTimeout(() => setIsSubmitting(false), 30000);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background.card }]} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Icon name="chevron-left" size={28} color={colors.primary.main} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>비밀번호 찾기</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: colors.text.primary }]}>비밀번호를 잊으셨나요?</Text>
          <Text style={[styles.desc, { color: colors.text.secondary }]}>
            가입 시 사용한 이메일을 입력하시면{'\n'}재설정 링크를 보내드려요
          </Text>

          <InputField
            value={email}
            onChangeText={(t) => { setEmail(t); if (emailError) { setEmailError(''); } }}
            placeholder="이메일 입력"
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
            style={styles.input}
          />

          <Button
            variant="primary"
            title={isSubmitting ? '발송 중...' : '재설정 이메일 발송'}
            onPress={handlePasswordReset}
            loading={isSubmitting}
            disabled={isSubmitting}
            fullWidth
            style={styles.cta}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  backBtn: { width: 40, height: 32, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  kav: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 26, paddingBottom: 60 },
  logo: { width: 150, height: 48, alignSelf: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  desc: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 12, marginBottom: 28 },
  input: { marginBottom: 4 },
  cta: { marginTop: 12 },
});

export default ForgotPasswordScreen;
