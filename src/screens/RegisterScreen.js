import React, { useState } from 'react';
import { logger } from '../utils/logger';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { typography } from '../theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialIcons';
import { signUp, resendConfirmationEmail, mapAuthError } from '../services/auth/supabaseAuthService';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/spacing';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { useToast } from '../hooks/useToast';

const RegisterScreen = ({ navigation }) => {
  const theme = useTheme();
  const c = theme.colors;
  const toast = useToast();

  const [step, setStep] = useState(1); // 1 기본 정보 · 2 이메일 인증
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const isValidPassword = (v) => /^(?=.*[a-z])(?=.*\d).{8,}$/.test(v);
  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleNext = async () => {
    if (loading) { return; }

    const newErrors = {};
    if (!name) { newErrors.name = '이름을 입력해주세요.'; }
    if (!phoneNumber) { newErrors.phoneNumber = '전화번호를 입력해주세요.'; }
    if (!email) { newErrors.email = '이메일을 입력해주세요.'; }
    else if (!isValidEmail(email)) { newErrors.email = '올바른 이메일 형식이 아닙니다.'; }
    if (!password) { newErrors.password = '비밀번호를 입력해주세요.'; }
    else if (!isValidPassword(password)) { newErrors.password = '8자 이상이며 소문자와 숫자를 포함해야 합니다.'; }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      // Supabase 가입 — profiles는 DB 트리거 생성, 전화번호 중복은 UNIQUE 제약으로 거부,
      // 확인 메일은 Supabase가 실제 발송(기존 UI-only였던 2단계가 실동작으로 전환)
      await signUp({ email, password, name, phoneNumber });
      setStep(2);
    } catch (error) {
      logger.error('signUp 오류:', error);
      toast.showError('회원가입 실패', mapAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    try {
      await resendConfirmationEmail(email);
      toast.showSuccess('재전송 완료', '인증 메일을 다시 보냈습니다. 받은편지함을 확인해주세요.');
    } catch (error) {
      logger.error('인증 메일 재전송 오류:', error);
      toast.showError('재전송 실패', mapAuthError(error));
    }
  };

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: c.background.card }]} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (step === 2 ? navigation.navigate('Login') : navigation.goBack())}
          hitSlop={10}
          style={styles.backBtn}
        >
          <Icon name="chevron-left" size={28} color={c.primary.main} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.text.primary }]}>회원가입</Text>
        <View style={styles.backBtn} />
      </View>

      {/* 진행 바 */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          {[1, 2].map((s) => (
            <View key={s} style={[styles.progressSeg, { backgroundColor: s <= step ? c.primary.main : c.border.light }]} />
          ))}
        </View>
        <Text style={[styles.progressLabel, { color: c.text.tertiary }]}>
          {step} / 2 · {step === 1 ? '기본 정보 입력' : '이메일 인증'}
        </Text>
      </View>

      {step === 1 ? (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.intro, { color: c.text.secondary }]}>
            J-Car 계정을 만들고 안전한 중고차 거래를 시작하세요
          </Text>

          <InputField
            label="이름"
            value={name}
            onChangeText={(t) => { setName(t); if (errors.name) { setErrors({ ...errors, name: '' }); } }}
            placeholder="이름 입력"
            error={errors.name}
          />
          <InputField
            label="휴대폰 번호"
            value={phoneNumber}
            onChangeText={(t) => { setPhoneNumber(t); if (errors.phoneNumber) { setErrors({ ...errors, phoneNumber: '' }); } }}
            placeholder="전화번호 입력 (예: 01012345678)"
            keyboardType="phone-pad"
            error={errors.phoneNumber}
          />
          <InputField
            label="이메일"
            value={email}
            onChangeText={(t) => { setEmail(t); if (errors.email) { setErrors({ ...errors, email: '' }); } }}
            placeholder="이메일 입력"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <InputField
            label="비밀번호"
            value={password}
            onChangeText={(t) => { setPassword(t); if (errors.password) { setErrors({ ...errors, password: '' }); } }}
            placeholder="8자 이상 입력 (소문자+숫자 포함)"
            secureTextEntry
            error={errors.password}
          />

          <Button
            variant="primary"
            title="다음"
            onPress={handleNext}
            loading={loading}
            disabled={loading}
            fullWidth
            style={styles.cta}
          />
        </ScrollView>
      ) : (
        <View style={styles.verifyBody}>
          <View style={styles.verifyCenter}>
            <View style={[styles.mailBadge, { backgroundColor: c.statusChip.approved.bg }]}>
              <Icon name="mark-email-read" size={36} color={c.success.main} />
            </View>
            <Text style={[styles.verifyTitle, { color: c.text.primary }]}>인증 메일을 보냈어요</Text>
            <Text style={[styles.verifyDesc, { color: c.text.secondary }]}>
              <Text style={{ color: c.primary.main, fontWeight: '700' }}>{email}</Text>
              {' 으로\n전송된 링크를 눌러 가입을 완료하세요'}
            </Text>

            <Pressable onPress={onResend} style={[styles.resend, { backgroundColor: c.background.secondary }]} hitSlop={6}>
              <Text style={[styles.resendText, { color: c.text.secondary }]}>
                메일이 안 보이나요? <Text style={{ color: c.primary.main, fontWeight: '700' }}>재전송</Text>
              </Text>
            </Pressable>
          </View>

          <Button
            variant="primary"
            title="인증 완료, 로그인하기"
            onPress={() => navigation.navigate('Login')}
            fullWidth
            style={styles.cta}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  backBtn: { width: 40, height: 32, justifyContent: 'center' },
  headerTitle: { fontSize: typography.fontSize.screenTitle, fontWeight: '700' },
  progressWrap: { paddingHorizontal: spacing.screenX, paddingTop: 6, paddingBottom: 4 },
  progressTrack: { flexDirection: 'row', gap: 6 },
  progressSeg: { flex: 1, height: 5, borderRadius: 3 },
  progressLabel: { fontSize: 12, marginTop: 9 },
  body: { padding: 22, paddingTop: 14 },
  intro: { fontSize: 14, lineHeight: 21, marginBottom: 18 },
  cta: { marginTop: 20 },
  // Step 2
  verifyBody: { flex: 1, paddingHorizontal: spacing.screenX, paddingBottom: 8 },
  verifyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mailBadge: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  verifyTitle: { fontSize: 20, fontWeight: '800', marginTop: 24 },
  verifyDesc: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 10 },
  resend: { marginTop: 22, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  resendText: { fontSize: 13 },
});

export default RegisterScreen;
