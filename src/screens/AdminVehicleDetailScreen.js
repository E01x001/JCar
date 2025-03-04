import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Button } from 'react-native';
import firestore from '@react-native-firebase/firestore';

const AdminVehicleDetailScreen = ({ route, navigation }) => {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState(null);
  const [owner, setOwner] = useState(null);

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      try {
        // 차량 정보 불러오기
        const vehicleDoc = await firestore().collection('vehicles').doc(vehicleId).get();
        if (vehicleDoc.exists) {
          const vehicleData = vehicleDoc.data();
          setVehicle(vehicleData);

          // // 차량 등록자 정보 불러오기
          // if (vehicleData.ownerId) {
          //   const ownerDoc = await firestore().collection('users').doc(vehicleData.ownerId).get();
          //   if (ownerDoc.exists) {
          //     setOwner(ownerDoc.data());
          //   }
          // }
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
      {/* 차량 정보 */}
      <Text style={styles.title}>{vehicle.vehicleName}</Text>
      <Text>제조사: {vehicle.manufacturer}</Text>
      <Text>연식: {vehicle.year}</Text>
      <Text>주행거리: {vehicle.mileage} km</Text>
      <Text>연료 종류: {vehicle.fuelType}</Text>
      <Text>변속기: {vehicle.transmission}</Text>
      <Text>가격: {vehicle.price} 만원</Text>
      <Text>위치: {vehicle.location}</Text>
      <Text>설명: {vehicle.description}</Text>

      {/* 차량 이미지 */}
      {vehicle.imageUrl ? (
        <Image source={{ uri: vehicle.imageUrl }} style={styles.image} />
      ) : (
        <Text>이미지 없음</Text>
      )}

      {/* 차량 등록자 정보 */}
      <View style={styles.section}>
        <Text style={styles.subtitle}>차량 등록자 정보</Text>
        <Text>이름: {vehicle.sellerName}</Text>
        <Text>전화번호: {vehicle.sellerPhone}</Text>
        <Text>이메일: {vehicle.sellerEmail}</Text>
      </View>

      {/* 뒤로 가기 버튼 */}
      <Button title="뒤로 가기" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  section: {
    marginBottom: 20,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdminVehicleDetailScreen;
