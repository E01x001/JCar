import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatPrice } from '../utils/format';
import VehicleFilterModal from '../components/filters/VehicleFilterModal';
import {
  subscribeToFilteredVehicles,
  getActiveFilterCount,
} from '../services/vehicleFilterService';
import { useTheme } from '../theme/ThemeProvider';
import Card from '../components/Card';
import Badge from '../components/Badge';

const VehiclesListScreen = ({ navigation }) => {
  const theme = useTheme();
  const [vehicles, setVehicles] = useState([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    manufacturers: [],
    sortBy: 'price_asc',
  });

  useEffect(() => {
    const unsubscribe = subscribeToFilteredVehicles(filters, (filteredVehicles) => {
      setVehicles(filteredVehicles);
    });

    return () => unsubscribe();
  }, [filters]);

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const activeFilterCount = getActiveFilterCount(filters);

  const renderVehicle = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
      activeOpacity={0.7}
    >
      <Card style={{ marginHorizontal: theme.spacing.md }}>
        <View style={styles.vehicleHeader}>
          <Badge status="completed" label={item.vehicleType || '승용차'} />
        </View>
        <Text style={[styles.vehicleName, {
          fontSize: theme.typography.fontSize.h3,
          fontWeight: theme.typography.fontWeight.semiBold,
          color: theme.colors.text.primary,
          marginTop: theme.spacing.sm,
        }]}>
          {item.vehicleName}
        </Text>
        <Text style={[styles.vehicleInfo, {
          fontSize: theme.typography.fontSize.body,
          color: theme.colors.text.secondary,
          marginTop: theme.spacing.xs,
        }]}>
          {item.manufacturer} | {item.year}년 | {formatPrice(item.price)}
        </Text>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
      <View style={[styles.header, {
        backgroundColor: theme.colors.background.primary,
        borderBottomColor: theme.colors.border.light,
        padding: theme.spacing.md,
      }]}>
        <Text style={[styles.headerTitle, {
          fontSize: theme.typography.fontSize.h2,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text.primary,
        }]}>차량 목록</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Icon name="filter-list" size={24} color={theme.colors.primary.main} />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: theme.colors.danger.main }]}>
              <Text style={[styles.filterBadgeText, {
                color: theme.colors.text.white,
                fontSize: theme.typography.fontSize.bodySmall,
              }]}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={vehicles}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: theme.spacing.sm }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="directions-car" size={64} color={theme.colors.text.tertiary} />
            <Text style={[styles.emptyText, {
              fontSize: theme.typography.fontSize.h4,
              color: theme.colors.text.secondary,
              marginTop: theme.spacing.md,
            }]}>조건에 맞는 차량이 없습니다.</Text>
          </View>
        }
      />

      <VehicleFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: {},
  filterButton: {
    position: 'relative',
    padding: 8,
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontWeight: 'bold',
  },
  vehicleHeader: {
    flexDirection: 'row',
  },
  vehicleName: {},
  vehicleInfo: {},
  emptyContainer: {
    alignItems: 'center',
    marginTop: 64,
  },
  emptyText: {
    textAlign: 'center',
  },
});

export default VehiclesListScreen;
