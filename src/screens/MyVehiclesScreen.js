import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { fetchMyVehicles, subscribeVehicles } from '../services/vehicle/supabaseVehicleService';
import { AuthContext } from '../context/AuthContext';
import { typography } from '../theme/typography';

const MyVehiclesScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    if (!user) {return () => {};}

    const unsubscribe = subscribeVehicles(
      () => fetchMyVehicles(user.uid),
      setVehicles,
      { channelKey: 'my-vehicles' }
    );

    return () => unsubscribe();
  }, [user]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
    >
      <Text style={styles.name}>[{item.vehicleType || '승용차'}] {item.vehicleName}</Text>
      <Text>{item.status === 'approved' ? '승인됨' : '승인 대기 중'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 차량 목록</Text>
      <FlatList
        data={vehicles}
        keyExtractor={item => item.id}
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: typography.fontSize.heroTitle, fontWeight: 'bold', marginBottom: 10 },
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#ccc' },
  name: { fontSize: 18, fontWeight: 'bold' },
});

export default MyVehiclesScreen;
