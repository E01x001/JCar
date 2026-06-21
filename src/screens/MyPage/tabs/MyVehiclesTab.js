import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import Card from '../../../components/Card';
import Badge from '../../../components/Badge';
import EmptyState from '../../../components/EmptyState';

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
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="directions-car"
            title="아직 등록한 차량이 없어요"
            message={'내 차량을 등록하고\n판매를 시작해 보세요'}
          />
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleName: {},
});

export default MyVehiclesTab;
