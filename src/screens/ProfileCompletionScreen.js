/**
 * ProfileCompletionScreen — 필수 프로필(이름·휴대폰) 입력.
 *
 * 구글 로그인은 전화번호를 주지 않고, 이메일 가입도 metadata가 비어 들어오는 경로가 있다.
 * 이름·전화 없이 차량을 등록하면 판매자 정보가 'Unknown'으로 남아 관리자가 연락할 수
 * 없으므로, DB(profiles.profile_completed)가 차량 등록·상담 신청을 막는다.
 * 이 화면은 그 잠금을 푸는 유일한 경로다 — AppNavigator가 미완성 사용자에게 강제 진입시킨다.
 *
 * 형식 검증·중복 검사는 서버(complete_profile RPC)가 수행하고, 여기서는 즉시 피드백용
 * 최소 검사만 한다.
 */
import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialIcons';
import { logger } from '../utils/logger';
import { AuthContext } from '../context/AuthContext';
import { completeProfile } from '../services/auth/supabaseAuthService';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { typography } from '../theme/typography';

const ProfileCompletionScreen = () => {
  const theme = useTheme();
  const c = theme.colors;
  const toast = useToast();
  const { sellerName, refreshProfile } = useContext(AuthContext);

  // 구글 로그인은 이름을 주는 경우가 있어 미리 채워둔다
  const [name, setName] = useState(sellerName && sellerName !== 'Unknown' ? sellerName : '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading) { return; }

    const next = {};
    if (!name.trim()) { next.name = '이름을 입력해주세요.'; }
    if (!phoneNumber.trim()) { next.phoneNumber = '휴대폰 번호를 입력해주세요.'; }
    if (Object.keys(next).length > 0) { setErrors(next); return; }

    setErrors({});
    setLoading(true);
    try {
      await completeProfile(name, phoneNumber);
      await refreshProfile(); // 갱신되면 AppNavigator가 자동으로 앱 본화면으로 보낸다
      toast.showSuccess('완료', '정보가 저장되었습니다.');
    } catch (error) {
      logger.error('프로필 완성 실패:', error);
      // RPC가 한글 메시지를 던진다(형식 오류·중복 번호 등)
      toast.showError('저장 실패', error?.message || '정보 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: c.background.card }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.badge, { backgroundColor: c.tag.accent.bg }]}>
            <Icon name="badge" size={34} color={c.primary.main} />
          </View>

          <Text style={[styles.title, { color: c.text.primary }]}>거의 다 됐어요</Text>
          <Text style={[styles.intro, { color: c.text.secondary }]}>
            안전한 거래를 위해 이름과 연락처가 필요합니다.{'\n'}
            상담 예약 시 담당 에이전트가 이 번호로 연락드려요.
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

          <Button
            variant="primary"
            title="저장하고 시작하기"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            fullWidth
            style={styles.cta}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  kav: { flex: 1 },
  body: { padding: 22, paddingTop: 40 },
  badge: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { fontSize: typography.fontSize.heroTitle, fontWeight: '800', textAlign: 'center', marginTop: 20, letterSpacing: -0.3 },
  intro: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10, marginBottom: 24 },
  cta: { marginTop: 20 },
});

export default ProfileCompletionScreen;
