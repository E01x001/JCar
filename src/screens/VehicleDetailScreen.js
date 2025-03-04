import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

const VehicleDetailScreen = ({ route, navigation }) => {
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

  const handleConsultationRequest = () => {
    navigation.navigate("ConsultationRequest", { vehicle });
  };

  const handleGoBack = () => {
    navigation.goBack();
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
        contentContainerStyle={{ paddingBottom: 50 }} // ✅ 하단 여유 공간 추가
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Image source={{ uri: vehicle.imageUrl }} style={styles.image} />
        <Text style={styles.title}>{vehicle.vehicleName}</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>제조사</Text>
          <Text>{vehicle.manufacturer}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>연식</Text>
          <Text>{vehicle.year}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>주행거리</Text>
          <Text>{vehicle.mileage} km</Text>
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
          <Text style={styles.infoTitle}>가격</Text>
          <Text>{vehicle.price} 만원</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>위치</Text>
          <Text>{vehicle.location}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>설명</Text>
          <Text>{vehicle.description}</Text>
        </View>

      </ScrollView>

      <TouchableOpacity style={styles.consultButton} onPress={handleConsultationRequest}>
        <Text style={styles.consultButtonText}>구매 상담 신청</Text>
      </TouchableOpacity>
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
    width: '100%',
    height: 250,
    marginBottom: 20,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    marginBottom: 15,
    padding: 15,
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
    color: '#333',
    flex: 1,
  },
  consultButton: {
    marginHorizontal: 20,
    marginBottom: 10, // ✅ 하단과 겹치지 않도록 추가 여백
    padding: 14,
    backgroundColor: '#007bff',
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
    backgroundColor: '#007bff',
    borderRadius: 50,
    zIndex: 1,
  },
});

export default VehicleDetailScreen;
