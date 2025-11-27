import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore, { collection, query, where, onSnapshot, doc, deleteDoc, getDocs, writeBatch } from '@react-native-firebase/firestore';
import crashlytics from '@react-native-firebase/crashlytics';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const AdminPageScreen = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(firestore(), 'vehicles'), where('sellerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, snapshot => {
      const vehicleList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));
      setVehicles(vehicleList);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteVehicle = async (vehicleId) => {
    try {
      await deleteDoc(doc(firestore(), 'vehicles', vehicleId));
      setVehicles(prev => prev.filter(vehicle => vehicle.id !== vehicleId)); // 🔥 이 줄 추가!
      Alert.alert('삭제 완료', '차량이 삭제되었습니다.');
    } catch (error) {
      Alert.alert('삭제 실패', error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();  // 이 줄만 있으면 자동으로 Login으로 이동됨
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
            if (!user) return;
            try {
              const q = query(collection(firestore(), 'vehicles'), where('sellerId', '==', user.uid));
              const querySnapshot = await getDocs(q);

              const batch = writeBatch(firestore());
              querySnapshot.forEach(documentSnapshot => {
                batch.delete(documentSnapshot.ref);
              });
              await batch.commit();

              await user.delete();
              Alert.alert('탈퇴 완료', '계정이 삭제되었습니다.');
              // AppNavigator will handle navigation to Login screen automatically
            } catch (error) {
              Alert.alert('탈퇴 실패', error.message);
            }
          },
        },
      ]
    );
  };

  const handleTestCrash = () => {
    Alert.alert(
      'Crashlytics 테스트',
      'Crashlytics 테스트를 위해 의도적으로 에러를 발생시키겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '테스트 실행',
          onPress: () => {
            crashlytics().log('User triggered test crash');
            crashlytics().setAttribute('test_type', 'manual_crash');

            const testError = new Error('Test crash from AdminPage for Crashlytics verification');
            crashlytics().recordError(testError);

            Alert.alert('테스트 완료', 'Crashlytics에 에러가 기록되었습니다. Firebase Console에서 확인하세요.');
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

      {__DEV__ && (
        <TouchableOpacity style={styles.testCrashButton} onPress={handleTestCrash}>
          <Text style={styles.testCrashButtonText}>🧪 Crashlytics 테스트</Text>
        </TouchableOpacity>
      )}
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
  testCrashButton: {
    marginTop: 20,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    backgroundColor: '#ff9800',
    borderWidth: 1,
    borderColor: '#f57c00',
  },
  testCrashButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default AdminPageScreen;
