import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Text, StyleSheet, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); // 로딩 상태 추가

  // 로그인 상태 확인
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        await AsyncStorage.setItem('user', JSON.stringify(user));
        navigation.replace('Home'); // 로그인 유지 후 홈 화면 이동
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 이메일과 비밀번호로 로그인
  const handleLogin = async () => {
    try {
      setLoading(true);
      await auth().signInWithEmailAndPassword(email, password);
    } catch (e) {
      setError(mapAuthError(e.code)); // 에러 메시지 변환
      setLoading(false);
    }
  };

  // Firebase 에러 메시지를 한글로 변환
  const mapAuthError = (errorCode) => {
    const errorMessages = {
      'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
      'auth/user-disabled': '이 계정은 비활성화되었습니다.',
      'auth/user-not-found': '가입되지 않은 이메일입니다.',
      'auth/wrong-password': '비밀번호가 틀렸습니다.',
    };
    return errorMessages[errorCode] || '로그인에 실패했습니다.';
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" style={styles.loading} />;
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Button title="Login" onPress={handleLogin} />
      <Button title="Go to Register" onPress={() => navigation.navigate('Register')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingLeft: 8,
  },
  errorText: {
    color: 'red',
    marginBottom: 12,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoginScreen;
