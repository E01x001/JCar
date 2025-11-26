import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { firebaseFunctions } from '../firebase/firebaseConfig'; // 수정된 import

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const isValidPassword = (password) => /^(?=.*[a-z])(?=.*\d).{8,}$/.test(password);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !name || !phoneNumber) {
      Alert.alert('오류', '모든 입력란을 채워주세요.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!isValidPassword(password)) {
      Alert.alert('오류', '비밀번호는 8자 이상이며, 소문자와 숫자를 포함해야 합니다.');
      return;
    }

    try {
      // RNFirebase Functions 호출 방식 (핵심 수정)
      const registerUser = firebaseFunctions.httpsCallable('registerUser');

      const result = await registerUser({ email, password, name, phoneNumber });
      console.log('[DEBUG] registerUser result:', result.data);

      Alert.alert('회원가입 완료', '로그인 화면으로 이동합니다.');
      navigation.navigate('Login');

    } catch (error) {
      console.error('--- registerUser Cloud Function Error ---');
      console.error(error);

      const errorMsg = error?.code
        ? `${error.code}: ${error.message}`
        : error?.message || '알 수 없는 오류가 발생했습니다.';
      Alert.alert('회원가입 실패', errorMsg);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>회원가입</Text>

      <TextInput
        style={styles.input}
        placeholder="이름 입력"
        placeholderTextColor="#aaa"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="전화번호 입력 (예: 01012345678)"
        placeholderTextColor="#aaa"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="이메일 입력"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호 입력 (8자 이상, 소문자+숫자 포함)"
        placeholderTextColor="#aaa"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호 확인"
        placeholderTextColor="#aaa"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      <Button title="회원가입" onPress={handleRegister} />

      <View style={{ marginTop: 20 }}>
        <Button title="로그인으로 돌아가기" onPress={() => navigation.navigate('Login')} color="gray" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 20, 
    backgroundColor: '#f8f9fa' 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 20 
  },
  input: { 
    height: 50, 
    borderWidth: 1, 
    borderColor: '#007bff', 
    borderRadius: 8, 
    paddingLeft: 10, 
    marginBottom: 10, 
    backgroundColor: '#fff', 
    fontSize: 16 
  },
});

export default RegisterScreen;
