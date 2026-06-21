import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, sendPasswordResetEmail } from '@react-native-firebase/auth';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import { useToast } from '../hooks/useToast';

const ForgotPasswordScreen = ({ navigation }) => {
  const toast = useToast();
  const [email, setEmail]         = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focused, setFocused]     = useState(false);

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handlePasswordReset = async () => {
    if (isSubmitting) { return; }
    if (!email)              { setEmailError('이메일 주소를 입력해주세요.'); return; }
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
    <View style={styles.bg}>
      <StatusBar barStyle="light-content" backgroundColor="#1A2B5C" />

      {/* Decorative circles (same as Login) */}
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>← 뒤로</Text>
          </TouchableOpacity>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{'비밀번호\n재설정'}</Text>
            <Text style={styles.heroSub}>가입한 이메일로 재설정 링크를 보내드립니다.</Text>
          </View>

          {/* Glass card */}
          <View style={styles.card}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={[styles.input, focused && styles.inputFocused, emailError && styles.inputError]}
              value={email}
              onChangeText={(t) => { setEmail(t); if (emailError) { setEmailError(''); } }}
              placeholder="이메일 주소를 입력하세요"
              placeholderTextColor="rgba(255,255,255,0.5)"
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handlePasswordReset}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting ? '처리 중...' : '재설정 링크 발송'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLinkText}>로그인으로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#1A2B5C',
  },
  safe: { flex: 1 },
  kav: { flex: 1, justifyContent: 'space-between' },

  circleTopRight: {
    position: 'absolute', right: -50, top: 100,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  circleBottomLeft: {
    position: 'absolute', left: -40, bottom: 200,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  backBtn: { paddingHorizontal: 24, paddingTop: 20 },
  backBtnText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },

  hero: { flex: 1, paddingHorizontal: 32, paddingTop: 28 },
  heroTitle: {
    color: '#fff', fontSize: 32, fontWeight: '800',
    lineHeight: 42, letterSpacing: -0.5,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 12, lineHeight: 22,
  },

  card: {
    marginHorizontal: 20, marginBottom: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 24, padding: 24,
  },
  label: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 15, color: '#fff',
  },
  inputFocused: { borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(255,255,255,0.20)' },
  inputError:   { borderColor: 'rgba(255,100,100,0.6)' },
  fieldError:   { color: '#FF8A95', fontSize: 12, marginTop: 5, marginLeft: 4 },

  submitBtn: {
    backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 17, marginTop: 20, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#2B4593', fontSize: 16, fontWeight: '800' },

  loginLink: { alignItems: 'center', marginTop: 18 },
  loginLinkText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
});

export default ForgotPasswordScreen;
