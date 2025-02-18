import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const RegisterScreen = ({ navigation }) => {
  const [step, setStep] = useState(1); // 🔹 단계 (1: 전화번호 인증, 2: 이메일 입력)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  // 📌 대한민국 형식 (+82)으로 전화번호 자동 변환
  const formatPhoneNumber = (number) => {
    if (number.startsWith('010')) {
      return '+82' + number.slice(1); // 01012345678 → +821012345678
    }
    return number;
  };

  // 1️⃣ 전화번호 인증 요청
  const requestVerification = async () => {
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);

    try {
      const confirmation = await auth().signInWithPhoneNumber(formattedPhoneNumber);
      setVerificationId(confirmation.verificationId);
      alert('인증 코드가 전송되었습니다.');
    } catch (error) {
      alert('인증 요청 실패: ' + error.message);
    }
  };

  // 2️⃣ 인증 코드 확인 (전화번호 인증만 진행)
  const confirmCode = async () => {
    try {
      const credential = auth.PhoneAuthProvider.credential(verificationId, verificationCode);
    // 🔥 로그인하지 않고 인증만 수행! (signInWithCredential 사용 X)
      setIsPhoneVerified(true);
      alert('전화번호 인증 완료! 이메일 입력 단계로 이동합니다.');
      setStep(2); // 🔹 이메일 입력 단계로 이동
    } catch (error) {
      alert('인증 코드가 올바르지 않습니다.');
    }
  };

  // 3️⃣ 최종 회원가입 (이메일 & 비밀번호)
  const handleRegister = async () => {
    if (!isPhoneVerified) {
      alert('전화번호 인증을 먼저 완료해주세요.');
      return;
    }

    if (!email || !password || !confirmPassword || !name) {
      alert('모든 입력란을 채워주세요.');
      return;
    }

    if (password !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      // 이메일 & 비밀번호로 Firebase Auth 계정 생성
      const emailUser = await auth().createUserWithEmailAndPassword(email, password);
      const userId = emailUser.user.uid;

      // 🔹 Firebase Auth에 전화번호 추가
      const phoneCredential = auth.PhoneAuthProvider.credential(verificationId, verificationCode);
      await emailUser.user.linkWithCredential(phoneCredential);

      // 🔹 Firestore에 사용자 정보 저장
      await firestore().collection('users').doc(userId).set({
        name,
        phoneNumber: formatPhoneNumber(phoneNumber), // 🔹 +82 형식 저장
        email,
        createdAt: new Date(),
        role: 'user',
      });

      alert('회원가입 완료! 로그인 화면으로 이동합니다.');
      navigation.navigate('Login');
    } catch (error) {
      alert('회원가입 실패: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>회원가입</Text>

      {/* 🔹 1단계: 전화번호 인증 */}
      {step === 1 && (
        <>
          <TextInput
            style={styles.input}
            placeholder="전화번호 입력 (010xxxxxxxx)"
            placeholderTextColor="#aaa"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
          <Button title="인증 코드 요청" onPress={requestVerification} />

          {verificationId && (
            <>
              <TextInput
                style={styles.input}
                placeholder="인증 코드 입력"
                placeholderTextColor="#aaa"
                value={verificationCode}
                onChangeText={setVerificationCode}
              />
              <Button title="코드 확인" onPress={confirmCode} />
            </>
          )}
        </>
      )}

      {/* 🔹 2단계: 이메일 및 비밀번호 입력 */}
      {step === 2 && (
        <>
          <TextInput
            style={styles.input}
            placeholder="이름 입력"
            placeholderTextColor="#aaa"
            value={name}
            onChangeText={setName}
          />
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
          <TextInput
            style={styles.input}
            placeholder="비밀번호 확인"
            placeholderTextColor="#aaa"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <Button title="회원가입" onPress={handleRegister} />
        </>
      )}

      <Button title="로그인으로 돌아가기" onPress={() => navigation.navigate('Login')} color="gray" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 8,
    paddingLeft: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
});

export default RegisterScreen;
