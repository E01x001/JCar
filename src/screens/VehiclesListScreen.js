import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, FlatList, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import VehicleFilterModal from '../components/filters/VehicleFilterModal';
import {
  subscribeToFilteredVehicles,
  getActiveFilterCount,
} from '../services/vehicleFilterService';
import { useTheme } from '../theme/ThemeProvider';
import { AuthContext } from '../context/AuthContext';
import SkeletonLoader from '../components/SkeletonLoader';
import StateScreen from '../components/StateScreen';
import SearchBar from '../components/SearchBar';
import CategoryChip from '../components/CategoryChip';
import VehicleCard from '../components/VehicleCard';
import { canViewVehiclePrice } from '../utils/vehiclePrice';
import Avatar from '../components/Avatar';
import SectionHeader from '../components/SectionHeader';

const ALL_CATEGORY = '전체';

const VehiclesListScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user, role, sellerName } = useContext(AuthContext);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
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

  // 시안 A안: 로드된 매물의 vehicleType으로 카테고리 칩 동적 구성(항상 정합)
  const categories = [
    ALL_CATEGORY,
    ...Array.from(new Set(vehicles.map((v) => v.vehicleType).filter(Boolean))),
  ];

  const filteredVehicles = vehicles.filter((vehicle) => {
    if (selectedCategory !== ALL_CATEGORY && vehicle.vehicleType !== selectedCategory) {
      return false;
    }
    if (!searchText) {return true;}
    const search = searchText.toLowerCase();
    return (
      vehicle.vehicleName?.toLowerCase().includes(search) ||
      vehicle.manufacturer?.toLowerCase().includes(search) ||
      vehicle.model?.toLowerCase().includes(search)
    );
  });

  const renderVehicle = ({ item }) => (
    <VehicleCard
      vehicle={{
        vehicleName: item.vehicleName,
        manufacturer: item.manufacturer,
        year: item.year,
        price: item.price,
        imageUrl: item.imageUrl,
        carType: item.vehicleType,
        dealStage: item.dealStage,
      }}
      hidePrice={!canViewVehiclePrice(item, { uid: user?.uid, role })}
      onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
      style={styles.cardSpacing}
    />
  );

  // 검색바 + 카테고리 + 섹션 타이틀 (FlatList 헤더)
  const renderListHeader = () => (
    <View>
      <View style={styles.greetingRow}>
        <View style={styles.greetingTextWrap}>
          <Text style={[styles.greetingHello, { color: theme.colors.text.secondary }]}>안녕하세요</Text>
          <Text style={[styles.greetingName, { color: theme.colors.text.primary }]}>
            {sellerName ? `${sellerName}님 👋` : '반가워요 👋'}
          </Text>
        </View>
        <Avatar name={sellerName || 'J'} size={40} />
      </View>

      <View style={styles.searchRow}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchFlex}
        />
        <TouchableOpacity
          style={[styles.filterButton, {
            backgroundColor: activeFilterCount > 0 ? theme.colors.primary.main : theme.colors.background.tertiary,
            borderRadius: theme.borderRadius.button,
          }]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Icon
            name="tune"
            size={22}
            color={activeFilterCount > 0 ? theme.colors.text.white : theme.colors.primary.main}
          />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: theme.colors.danger.main }]}>
              <Text style={[styles.filterBadgeText, {
                color: theme.colors.text.white,
                fontSize: theme.typography.fontSize.caption,
              }]}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categories.map((cat) => (
            <CategoryChip
              key={cat}
              label={cat}
              selected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
              style={styles.categoryChipSpacing}
            />
          ))}
        </ScrollView>
      )}

      <SectionHeader title="등록된 차량" style={styles.sectionHeader} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['top', 'bottom']}>
      {loading ? (
        <SkeletonLoader count={5} style={styles.skeletonPad} />
      ) : (
        <FlatList
          data={filteredVehicles}
          renderItem={renderVehicle}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <StateScreen
              icon="directions-car"
              title="차량이 없습니다"
              message={searchText ? '검색 결과가 없습니다.' : '조건에 맞는 차량이 없습니다. 필터를 변경해보세요.'}
              style={styles.emptyState}
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
  listContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  skeletonPad: {
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
  },
  cardSpacing: {
    marginHorizontal: 20,
    marginBottom: 14,
  },
  // 인사 헤더
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  greetingTextWrap: {
    flex: 1,
  },
  greetingHello: {
    fontSize: 13,
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  // 검색 + 필터
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  searchFlex: {
    flex: 1,
  },
  filterButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontWeight: '700',
  },
  // 카테고리
  categoryRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  categoryChipSpacing: {
    marginRight: 8,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 12,
  },
});

export default VehiclesListScreen;
