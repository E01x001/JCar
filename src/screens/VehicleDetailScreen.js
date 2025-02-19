import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Ionicons from 'react-native-vector-icons/Ionicons'; // 아이콘 사용

const VehicleDetailScreen = ({ route, navigation }) => {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState(null);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      try {
        const vehicleDoc = await firestore().collection('vehicles').doc(vehicleId).get();
        if (vehicleDoc.exists) {
          setVehicle(vehicleDoc.data());

          // 차량 찜 상태 확인 (현재 로그인된 사용자)
          const user = auth().currentUser;
          if (user && vehicleDoc.data().likedBy.includes(user.uid)) {
            setIsLiked(true);
          }
        }
      } catch (error) {
        console.error('차량 상세정보 불러오기 오류:', error);
      }
    };

    fetchVehicleDetails();
  }, [vehicleId]);

  // 찜하기 기능
  const handleLikeToggle = async () => {
    const user = auth().currentUser;
    if (user) {
      try {
        const vehicleRef = firestore().collection('vehicles').doc(vehicleId);

        if (isLiked) {
          // 찜 취소
          await vehicleRef.update({
            likedBy: firestore.FieldValue.arrayRemove(user.uid),
          });
          setIsLiked(false);
        } else {
          // 찜하기
          await vehicleRef.update({
            likedBy: firestore.FieldValue.arrayUnion(user.uid),
          });
          setIsLiked(true);
        }
      } catch (error) {
        console.error('찜하기 오류:', error);
      }
    }
  };

  // 뒤로가기 버튼 클릭 시 Stack을 지우고 이전 화면으로 이동
  const handleGoBack = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Vehicles' }], // 원하는 화면으로 설정
    });
  };

  if (!vehicle) {
    return (
      <View style={styles.loadingContainer}>
        <Text>차량 정보를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
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

      <TouchableOpacity
        style={[styles.likeButton, isLiked ? styles.liked : null]}
        onPress={handleLikeToggle}
      >
        <Text style={styles.likeButtonText}>{isLiked ? '찜 취소' : '찜하기'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // 화면 크기에 맞게 크기 조정
    padding: 20,
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: 250, // 이미지 크기 적당히 조정
    marginBottom: 20,
    borderRadius: 10,
    resizeMode: 'cover', // 이미지가 영역에 맞게 잘리도록 설정
  },
  title: {
    fontSize: 26, // 글씨 크기 커짐
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
    flexDirection: 'row', // 항목을 가로로 배치
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  likeButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#ff6f61',
    borderRadius: 8,
    alignItems: 'center',
  },
  likeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  liked: {
    backgroundColor: '#4caf50',
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
