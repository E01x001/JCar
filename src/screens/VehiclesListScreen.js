import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, StyleSheet, Button, TouchableOpacity } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const VehiclesListScreen = () => {
  const [vehicles, setVehicles] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const user = auth().currentUser;

  // 🔥 Firestore에서 차량 목록 불러오기
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('vehicles')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const vehicleList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVehicles(vehicleList);
      });

    return () => unsubscribe();
  }, []);

  // 🔥 Firestore에서 찜한 차량 목록 가져오기
  useEffect(() => {
    if (user) {
      const unsubscribe = firestore()
        .collection('users')
        .doc(user.uid)
        .onSnapshot(doc => {
          if (doc.exists) {
            setFavorites(doc.data().favorites || []);
          }
        });

      return () => unsubscribe();
    }
  }, [user]);

  // ⭐ 차량 찜하기 / 찜 해제
  const toggleFavorite = async (vehicleId) => {
    const userRef = firestore().collection('users').doc(user.uid);

    if (favorites.includes(vehicleId)) {
      // 🚫 찜 해제
      await userRef.update({
        favorites: firestore.FieldValue.arrayRemove(vehicleId),
      });
    } else {
      // ⭐ 찜 추가
      await userRef.set(
        { favorites: firestore.FieldValue.arrayUnion(vehicleId) },
        { merge: true }
      );
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.vehicleContainer}>
      <Text style={styles.vehicleText}>🚗 모델: {item.model}</Text>
      <Text style={styles.vehicleText}>💰 가격: {item.price}</Text>
      <Text style={styles.vehicleText}>📌 상태: {item.status}</Text>
      <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
        <Text style={[styles.favoriteButton, favorites.includes(item.id) ? styles.favorited : null]}>
          {favorites.includes(item.id) ? '❤️ 찜 해제' : '🤍 찜하기'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList data={vehicles} renderItem={renderItem} keyExtractor={(item) => item.id} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  vehicleContainer: {
    padding: 10,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
  },
  vehicleText: {
    fontSize: 16,
  },
  favoriteButton: {
    marginTop: 8,
    padding: 8,
    borderRadius: 5,
    textAlign: 'center',
    backgroundColor: '#ddd',
  },
  favorited: {
    backgroundColor: 'red',
    color: 'white',
  },
});

export default VehiclesListScreen;
