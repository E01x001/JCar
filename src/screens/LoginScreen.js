import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Image } from 'react-native';
import auth from '@react-native-firebase/auth';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await auth().signInWithEmailAndPassword(email, password);
    } catch (error) {
      alert("로그인 실패: " + error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* 회사 로고 추가 */}
      <Image source={require('../assets/logo.png')} style={styles.logo} />

      <Text style={styles.title}>로그인</Text>

      <TextInput
        style={styles.input}
        placeholder="이메일 입력"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호 입력"
        placeholderTextColor="#aaa"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title="로그인" onPress={handleLogin} />
      <Button title="회원가입" onPress={() => navigation.navigate('Register')} color="gray" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center', // 가운데 정렬
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  logo: {
    width: 150,  // 로고 크기
    height: 150, // 로고 크기
    resizeMode: 'contain', // 로고 비율 유지
    marginBottom: 20, // 로고 아래 여백 추가
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    width: '100%', // 입력창 전체 너비 사용
    height: 50,
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 8,
    paddingLeft: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
});

export default LoginScreen;
