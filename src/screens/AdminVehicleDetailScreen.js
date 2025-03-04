import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Button } from 'react-native';
import firestore from '@react-native-firebase/firestore';

const AdminVehicleDetailScreen = ({ route, navigation }) => {
  const { vehicleId } = route.params;
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
      {/* 차량 정보 */}
      <Text style={styles.title}>{vehicle.vehicleName}</Text>
      <Text style={styles.subTitle}>{vehicle.subModel}</Text>
      <Text>제조사: {vehicle.manufacturer}</Text>
      <Text>연식: {vehicle.year}</Text>
      <Text>구동 방식: {vehicle.driveType}</Text>
      <Text>연료 종류: {vehicle.fuelType}</Text>
      <Text>가격: {parseInt(vehicle.price).toLocaleString()} 원</Text>
      <Text>배기량: {vehicle.cc} cc</Text>
      <Text>변속기: {vehicle.transmission}</Text>
      <Text>연비: {vehicle.fuelEco} km/L</Text>
      <Text>연료탱크 용량: {vehicle.fuelTank} L</Text>

      {/* 차량 번호 및 소유자 정보 */}
      <View style={styles.section}>
        <Text style={styles.subtitle}>차량 등록 정보</Text>
        <Text>차량번호: {vehicle.regiNumber}</Text>
        <Text>소유자명: {vehicle.ownerName}</Text>
      </View>

      {/* 차량 부품 정보 */}
      <View style={styles.section}>
        <Text style={styles.subtitle}>부품 정보</Text>
        <Text>앞 타이어: {vehicle.frontTire}</Text>
        <Text>뒤 타이어: {vehicle.rearTire}</Text>
        <Text>엔진 오일 용량: {vehicle.engineOilLiter} L</Text>
        <Text>와이퍼 정보: {vehicle.wiperInfo}</Text>
        <Text>배터리 모델: {vehicle.battery}</Text>
      </View>

      {/* 차량 등록자 정보 */}
      <View style={styles.section}>
        <Text style={styles.subtitle}>등록자 정보</Text>
        <Text>이름: {vehicle.sellerName}</Text>
        <Text>전화번호: {vehicle.sellerPhone}</Text>
        <Text>이메일: {vehicle.sellerEmail}</Text>
      </View>

      {/* 차량 이미지 */}
      {vehicle.imageUrl ? (
        <Image source={{ uri: vehicle.imageUrl }} style={styles.image} />
      ) : (
        <Text>이미지 없음</Text>
      )}

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
  subTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'gray',
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
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  image: {
    width: 300,
    height: 200,
    marginVertical: 20,
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdminVehicleDetailScreen;
