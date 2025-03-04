import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import firestore from '@react-native-firebase/firestore';

const AdminVehiclesListScreen = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);

  // 차량 목록 불러오기
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const snapshot = await firestore().collection('vehicles').get();
        const vehiclesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVehicles(vehiclesData);
      } catch (error) {
        console.error('차량 목록 불러오기 오류:', error);
      }
    };

    fetchVehicles();
  }, []);

  // 차량 삭제 기능
  const handleDeleteVehicle = async (vehicleId) => {
    Alert.alert(
      "삭제 확인",
      "정말로 이 차량을 삭제하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await firestore().collection('vehicles').doc(vehicleId).delete();
              setVehicles(prevVehicles => prevVehicles.filter(vehicle => vehicle.id !== vehicleId));
              Alert.alert("삭제 완료", "차량이 삭제되었습니다.");
            } catch (error) {
              console.error("차량 삭제 오류:", error);
              Alert.alert("삭제 실패", "차량 삭제 중 문제가 발생했습니다.");
            }
          }
        }
      ]
    );
  };

  // 차량 목록 렌더링
  const renderVehicle = ({ item }) => (
    <View style={styles.vehicleItem}>
      <TouchableOpacity
        onPress={() => navigation.navigate('AdminVehicleDetail', { vehicleId: item.id })}
      >
        <Text style={styles.vehicleName}>{item.vehicleName}</Text>
        <Text>제조사: {item.manufacturer}</Text>
        <Text>가격: {item.price}만원</Text>
      </TouchableOpacity>

      {/* 삭제 버튼 */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteVehicle(item.id)}
      >
        <Text style={styles.deleteText}>삭제</Text>
      </TouchableOpacity>
    </View>
  );

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
    padding: 20,
    backgroundColor: "#fff",
  },
  vehicleItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: "red",
    padding: 8,
    borderRadius: 5,
  },
  deleteText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default AdminVehiclesListScreen;
