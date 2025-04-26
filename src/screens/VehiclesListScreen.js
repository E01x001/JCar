import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { formatPrice } from '../utils/format';

const VehiclesListScreen = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('vehicles')
      .onSnapshot((snapshot) => {
        const vehiclesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVehicles(vehiclesData);
      }, (error) => {
        console.error('차량 목록 불러오기 오류:', error);
      });

    return () => unsubscribe();
  }, []);

  const renderVehicle = ({ item }) => (
    <TouchableOpacity
      style={styles.vehicleItem}
      onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
    >
      <Text style={styles.vehicleName}>
        [{item.vehicleType || '승용차'}] {item.vehicleName}
      </Text>
      <Text>{item.manufacturer}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={vehicles}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  vehicleItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default VehiclesListScreen;
