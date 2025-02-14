import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import auth from "@react-native-firebase/auth";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await auth().signInWithEmailAndPassword(email, password);
      Alert.alert("로그인 성공!");
      navigation.replace("Home");
    } catch (error) {
      Alert.alert("로그인 실패", error.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Email:</Text>
      <TextInput value={email} onChangeText={setEmail} style={{ borderBottomWidth: 1 }} />
      <Text>Password:</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry style={{ borderBottomWidth: 1 }} />
      <Button title="로그인" onPress={handleLogin} />
      <Button title="회원가입" onPress={() => navigation.navigate("Register")} />
    </View>
  );
};

export default LoginScreen;
