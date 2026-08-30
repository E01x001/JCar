/**
 * ChangePasswordScreen — 로그인한 사용자가 스스로 비밀번호를 바꾸는 곳.
 *
 * 재설정 화면과 다른 점 하나가 이 화면의 존재 이유다: **현재 비밀번호를 묻는다.**
 *
 * Supabase의 updateUser는 옛 비밀번호를 요구하지 않는다. 그대로 쓰면 잠금이
 * 풀린 채 놓인 폰을 주운 사람이 비밀번호를 바꿔 계정을 통째로 가져갈 수 있다
 * (그다음 '다른 기기 로그아웃'까지 우리가 실행해 준다). 그래서 같은 자격으로
 * 한 번 더 로그인해 본인임을 확인한 뒤에만 바꾼다.
 *
 * 구글로만 가입한 계정은 비밀번호가 없다. 그런 계정에는 이 화면을 열어 주지
 * 않는다(마이페이지에서 항목 자체가 보이지 않는다).
 */
import React, { useContext, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '../theme/spacing';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';
import { AuthContext } from '../context/AuthContext';
import { updateMyPassword, mapAuthError } from '../services/auth/supabaseAuthService';
import { validateNewPassword, PASSWORD_RULE_TEXT } from '../utils/password';
import { logger } from '../utils/logger';
import InputField from '../components/InputField';
import Button from '../components/Button';

const ChangePasswordScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const toast = useToast();
  const { sellerEmail } = useContext(AuthContext);

  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearError = (field) => {
    if (errors[field]) { setErrors((prev) => ({ ...prev, [field]: '' })); }
  };

  const handleSubmit = async () => {
    if (isSubmitting) { return; }

    const found = validateNewPassword(password, confirm, {
      email: sellerEmail,
      currentPassword: current,
    });
    if (!current) { found.current = '현재 비밀번호를 입력해주세요.'; }
    if (Object.keys(found).length > 0) { setErrors(found); return; }

    setErrors({});
    setIsSubmitting(true);
    try {
      const { othersRevoked } = await updateMyPassword(password, {
        currentPassword: current,
        email: sellerEmail,
      });

      toast.showSuccess(
        '비밀번호 변경 완료',
        othersRevoked
          ? '다른 기기의 로그인은 모두 해제했습니다.'
          : '변경했습니다. 다른 기기는 직접 로그아웃해주세요.',
      );
      navigation.goBack();
    } catch (error) {
      logger.error('비밀번호 변경 실패:', error);

      // 재인증 실패는 '현재 비밀번호' 칸의 문제다 — 토스트로 흘리지 않고
      // 그 자리에 붙여야 사용자가 어디를 고쳐야 하는지 안다.
      const isWrongCurrent = error?.code === 'invalid_credentials'
        || /Invalid login credentials/i.test(error?.message || '');
      if (isWrongCurrent) {
        setErrors({ current: '현재 비밀번호가 올바르지 않습니다.' });
      } else {
        toast.showError('오류', mapAuthError(error));
      }
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background.card }]} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={[styles.desc, { color: colors.text.secondary }]}>
            본인 확인을 위해 현재 비밀번호를 함께 입력해주세요.{'\n'}
            변경하면 다른 기기의 로그인은 모두 해제됩니다.
          </Text>

          <InputField
            label="현재 비밀번호"
            value={current}
            onChangeText={(t) => { setCurrent(t); clearError('current'); }}
            placeholder="현재 비밀번호 입력"
            secureTextEntry
            autoCapitalize="none"
            error={errors.current}
          />

          <View style={styles.divider} />

          <InputField
            label="새 비밀번호"
            value={password}
            onChangeText={(t) => { setPassword(t); clearError('password'); }}
            placeholder={`${PASSWORD_RULE_TEXT}`}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  body: { paddingHorizontal: spacing.screenX, paddingTop: 20, paddingBottom: 40 },
  desc: { fontSize: 14, lineHeight: 22, marginBottom: 24 },
  divider: { height: 1, backgroundColor: '#ECEEF1', marginVertical: 12 },
  cta: { marginTop: 20 },
});

export default ChangePasswordScreen;
