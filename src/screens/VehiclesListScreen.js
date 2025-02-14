import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import firestore from '@react-native-firebase/firestore';

const VehiclesListScreen = () => {
  const [vehicles, setVehicles] = useState([]);

  // Firestore에서 차량 목록을 실시간으로 가져오는 코드
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('vehicles')
      .orderBy('createdAt', 'desc')  // 최신 차량이 위에 나오도록
      .onSnapshot(snapshot => {
        const vehicleList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVehicles(vehicleList);  // 차량 목록을 상태에 저장
      });

    return () => unsubscribe();  // 컴포넌트 언마운트 시 구독 해제
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.vehicleContainer}>
      <Text style={styles.vehicleText}>모델: {item.model}</Text>
      <Text style={styles.vehicleText}>가격: {item.price}</Text>
      <Text style={styles.vehicleText}>상태: {item.status}</Text>
      <Text style={styles.vehicleText}>판매자: {item.sellerName}</Text>
      <Text style={styles.vehicleText}>전화번호: {item.sellerPhone}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={vehicles}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />
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
});

export default VehiclesListScreen;
