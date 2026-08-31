/**
 * ResetPasswordScreen — 메일 링크로 들어온 사람이 새 비밀번호를 정하는 곳.
 *
 * **이 화면은 네비게이터가 아니라 게이트가 띄운다.** Supabase의 복구 링크는
 * 정식 세션을 만들기 때문에, 그대로 두면 재설정 링크가 로그인 링크가 된다.
 * AuthContext가 PASSWORD_RECOVERY를 잡아 recoveryMode를 세우고, AppNavigator가
 * 그동안 이 화면 하나만 렌더한다 — 즉 여기서 나가는 길은 둘뿐이다:
 * 비밀번호를 바꾸거나, 로그아웃하거나.
 *
 * 옛 비밀번호는 묻지 않는다. 잊어서 온 사람이고, 메일 링크로 이메일 통제권을
 * 이미 증명했다.
 */
import React, { useContext, useEffect, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';
import { AuthContext } from '../context/AuthContext';
import {
  updateMyPassword, signOutUser, mapAuthError, hasPassword,
} from '../services/auth/supabaseAuthService';
import { validateNewPassword, PASSWORD_RULE_TEXT } from '../utils/password';
import { logger } from '../utils/logger';
import InputField from '../components/InputField';
import Button from '../components/Button';

/** 이 계정에 비밀번호가 아직 없는가 — 즉 지금 처음 만드는 중인가. */
const useIsAddingFirstPassword = () => {
  const [isFirst, setIsFirst] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasPassword()
      .then((result) => { if (!cancelled) { setIsFirst(!result); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return isFirst;
};

/**
 * 구글로만 가입한 계정에 비밀번호를 처음 만들 때의 안내.
 *
 * 여기서는 계정 열거 위험이 없다 — 링크로 본인임을 증명한 세션이다. 요청 화면에서
 * 같은 말을 하면 로그인하지 않은 사람이 계정 존재 여부를 알아낼 수 있어서 못 한다.
 */
const GoogleAccountNotice = ({ colors }) => (
  <View style={[styles.notice, { backgroundColor: colors.background.secondary }]}>
    <Text style={[styles.noticeText, { color: colors.text.secondary }]}>
      이 계정은 구글로 가입했습니다. 비밀번호를 정하면 구글 로그인과 함께
      이메일 로그인도 사용할 수 있게 됩니다.
    </Text>
  </View>
);

const ResetPasswordScreen = () => {
  const { colors } = useTheme();
  const toast = useToast();
  const { sellerEmail, exitRecoveryMode } = useContext(AuthContext);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAddingFirstPassword = useIsAddingFirstPassword();

  const clearError = (field) => {
    if (errors[field]) { setErrors((prev) => ({ ...prev, [field]: '' })); }
  };

  const handleSubmit = async () => {
    if (isSubmitting) { return; }

    const found = validateNewPassword(password, confirm, { email: sellerEmail });
    if (Object.keys(found).length > 0) { setErrors(found); return; }

    setErrors({});
    setIsSubmitting(true);
    try {
      const { othersRevoked } = await updateMyPassword(password);

      // 게이트를 먼저 내린다 — 이 시점에 세션은 이미 정상 로그인 세션이다.
      exitRecoveryMode();
      toast.showSuccess(
        '비밀번호 변경 완료',
        othersRevoked
          ? '다른 기기의 로그인은 모두 해제했습니다.'
          : '변경했습니다. 다른 기기는 직접 로그아웃해주세요.',
      );
    } catch (error) {
      logger.error('비밀번호 재설정 실패:', error);
      toast.showError('오류', mapAuthError(error));
      setIsSubmitting(false);
    }
  };

  // 재설정을 포기하는 유일한 출구. 복구 세션을 남겨두지 않는다.
  const handleCancel = async () => {
    try {
      await signOutUser();
    } catch (error) {
      logger.error('로그아웃 실패:', error);
    }
    exitRecoveryMode();
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background.card }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.backBtn} />
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>비밀번호 재설정</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: colors.text.primary }]}>새 비밀번호를 정해주세요</Text>
          <Text style={[styles.desc, { color: colors.text.secondary }]}>
            {sellerEmail && sellerEmail !== 'Unknown' ? `${sellerEmail}\n` : ''}
            {PASSWORD_RULE_TEXT}해야 합니다
          </Text>

          {isAddingFirstPassword && <GoogleAccountNotice colors={colors} />}

          <InputField
            label="새 비밀번호"
            value={password}
            onChangeText={(t) => { setPassword(t); clearError('password'); }}
            placeholder="8자 이상 입력 (소문자+숫자 포함)"
            secureTextEntry
            autoCapitalize="none"
            error={errors.password}
          />

          <InputField
            label="새 비밀번호 확인"
            value={confirm}
            onChangeText={(t) => { setConfirm(t); clearError('confirm'); }}
            placeholder="한 번 더 입력"
            secureTextEntry
            autoCapitalize="none"
            error={errors.confirm}
          />

          <Button
            variant="primary"
            title={isSubmitting ? '변경 중...' : '비밀번호 변경'}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            fullWidth
            style={styles.cta}
          />

          <TouchableOpacity onPress={handleCancel} disabled={isSubmitting} style={styles.cancel} hitSlop={8}>
            <Text style={[styles.cancelText, { color: colors.text.secondary }]}>
              나중에 하기 (로그아웃)
            </Text>
          </TouchableOpacity>
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
  headerTitle: { fontSize: typography.fontSize.screenTitle, fontWeight: '700' },
  kav: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.screenX, paddingBottom: 60 },
  logo: { width: 150, height: 48, alignSelf: 'center', marginBottom: 24 },
  title: { fontSize: typography.fontSize.heroTitle, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  desc: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 12, marginBottom: 28 },
  notice: { borderRadius: 10, padding: 14, marginBottom: 20 },
  noticeText: { fontSize: 13, lineHeight: 20 },
  cta: { marginTop: 12 },
  cancel: { alignSelf: 'center', marginTop: 20, paddingVertical: 6 },
  cancelText: { fontSize: 14, textDecorationLine: 'underline' },
});

export default ResetPasswordScreen;
