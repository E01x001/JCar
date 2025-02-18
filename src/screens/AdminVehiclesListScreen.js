import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, Button, Alert, StyleSheet } from 'react-native';
import firestore from '@react-native-firebase/firestore';

const AdminVehiclesListScreen = () => {
  const [vehicles, setVehicles] = useState([]);

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

  const deleteVehicle = async (vehicleId) => {
    Alert.alert(
      "차량 삭제",
      "이 차량을 삭제하시겠습니까?",
      [
        {
          text: "취소",
          style: "cancel"
        },
        {
          text: "삭제",
          onPress: async () => {
            await firestore().collection('vehicles').doc(vehicleId).delete();
            Alert.alert("삭제 완료", "차량이 삭제되었습니다.");
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.vehicleContainer}>
      <Text style={styles.vehicleText}>모델: {item.model}</Text>
      <Text style={styles.vehicleText}>가격: {item.price}</Text>
      <Text style={styles.vehicleText}>연식: {item.year}</Text>
      <Text style={styles.vehicleText}>판매자: {item.sellerId}</Text>
      <Button title="삭제" onPress={() => deleteVehicle(item.id)} color="red" />
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

export default AdminVehiclesListScreen;
