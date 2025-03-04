import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
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

      <TextInput
        style={styles.input}
        placeholder="이메일 입력"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={[styles.input, styles.passwordInput]}  // 비밀번호 입력창 스타일 수정
        placeholder="비밀번호 입력"
        placeholderTextColor="#aaa"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.buttonContainer}>
        {/* 로그인 버튼 */}
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>로그인</Text>
        </TouchableOpacity>

        {/* 회원가입 버튼 */}
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerButton}>회원가입</Text>
        </TouchableOpacity>
      </View>
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
    width: 170,  // 로고 크기
    height: 170, // 로고 크기
    resizeMode: 'contain', // 로고 비율 유지
    marginBottom: 3, // 로고 아래 여백 추가
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
    borderColor: '#2B4593',
    borderRadius: 8,
    paddingLeft: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  passwordInput: {
    color: 'black',  // 비밀번호 텍스트 색상 설정 (검은색으로 변경)
  },
  buttonContainer: {
    flexDirection: 'column', // 세로로 배치
    justifyContent: 'center', // 수평 중앙 정렬
    alignItems: 'center', // 수직 중앙 정렬
    width: '100%', // 버튼들이 전체 너비를 사용
    marginTop: 20, // 버튼과 입력창 사이에 여백 추가
  },
  loginButton: {
    width: '30%', // 로그인 버튼 너비 조정
    height: 30,
    borderWidth: 1,
    borderColor: '#2B4593',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10, // 로그인 버튼과 회원가입 버튼 사이에 여백 추가
  },
  loginButtonText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#2B4593',  // 텍스트 색상
  },
  registerButton: {
    fontSize: 16,
    textDecorationLine: 'underline', // 밑줄 추가
    color: '#aaa',  // 연한 회색으로 텍스트 색상 변경
  },
});

export default LoginScreen;
