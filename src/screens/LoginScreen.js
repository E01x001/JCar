import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Image, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FAIcon from '@expo/vector-icons/FontAwesome';
import { signIn, signInWithGoogle, mapAuthError } from '../services/auth/supabaseAuthService';
import { useToast } from '../hooks/useToast';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

const LoginScreen = ({ navigation }) => {
  const toast = useToast();
  const theme = useTheme();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading]   = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleLogin = async () => {
    if (loading) { return; }
    if (!email)              { setEmailError('이메일 주소를 입력해주세요.'); return; }
    if (!validateEmail(email)) { setEmailError('올바른 이메일 형식이 아닙니다.'); return; }
    if (!password)           { toast.showError('입력 오류', '비밀번호를 입력해주세요.'); return; }
    setEmailError('');
    setLoading(true);
    try {
      await signIn(email, password);
      // 이후 화면 전환은 AuthContext의 onAuthStateChange가 처리
    } catch (error) {
      toast.showError('로그인 실패', mapAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (googleLoading || loading) { return; }
    setGoogleLoading(true);
    try {
      const { cancelled } = await signInWithGoogle();
      if (cancelled) { return; }
      // 화면 전환은 AuthContext의 onAuthStateChange가 처리한다.
      // 전화번호가 없는 신규 사용자는 AppNavigator가 프로필 완성 화면으로 보낸다.
    } catch (error) {
      toast.showError('구글 로그인 실패', mapAuthError(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={[styles.bg, { backgroundColor: theme.colors.primary.dark }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary.dark} />

      {/* Decorative background circles */}
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Hero — logo + tagline */}
          <View style={styles.hero}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              tintColor="#fff"
              resizeMode="contain"
            />
            <Text style={styles.tagline}>{'믿을 수 있는\n중고차 거래의 시작'}</Text>
            <Text style={styles.subTagline}>차량 인증 · 상담 예약 · 안전한 거래</Text>
          </View>

          {/* Glass card */}
          <View style={styles.card}>
            <TextInput
              style={[styles.input, emailFocused && styles.inputFocused]}
              value={email}
              onChangeText={(t) => { setEmail(t); if (emailError) { setEmailError(''); } }}
              placeholder="이메일 주소"
              placeholderTextColor="rgba(255,255,255,0.5)"
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

            <TextInput
              style={[styles.input, { marginTop: 12 }, passFocused && styles.inputFocused]}
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호 입력"
              placeholderTextColor="rgba(255,255,255,0.5)"
              secureTextEntry
              onFocus={() => setPassFocused(true)}
              onBlur={() => setPassFocused(false)}
            />

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={[styles.loginBtnText, { color: theme.colors.primary.main }]}>{loading ? '로그인 중...' : '로그인'}</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleBtn, googleLoading && styles.loginBtnDisabled]}
              onPress={handleGoogleLogin}
              disabled={googleLoading || loading}
              activeOpacity={0.85}
            >
              {/* TODO(출시 전): 구글 브랜딩 가이드라인상 공식 4색 'G' 에셋으로 교체 필요 */}
              <FAIcon name="google" size={18} color="#4285F4" />
              <Text style={styles.googleBtnText}>
                {googleLoading ? '연결 중...' : 'Google로 계속하기'}
              </Text>
            </TouchableOpacity>

            <View style={styles.links}>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} activeOpacity={0.7}>
                <Text style={styles.linkText}>비밀번호 찾기</Text>
              </TouchableOpacity>
              <Text style={styles.linkDot}>·</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
                <Text style={styles.linkText}>회원가입</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    // 배경색은 theme.colors.primary.dark로 인라인 지정(토큰화)
  },
  safe: { flex: 1 },
  kav: { flex: 1, justifyContent: 'space-between' },

  // Decorative circles
  circleTopRight: {
    position: 'absolute',
    right: -50,
    top: 130,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  circleBottomLeft: {
    position: 'absolute',
    left: -40,
    bottom: 200,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // Hero
  hero: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    justifyContent: 'flex-start',
  },
  logo: { width: 158, height: 50 },
  tagline: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 38,
    marginTop: 28,
    letterSpacing: -0.3,
  },
  subTagline: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 12,
    lineHeight: 22,
  },

  // Glass card
  card: {
    marginHorizontal: 20,
    marginBottom: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 24,
    padding: 24,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: typography.fontSize.label,
    color: '#fff',
  },
  inputFocused: {
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  fieldError: {
    color: '#FF8A95',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 4,
  },
  loginBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 17,
    marginTop: 18,
    alignItems: 'center',
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: {
    // color는 theme.colors.primary.main으로 인라인 지정(토큰화)
    fontSize: 16,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 14,
    gap: 10,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    gap: 10,
  },
  linkText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
  linkDot: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 14,
  },
});

export default LoginScreen;
