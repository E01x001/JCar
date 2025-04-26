import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { AuthContext } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatPhone, formatPrice } from '../utils/format';

const MyPageScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [vehicles, setVehicles] = useState([]);
  const [consultations, setConsultations] = useState([]);

  useEffect(() => {
    if (!user) return;

    const unsubscribeVehicles = firestore()
      .collection('vehicles')
      .where('sellerId', '==', user.uid)
      .onSnapshot(snapshot => {
        const vehicleList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVehicles(vehicleList);
      });

      const unsubscribeConsultations = firestore()
      .collection('consultation_requests')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc') // ✅ 최신순 추가
      .onSnapshot(snapshot => {
        const consultationList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setConsultations(consultationList);
      });

    return () => {
      unsubscribeVehicles();
      unsubscribeConsultations();
    };
  }, [user]);

  const handleNavigateToVehicleDetail = (vehicleId) => {
    navigation.navigate("VehicleDetail", { vehicleId });
  };

  const renderStatus = (status) => {
    let color = '#6c757d';
    let icon = 'hourglass-empty';
    let label = '대기중';
  
    if (status === 'approved') {
      color = '#28a745';
      icon = 'check-circle';
      label = '승인됨';
    } else if (status === 'rejected') {
      color = '#dc3545';
      icon = 'cancel';
      label = '거절됨';
    }
  
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <Icon name={icon} size={18} color={color} style={{ marginRight: 6 }} />
        <Text style={{ color, fontWeight: 'bold' }}>{label}</Text>
      </View>
    );
  };
  

  const handleDeleteVehicle = async (vehicleId) => {
    try {
      await firestore().collection('vehicles').doc(vehicleId).delete();
      setVehicles(prev => prev.filter(vehicle => vehicle.id !== vehicleId));
      Alert.alert('삭제 완료', '차량이 삭제되었습니다.');
    } catch (error) {
      Alert.alert('삭제 실패', error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
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

      <Text style={styles.sectionTitle}>내 차량</Text>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleNavigateToVehicleDetail(item.id)}>
            <View style={styles.vehicleItem}>
              <Text style={styles.vehicleName}>모델: {item.model}</Text>
              <Text>가격: {formatPrice(item.price)}</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteVehicle(item.id)}>
                <Text style={styles.deleteButtonText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.sectionTitle}>상담 요청 내역</Text>
      <FlatList
        data={consultations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleNavigateToVehicleDetail(item.vehicleId)}>
            <View style={styles.consultItem}>
              <Text style={styles.consultText}>차량명: {item.vehicleName}</Text>
              <Text style={styles.consultText}>일정: {item.preferredDate} {item.preferredTime}</Text>
              {renderStatus(item.status)}
            </View>
          </TouchableOpacity>
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
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  userInfo: { fontSize: 16, color: '#555', marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  vehicleItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  vehicleName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  deleteButton: {
    marginTop: 10,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B4593',
  },
  deleteButtonText: { color: '#2B4593', fontWeight: 'bold' },
  consultItem: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  consultText: { fontSize: 16, color: '#333', marginBottom: 5 },
  logoutButton: {
    marginTop: 10,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B4593',
  },
  deleteAccountButton: {
    marginTop: 10,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B4593',
  },
  buttonText: {
    color: '#2B4593',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default MyPageScreen;