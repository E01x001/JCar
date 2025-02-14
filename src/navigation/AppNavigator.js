import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const [code, setCode] = useState("");

  // 1️⃣ 전화번호 인증 코드 요청
  const sendVerificationCode = async () => {
    try {
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      setVerificationId(confirmation.verificationId);
      Alert.alert("인증 코드가 전송되었습니다.");
    } catch (error) {
      Alert.alert("전화번호 인증 실패", error.message);
    }
  };

  // 2️⃣ 인증 코드 확인
  const verifyCode = async () => {
    try {
      const credential = auth.PhoneAuthProvider.credential(verificationId, code);
      await auth().signInWithCredential(credential);
      Alert.alert("전화번호 인증 성공!");
    } catch (error) {
      Alert.alert("인증 코드가 올바르지 않습니다.");
    }
  };

  // 3️⃣ Firebase Authentication에 회원가입 & Firestore에 사용자 정보 저장
  const handleRegister = async () => {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Firestore에 사용자 정보 저장
      await firestore().collection("users").doc(user.uid).set({
        email: user.email,
        phoneNumber: phoneNumber,
      });

      Alert.alert("회원가입 성공! 로그인 해주세요.");
      navigation.replace("Login");
    } catch (error) {
      Alert.alert("회원가입 실패", error.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Email:</Text>
      <TextInput value={email} onChangeText={setEmail} style={{ borderBottomWidth: 1 }} />
      
      <Text>Password:</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry style={{ borderBottomWidth: 1 }} />
      
      <Text>Phone Number:</Text>
      <TextInput value={phoneNumber} onChangeText={setPhoneNumber} placeholder="+821012345678" style={{ borderBottomWidth: 1 }} />
      
      {verificationId ? (
        <>
          <Text>Enter Verification Code:</Text>
          <TextInput value={code} onChangeText={setCode} style={{ borderBottomWidth: 1 }} />
          <Button title="Verify Code" onPress={verifyCode} />
        </>
      ) : (
        <Button title="Send Verification Code" onPress={sendVerificationCode} />
      )}

      <Button title="회원가입" onPress={handleRegister} disabled={!verificationId} />
    </View>
  );
};

export default RegisterScreen;
