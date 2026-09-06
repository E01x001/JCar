/**
 * ResetPasswordScreen — 메일 링크로 들어온 사람이 새 비밀번호를 정하는 곳.
 *
 * **이 화면은 로그인된 화면이 아니다.** 쥐고 있는 것은 URL에서 꺼낸 재설정
 * 토큰 하나뿐이고, 세션은 없다. 제출하면 토큰과 새 비밀번호가 함께 서버로
 * 가고, 검증·변경·전 세션 해제가 거기서 한 번에 끝난다.
 *
 * 예전에는 복구 링크가 브라우저에 정식 세션을 만들었고, 그래서 그 세션을
 * 화면 단에서 가두는 게이트가 필요했다. 그 게이트는 URL 조각·이벤트·로컬
 * 저장소를 짜맞춘 추론이라 셋 다에서 버그가 났고, 무엇보다 화면만 가릴 뿐
 * API 호출은 막지 못했다. 세션을 만들지 않으니 가둘 것도 없어졌다.
 *
 * 토큰은 1회용이라 **미리 검증할 수 없다.** 링크가 만료됐어도 비밀번호를
 * 입력한 뒤에야 알게 된다 — 그 대가로 세션이 없다.
 *
 * 성공해도 로그인되지 않는다. 새 비밀번호로 다시 로그인해야 한다.
 */
import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';
import { resetPasswordWithToken } from '../services/auth/supabaseAuthService';
import { validateNewPassword, PASSWORD_RULE_TEXT } from '../utils/password';
import { logger } from '../utils/logger';
import InputField from '../components/InputField';
import Button from '../components/Button';

/** 링크가 죽었을 때. 다시 요청하는 것 말고 할 수 있는 게 없다. */
const DeadLinkNotice = ({ colors, message, onLeave }) => (
  <View style={styles.body}>
    <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
    <Text style={[styles.title, { color: colors.text.primary }]}>링크를 사용할 수 없습니다</Text>
    <Text style={[styles.desc, { color: colors.text.secondary }]}>{message}</Text>
    <Button variant="primary" title="비밀번호 찾기로 돌아가기" onPress={onLeave} fullWidth />
  </View>
);

/** 변경 완료. 로그인 상태가 아니므로 다시 로그인해야 한다. */
const DoneNotice = ({ colors, sessionsRevoked, onLeave }) => (
  <View style={styles.body}>
    <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
    <Text style={[styles.title, { color: colors.text.primary }]}>비밀번호를 변경했습니다</Text>
    <Text style={[styles.desc, { color: colors.text.secondary }]}>
      {sessionsRevoked
        ? '보안을 위해 모든 기기의 로그인을 해제했습니다.\n새 비밀번호로 다시 로그인해주세요.'
        : '새 비밀번호로 다시 로그인해주세요.'}
    </Text>
    <Button variant="primary" title="로그인하기" onPress={onLeave} fullWidth />
  </View>
);

/** 새 비밀번호 입력 폼. 토큰이 살아 있는 동안의 기본 화면. */
const ResetForm = ({
  colors, password, confirm, errors, isSubmitting,
  onChangePassword, onChangeConfirm, onSubmit, onLeave,
}) => (
  <View style={styles.body}>
    <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
    <Text style={[styles.title, { color: colors.text.primary }]}>새 비밀번호를 정해주세요</Text>
    <Text style={[styles.desc, { color: colors.text.secondary }]}>
      {PASSWORD_RULE_TEXT}해야 합니다
    </Text>

    <InputField
      label="새 비밀번호"
      value={password}
      onChangeText={onChangePassword}
      placeholder="8자 이상 입력 (소문자+숫자 포함)"
      secureTextEntry
      autoCapitalize="none"
      error={errors.password}
    />

    <InputField
      label="새 비밀번호 확인"
      value={confirm}
      onChangeText={onChangeConfirm}
      placeholder="한 번 더 입력"
      secureTextEntry
      autoCapitalize="none"
      error={errors.confirm}
    />

    <Button
      variant="primary"
      title={isSubmitting ? '변경 중...' : '비밀번호 변경'}
      onPress={onSubmit}
      loading={isSubmitting}
      disabled={isSubmitting}
      fullWidth
      style={styles.cta}
    />

    <TouchableOpacity onPress={onLeave} disabled={isSubmitting} style={styles.cancel} hitSlop={8}>
      <Text style={[styles.cancelText, { color: colors.text.secondary }]}>나중에 하기</Text>
    </TouchableOpacity>
  </View>
);

const ResetPasswordScreen = ({ tokenHash, onLeave }) => {
  const { colors } = useTheme();
  const toast = useToast();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deadLink, setDeadLink] = useState(null);
  const [done, setDone] = useState(null);

  const clearError = (field) => {
    if (errors[field]) { setErrors((prev) => ({ ...prev, [field]: '' })); }
  };

  const handleSubmit = async () => {
    if (isSubmitting) { return; }

    const found = validateNewPassword(password, confirm);
    if (Object.keys(found).length > 0) { setErrors(found); return; }

    setErrors({});
    setIsSubmitting(true);
    try {
      const { sessionsRevoked } = await resetPasswordWithToken(tokenHash, password);
      setDone({ sessionsRevoked });
    } catch (error) {
      logger.error('비밀번호 재설정 실패:', error.code);

      // 링크가 죽은 경우는 입력을 고쳐서 될 일이 아니다. 폼을 계속 보여주면
      // 사용자가 비밀번호만 바꿔 가며 다시 시도한다.
      if (error.code === 'invalid_link') {
        setDeadLink(error.message);
      } else if (error.code === 'weak_password') {
        setErrors({ password: error.message });
        setIsSubmitting(false);
      } else {
        toast.showError('오류', error.message);
        setIsSubmitting(false);
      }
    }
  };

  const renderBody = () => {
    if (deadLink) {
      return <DeadLinkNotice colors={colors} message={deadLink} onLeave={onLeave} />;
    }
    if (done) {
      return <DoneNotice colors={colors} sessionsRevoked={done.sessionsRevoked} onLeave={onLeave} />;
    }
    return (
      <ResetForm
        colors={colors}
        password={password}
        confirm={confirm}
        errors={errors}
        isSubmitting={isSubmitting}
        onChangePassword={(t) => { setPassword(t); clearError('password'); }}
        onChangeConfirm={(t) => { setConfirm(t); clearError('confirm'); }}
        onSubmit={handleSubmit}
        onLeave={onLeave}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background.card }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.spacer} />
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>비밀번호 재설정</Text>
        <View style={styles.spacer} />
      </View>

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/*
          키보드가 뜨면 창이 줄어든다(안드로이드 adjustResize). 스크롤이 없으면
          줄어든 높이 안에서만 배치돼 하단 버튼이 잘린다. KeyboardAvoidingView의
          behavior는 안드로이드에서 undefined라 거들지 않는다.
        */}
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {renderBody()}
        </ScrollView>
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
  spacer: { width: 40, height: 32 },
  headerTitle: { fontSize: typography.fontSize.screenTitle, fontWeight: '700' },
  kav: { flex: 1 },
  scrollBody: { flexGrow: 1, justifyContent: 'center' },
  body: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.screenX, paddingBottom: 60 },
  logo: { width: 150, height: 48, alignSelf: 'center', marginBottom: 24 },
  title: { fontSize: typography.fontSize.heroTitle, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  desc: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 12, marginBottom: 28 },
  cta: { marginTop: 12 },
  cancel: { alignSelf: 'center', marginTop: 20, paddingVertical: 6 },
  cancelText: { fontSize: 14, textDecorationLine: 'underline' },
});

export default ResetPasswordScreen;
