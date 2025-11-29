import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import auth from '@react-native-firebase/auth';
import crashlytics from '@react-native-firebase/crashlytics';
import { useTheme } from '../theme/ThemeProvider';
import Button from '../components/Button';
import InputField from '../components/InputField';

const LoginScreen = ({ navigation }) => {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await auth().signInWithEmailAndPassword(email, password);
    } catch (error) {
      crashlytics().recordError(error);
      crashlytics().log('LoginScreen: Login failed');
      alert('로그인 실패: ' + error.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />

      <View style={[styles.formContainer, { marginTop: theme.spacing.xl }]}>
        <InputField
          value={email}
          onChangeText={setEmail}
          placeholder="이메일 입력"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <InputField
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호 입력"
          secureTextEntry
        />

        <Button
          variant="primary"
          title="로그인"
          onPress={handleLogin}
          style={{ marginTop: theme.spacing.sm }}
        />

        <View style={styles.subActionsContainer}>
          <Button
            variant="text"
            title="비밀번호 찾기"
            onPress={() => navigation.navigate('ForgotPassword')}
          />
          <Button
            variant="text"
            title="회원가입"
            onPress={() => navigation.navigate('Register')}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
  formContainer: {
    width: '100%',
  },
  subActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
});

export default LoginScreen;
