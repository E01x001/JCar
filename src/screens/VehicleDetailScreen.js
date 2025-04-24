import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth'; // auth 추가
import { formatPrice } from '../utils/format';

const { width } = Dimensions.get('window');

const VehicleDetailScreen = ({ route, navigation }) => {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState(null);
  const [isOwnVehicle, setIsOwnVehicle] = useState(false); // 본인 차량 여부 상태 추가

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      try {
        const vehicleDoc = await firestore().collection('vehicles').doc(vehicleId).get();
        if (vehicleDoc.exists) {
          const vehicleData = vehicleDoc.data();
          setVehicle(vehicleData);

          // 로그인한 사용자와 판매자 UID 비교
          const currentUser = auth().currentUser;
          if (currentUser && currentUser.uid === vehicleData.sellerId) {
            setIsOwnVehicle(true); // 본인이 등록한 차량인 경우
          }
        }
      } catch (error) {
        console.error('차량 상세정보 불러오기 오류:', error);
      }
    };

    fetchVehicleDetails();
  }, [vehicleId]);

  const handleConsultationRequest = () => {
    navigation.navigate("ConsultationRequest", { vehicle });
  };

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
        {/* 차량 이미지 */}
        <Image source={{ uri: vehicle.imageUrl }} style={styles.image} />
        <Text style={styles.title}>{vehicle.vehicleName}</Text>
        <Text style={styles.subTitle}>{vehicle.subModel}</Text>

        {/* 차량 기본 정보 */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>제조사</Text>
          <Text>{vehicle.manufacturer}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>연식</Text>
          <Text>{vehicle.year}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>연료 종류</Text>
          <Text>{vehicle.fuelType}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>변속기</Text>
          <Text>{vehicle.transmission}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>구동 방식</Text>
          <Text>{vehicle.driveType}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>배기량</Text>
          <Text>{vehicle.cc} cc</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>연비</Text>
          <Text>{vehicle.fuelEco} km/L</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>연료탱크 용량</Text>
          <Text>{vehicle.fuelTank} L</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>가격</Text>
          <Text>{formatPrice(vehicle.price)}</Text>

        </View>

        {/* 차량 부품 정보 */}
        <Text style={styles.sectionTitle}>부품 정보</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>앞 타이어</Text>
          <Text>{vehicle.frontTire}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>뒤 타이어</Text>
          <Text>{vehicle.rearTire}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>엔진 오일 용량</Text>
          <Text>{vehicle.engineOilLiter} L</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>와이퍼 정보</Text>
          <Text>{vehicle.wiperInfo}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>배터리 모델</Text>
          <Text>{vehicle.battery}</Text>
        </View>

      </ScrollView>

      {/* 본인이 등록한 차량이면 상담 신청 버튼 숨기기 */}
      {!isOwnVehicle && (
        <TouchableOpacity 
          style={styles.consultButton}
          onPress={handleConsultationRequest}
        >
          <Text style={styles.consultButtonText}>구매 상담 신청</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  image: {
    width: width - 40,
    height: undefined,
    aspectRatio: 16 / 9,
    marginBottom: 20,
    borderRadius: 10,
    resizeMode: 'cover',
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  subTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#2B4593',
  },
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
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    flex: 1,
  },
  consultButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    backgroundColor: '#2B4593',
    borderRadius: 8,
    alignItems: 'center',
  },
  consultButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
    backgroundColor: '#2B4593',
    borderRadius: 50,
    zIndex: 1,
  },
});

export default VehicleDetailScreen;
