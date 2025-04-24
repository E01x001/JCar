import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';


const HomeScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext); // 현재 로그인한 사용자 정보

  // 로그아웃 처리
  const handleLogout = () => {
    auth()
      .signOut()
      .then(() => {
        navigation.replace('Login'); // 로그아웃 후 로그인 화면으로 이동
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome, {currentUser?.email}</Text> {/* 로그인한 사용자의 이메일을 표시 */}
      <Button title="Logout" onPress={handleLogout} /> {/* 로그아웃 버튼 */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  welcomeText: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export default HomeScreen;
