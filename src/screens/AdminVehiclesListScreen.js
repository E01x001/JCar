import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';
import firestore, { collection, getDocs } from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { formatPrice } from '../utils/format';

const AdminVehiclesListScreen = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);
  const [deletingVehicleId, setDeletingVehicleId] = useState(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const snapshot = await getDocs(collection(firestore(), 'vehicles'));
        const vehiclesData = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
        }));
        setVehicles(vehiclesData);
      } catch (error) {
        console.error('차량 목록 불러오기 오류:', error);
      }
    };

    fetchVehicles();
  }, []);

  const handleDeleteVehicle = async (vehicleId) => {
    Alert.alert(
      '긴급 삭제 확인',
      '정말로 이 차량을 삭제하시겠습니까?\n\n차량 문서와 모든 관련 이미지가 완전히 삭제되며, 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setDeletingVehicleId(vehicleId);
            try {
              // Firebase Function 호출
              const emergencyDeleteVehicleFunction = functions().httpsCallable('emergencyDeleteVehicle');
              const result = await emergencyDeleteVehicleFunction({ vehicleId });

              // UI에서 차량 제거
              setVehicles(prevVehicles => prevVehicles.filter(vehicle => vehicle.id !== vehicleId));

              Alert.alert(
                '삭제 완료',
                result.data.message + `\n삭제된 이미지: ${result.data.deletedImages}개`
              );
            } catch (error) {
              console.error('차량 삭제 오류:', error);

              let errorMessage = '차량 삭제 중 문제가 발생했습니다.';
              if (error.code === 'permission-denied') {
                errorMessage = '관리자 권한이 필요합니다.';
              } else if (error.code === 'not-found') {
                errorMessage = '차량을 찾을 수 없습니다.';
              } else if (error.message) {
                errorMessage = error.message;
              }

              Alert.alert('삭제 실패', errorMessage);
            } finally {
              setDeletingVehicleId(null);
            }
          },
        },
      ]
    );
  };

  const renderVehicle = ({ item }) => {
    const isDeleting = deletingVehicleId === item.id;

    return (
      <View style={styles.vehicleItem}>
        <TouchableOpacity
          style={styles.vehicleInfo}
          onPress={() => navigation.navigate('AdminVehicleDetail', { vehicleId: item.id })}
        >
          <Text style={styles.vehicleName}>
            [{item.vehicleType || '승용차'}] {item.vehicleName}
          </Text>
          <Text>제조사: {item.manufacturer}</Text>
          <Text>가격: {formatPrice(item.price)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
          onPress={() => handleDeleteVehicle(item.id)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.deleteText}>삭제</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={vehicles}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  vehicleItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
    marginRight: 10,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    padding: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  deleteText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

AdminVehiclesListScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

export default AdminVehiclesListScreen;
