import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import Card from '../../../components/Card';
import Badge from '../../../components/Badge';
import StateScreen from '../../../components/StateScreen';

const MyVehiclesTab = ({ vehicles, onNavigateToVehicle }) => {
  const theme = useTheme();

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => onNavigateToVehicle(item.id)}>
      <Card style={{ marginBottom: theme.spacing.sm }}>
        <View style={styles.vehicleRow}>
          <Badge status="completed" label={item.vehicleType ?? '차량'} />
          <Text style={[styles.vehicleName, {
            fontSize: theme.typography.fontSize.body,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.text.primary,
            marginLeft: theme.spacing.sm,
          }]}>{item.vehicleName ?? '차량명 없음'}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={vehicles}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        padding: theme.spacing.md,
        flexGrow: 1,
      }}
      ListEmptyComponent={
        <StateScreen
          icon="directions-car"
          title="등록된 차량이 없습니다"
          message="차량을 등록하면 여기에 표시됩니다."
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleName: {},
});

export default MyVehiclesTab;
