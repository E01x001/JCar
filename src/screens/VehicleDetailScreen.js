import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import firestore from '@react-native-firebase/firestore';

const VehicleDetailScreen = ({ route }) => {
  const { vehicleId } = route.params; // 차량 ID를 전달받습니다.
  const [vehicle, setVehicle] = useState(null);

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      try {
        const vehicleDoc = await firestore().collection('vehicles').doc(vehicleId).get();
        if (vehicleDoc.exists) {
          setVehicle(vehicleDoc.data());
        }
      } catch (error) {
        console.error('차량 상세정보 불러오기 오류:', error);
      }
    };

    fetchVehicleDetails();
  }, [vehicleId]);

  if (!vehicle) {
    return (
      <View style={styles.loadingContainer}>
        <Text>차량 정보를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: vehicle.imageUrl }} style={styles.image} />
      <Text style={styles.title}>{vehicle.vehicleName}</Text>
      <Text>제조사: {vehicle.manufacturer}</Text>
      <Text>연식: {vehicle.year}</Text>
      <Text>주행거리: {vehicle.mileage} km</Text>
      <Text>연료 종류: {vehicle.fuelType}</Text>
      <Text>변속기: {vehicle.transmission}</Text>
      <Text>가격: {vehicle.price} 만원</Text>
      <Text>위치: {vehicle.location}</Text>
      <Text>설명: {vehicle.description}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  image: {
    width: '100%',
    height: 300,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VehicleDetailScreen;
