import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, Alert, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const AdminPageScreen = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);
  const user = auth().currentUser;

  // 🔥 내가 등록한 차량 가져오기
  useEffect(() => {
    if (!user) return;
    const unsubscribe = firestore()
      .collection('vehicles')
      .where('sellerId', '==', user.uid) // 현재 로그인한 유저의 차량만 가져옴
      .onSnapshot(snapshot => {
        const vehicleList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVehicles(vehicleList);
      });

    return () => unsubscribe();
  }, [user]);

  // 🚗 차량 삭제 기능
  const handleDeleteVehicle = async (vehicleId) => {
    try {
      await firestore().collection('vehicles').doc(vehicleId).delete();
      Alert.alert('삭제 완료', '차량이 삭제되었습니다.');
    } catch (error) {
      Alert.alert('삭제 실패', error.message);
    }
  };

  // 🔓 로그아웃 기능
  const handleLogout = async () => {
    try {
      await auth().signOut();
      navigation.replace('Login'); // 로그인 화면으로 이동
    } catch (error) {
      Alert.alert('로그아웃 실패', error.message);
    }
  };

  // ❌ 회원탈퇴 기능
  const handleDeleteAccount = async () => {
    Alert.alert(
      '회원탈퇴',
      '정말로 회원탈퇴 하시겠습니까? 계정이 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('vehicles')
                .where('sellerId', '==', user.uid)
                .get()
                .then(querySnapshot => {
                  querySnapshot.forEach(doc => {
                    doc.ref.delete(); // 유저가 등록한 차량 삭제
                  });
                });

              await user.delete(); // Firebase Authentication 계정 삭제
              Alert.alert('탈퇴 완료', '계정이 삭제되었습니다.');
              navigation.replace('Login'); // 로그인 화면으로 이동
            } catch (error) {
              Alert.alert('탈퇴 실패', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>마이페이지</Text>
      <Text style={styles.userInfo}>이메일: {user?.email}</Text>

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.vehicleContainer}>
            <Text>모델: {item.model}</Text>
            <Text>가격: {item.price}</Text>
            <Button title="삭제" onPress={() => handleDeleteVehicle(item.id)} />
          </View>
        )}
      />

      <Button title="로그아웃" onPress={handleLogout} />
      <Button title="회원탈퇴" color="red" onPress={handleDeleteAccount} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  userInfo: {
    fontSize: 16,
    marginBottom: 20,
  },
  vehicleContainer: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: 'gray',
    marginBottom: 10,
  },
});

export default AdminPageScreen;
