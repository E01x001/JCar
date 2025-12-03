import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatPrice } from '../utils/format';
import VehicleFilterModal from '../components/filters/VehicleFilterModal';
import {
  subscribeToFilteredVehicles,
  getActiveFilterCount,
} from '../services/vehicleFilterService';
import { useTheme } from '../theme/ThemeProvider';
import { AuthContext } from '../context/AuthContext';
import Card from '../components/Card';
import Badge from '../components/Badge';
import SkeletonLoader from '../components/SkeletonLoader';
import StateScreen from '../components/StateScreen';

const VehiclesListScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    manufacturers: [],
    sortBy: 'price_asc',
  });

  useEffect(() => {
    if (!user) {return () => {};}

    setLoading(true);
    const unsubscribe = subscribeToFilteredVehicles(filters, (filteredVehicles) => {
      setVehicles(filteredVehicles);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filters, user]);

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const activeFilterCount = getActiveFilterCount(filters);

  const filteredVehicles = vehicles.filter((vehicle) => {
    if (!searchText) {return true;}
    const search = searchText.toLowerCase();
    return (
      vehicle.vehicleName?.toLowerCase().includes(search) ||
      vehicle.manufacturer?.toLowerCase().includes(search) ||
      vehicle.model?.toLowerCase().includes(search)
    );
  });

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['bottom']}>
      {/* Search and Filter Bar */}
      <View style={[styles.searchBar, {
        backgroundColor: theme.colors.background.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.light,
      }]}>
        <View style={[styles.searchContainer, {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.background.secondary,
          borderRadius: theme.borderRadius.md,
          paddingHorizontal: theme.spacing.sm,
          marginRight: theme.spacing.sm,
        }]}>
          <Icon name="search" size={20} color={theme.colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, {
              flex: 1,
              marginLeft: theme.spacing.xs,
              paddingVertical: theme.spacing.xs,
              fontSize: theme.typography.fontSize.body,
              color: theme.colors.text.primary,
            }]}
            placeholder="차량명, 제조사 검색..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Icon name="clear" size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, {
            backgroundColor: activeFilterCount > 0 ? theme.colors.primary.main : theme.colors.background.secondary,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.sm,
          }]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Icon
            name="filter-list"
            size={24}
            color={activeFilterCount > 0 ? theme.colors.text.white : theme.colors.primary.main}
          />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, {
              position: 'absolute',
              top: -4,
              right: -4,
              backgroundColor: theme.colors.danger.main,
              borderRadius: 10,
              minWidth: 20,
              height: 20,
              justifyContent: 'center',
              alignItems: 'center',
            }]}>
              <Text style={[styles.filterBadgeText, {
                color: theme.colors.text.white,
                fontSize: theme.typography.fontSize.caption,
                fontWeight: theme.typography.fontWeight.bold,
              }]}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <SkeletonLoader count={5} style={{ paddingTop: theme.spacing.sm }} />
      ) : (
        <FlatList
          data={filteredVehicles}
          renderItem={renderVehicle}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: theme.spacing.sm, flexGrow: 1 }}
          ListEmptyComponent={
            <StateScreen
              icon="directions-car"
              title="차량이 없습니다"
              message={searchText ? '검색 결과가 없습니다.' : '조건에 맞는 차량이 없습니다. 필터를 변경해보세요.'}
              style={{ flex: 1 }}
            />
          }
        />
      )}

      <VehicleFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {},
  searchInput: {},
  filterButton: {
    position: 'relative',
  },
  filterBadge: {},
  filterBadgeText: {},
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
