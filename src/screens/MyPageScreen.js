import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const MyPageScreen = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);
  const user = auth().currentUser;

  useEffect(() => {
    if (!user) return;
    const unsubscribe = firestore()
      .collection('vehicles')
      .where('sellerId', '==', user.uid)
      .onSnapshot(snapshot => {
        const vehicleList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVehicles(vehicleList);
      });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteVehicle = async (vehicleId) => {
    try {
      await firestore().collection('vehicles').doc(vehicleId).delete();
      Alert.alert('삭제 완료', '차량이 삭제되었습니다.');
    } catch (error) {
      Alert.alert('삭제 실패', error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('로그아웃 실패', error.message);
    }
  };

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
              const querySnapshot = await firestore()
                .collection('vehicles')
                .where('sellerId', '==', user.uid)
                .get();

              const batch = firestore().batch();
              querySnapshot.forEach(doc => batch.delete(doc.ref));
              await batch.commit();

              await user.delete();
              Alert.alert('탈퇴 완료', '계정이 삭제되었습니다.');
              navigation.replace('Login');
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
          <View style={styles.vehicleItem}>
            <Text style={styles.vehicleName}>모델: {item.model}</Text>
            <Text>가격: {item.price}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteVehicle(item.id)}>
              <Text style={styles.deleteButtonText}>삭제</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.buttonText}>로그아웃</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
        <Text style={styles.buttonText}>회원탈퇴</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  userInfo: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
  },
  vehicleItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  deleteButton: {
    marginTop: 10,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B4593',
  },
  deleteButtonText: {
    color: '#2B4593',
    fontWeight: 'bold',
  },
  logoutButton: {
    marginTop: 10,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B4593', // 포인트 색상 사용
  },
  deleteAccountButton: {
    marginTop: 10,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B4593', // 탈퇴 버튼에 붉은색 테두리
  },
  buttonText: {
    color: '#2B4593',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default MyPageScreen;
