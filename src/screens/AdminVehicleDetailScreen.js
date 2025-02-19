import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Button } from 'react-native';
import firestore from '@react-native-firebase/firestore';

const AdminVehicleDetailScreen = ({ route, navigation }) => {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState(null);
  const [favoritedUsers, setFavoritedUsers] = useState([]);
  const [owner, setOwner] = useState(null);

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      try {
        // 차량 정보 불러오기
        const vehicleDoc = await firestore().collection('vehicles').doc(vehicleId).get();
        if (vehicleDoc.exists) {
          setVehicle(vehicleDoc.data());
        }

        // 찜한 유저들 정보 불러오기
        const favoritesDoc = await firestore()
          .collection('vehicles')
          .doc(vehicleId)
          .collection('favorites')
          .get();

        const users = favoritesDoc.docs.map(doc => doc.data());
        setFavoritedUsers(users);

        // 차량 등록자 정보 불러오기
        const ownerId = vehicleDoc.data()?.ownerId;
        const ownerDoc = await firestore().collection('users').doc(ownerId).get();
        if (ownerDoc.exists) {
          setOwner(ownerDoc.data());
        }
      } catch (error) {
        console.error('차량 상세정보 불러오기 오류:', error);
      }
    };

    fetchVehicleDetails();
  }, [vehicleId]);

  if (!vehicle || !owner) {
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
      <Text>이미지: <Image source={{ uri: vehicle.imageUrl }} style={styles.image} /></Text>

      {/* 차량 등록자 정보 */}
      <View style={styles.section}>
        <Text style={styles.subtitle}>차량 등록자 정보</Text>
        <Text>이름: {owner.name}</Text>
        <Text>전화번호: {owner.phone}</Text>
        <Text>이메일: {owner.email}</Text>
      </View>

      {/* 찜한 유저 정보 */}
      <View style={styles.section}>
        <Text style={styles.subtitle}>찜한 유저들:</Text>
        <FlatList
          data={favoritedUsers}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.userItem}>
              <Text>이름: {item.name}</Text>
              <Text>전화번호: {item.phone}</Text>
              <Text>이메일: {item.email}</Text>
            </View>
          )}
        />
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
  userItem: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
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
