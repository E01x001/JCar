import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const RegisterScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  // ✅ 인증용 전화번호 포맷 (국제전화 형식)
  const formatPhoneNumberToE164 = (number) => {
    if (number.startsWith('0')) {
      return '+82' + number.slice(1);
    }
    return number;
  };

  // ✅ 중복 체크는 사용자가 입력한 010 형식으로 수행
  const checkPhoneNumberExists = async (rawPhoneNumber) => {
    const querySnapshot = await firestore()
      .collection('users')
      .where('phoneNumber', '==', rawPhoneNumber)
      .get();

    return !querySnapshot.empty;
  };

  const requestVerification = async () => {
    try {
      if (await checkPhoneNumberExists(phoneNumber)) {
        Alert.alert('가입 불가', '이미 가입된 전화번호입니다.');
        return;
      }

      const formatted = formatPhoneNumberToE164(phoneNumber); // 인증용
      const confirmation = await auth().signInWithPhoneNumber(formatted);
      setVerificationId(confirmation.verificationId);
      Alert.alert('인증 코드가 전송되었습니다.');
      await auth().signOut();
    } catch (error) {
      Alert.alert('인증 요청 실패', error.message);
    }
  };

  const confirmCode = async () => {
    if (!verificationId || !verificationCode) {
      Alert.alert('오류', '인증 코드를 입력하세요.');
      return;
    }

    try {
      const credential = auth.PhoneAuthProvider.credential(verificationId, verificationCode);
      setIsPhoneVerified(true);
      Alert.alert('전화번호 인증 완료', '이메일 입력 단계로 이동합니다.');
      setStep(2);
    } catch (error) {
      Alert.alert('오류', '인증 코드가 올바르지 않습니다.');
    }
  };

  const checkEmailExists = async (email) => {
    try {
      const methods = await auth().fetchSignInMethodsForEmail(email);
      return methods.length > 0;
    } catch (error) {
      return false;
    }
  };

  const isValidPassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(password);
  };

  const handleRegister = async () => {
    if (!isPhoneVerified) {
      Alert.alert('오류', '전화번호 인증을 먼저 완료해주세요.');
      return;
    }

    if (!email || !password || !confirmPassword || !name) {
      Alert.alert('오류', '모든 입력란을 채워주세요.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!isValidPassword(password)) {
      Alert.alert('오류', '비밀번호는 최소 8자 이상이며, 대문자, 소문자, 숫자를 포함해야 합니다.');
      return;
    }

    if (await checkEmailExists(email)) {
      Alert.alert('오류', '이미 존재하는 이메일입니다.');
      return;
    }

    try {
      const emailUser = await auth().createUserWithEmailAndPassword(email, password);
      const userId = emailUser.user.uid;

      const phoneCredential = auth.PhoneAuthProvider.credential(verificationId, verificationCode);
      await emailUser.user.linkWithCredential(phoneCredential);

      await firestore().collection('users').doc(userId).set({
        name,
        phoneNumber,  // 🔥 DB에는 010 형식 그대로 저장
        email,
        createdAt: firestore.FieldValue.serverTimestamp(),
        role: 'user',
      });

      Alert.alert('회원가입 완료', '로그인 화면으로 이동합니다.');
      navigation.goBack('Login');
    } catch (error) {
      Alert.alert('회원가입 실패', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>회원가입</Text>

      {step === 1 && (
        <>
          <TextInput
            style={styles.input}
            placeholder="전화번호 입력 (예: 01012345678)"
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
                value={verificationCode}
                onChangeText={setVerificationCode}
              />
              <Button title="코드 확인" onPress={confirmCode} />
            </>
          )}
        </>
      )}

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
            placeholder="비밀번호 입력 (8자 이상, 대/소문자+숫자)"
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
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { height: 50, borderWidth: 1, borderColor: '#007bff', borderRadius: 8, paddingLeft: 10, marginBottom: 10, backgroundColor: '#fff' },
});

export default RegisterScreen;
