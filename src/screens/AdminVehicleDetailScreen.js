import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatPrice, formatPhone } from '../utils/format';

const { width } = Dimensions.get('window');

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
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >
        <Image source={{ uri: vehicle.imageUrl }} style={styles.image} />
        <Text style={styles.title}>[{vehicle.vehicleType || '승용차'}] {vehicle.vehicleName}</Text>
        <Text style={styles.subTitle}>{vehicle.subModel}</Text>

        <View style={styles.infoCard}><Text style={styles.infoTitle}>제조사</Text><Text>{vehicle.manufacturer}</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>연식</Text><Text>{vehicle.year}</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>연료 종류</Text><Text>{vehicle.fuelType}</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>변속기</Text><Text>{vehicle.transmission}</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>구동 방식</Text><Text>{vehicle.driveType}</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>배기량</Text><Text>{vehicle.cc} cc</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>연비</Text><Text>{vehicle.fuelEco} km/L</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>연료탱크 용량</Text><Text>{vehicle.fuelTank} L</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>가격</Text><Text>{formatPrice(vehicle.price)}</Text></View>

        <Text style={styles.sectionTitle}>부품 정보</Text>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>앞 타이어</Text><Text>{vehicle.frontTire}</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>뒤 타이어</Text><Text>{vehicle.rearTire}</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>엔진 오일 용량</Text><Text>{vehicle.engineOilLiter} L</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>와이퍼 정보</Text><Text>{vehicle.wiperInfo}</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>배터리 모델</Text><Text>{vehicle.battery}</Text></View>

        <Text style={styles.sectionTitle}>등록자 정보</Text>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>이름</Text><Text>{vehicle.sellerName}</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>전화번호</Text><Text>{formatPhone(vehicle.sellerPhone)}</Text></View>
        <View style={styles.infoCard}><Text style={styles.infoTitle}>이메일</Text><Text>{vehicle.sellerEmail}</Text></View>
      </ScrollView>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>뒤로 가기</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  image: {
    width: width - 40,
    height: undefined,
    aspectRatio: 16 / 9,
    marginBottom: 20,
    borderRadius: 10,
    resizeMode: 'cover',
    alignSelf: 'center',
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#333' },
  subTitle: { fontSize: 18, fontWeight: '600', color: '#666', marginBottom: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: '#2B4593' },
  infoCard: {
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoTitle: { fontSize: 16, fontWeight: '600', color: '#555', flex: 1 },
  backButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    backgroundColor: '#2B4593',
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default AdminVehicleDetailScreen;