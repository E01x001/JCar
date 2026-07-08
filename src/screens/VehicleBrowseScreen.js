import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { subscribeToFilteredVehicles, getActiveFilterCount } from '../services/vehicleFilterService';
import { useTheme } from '../theme/ThemeProvider';
import { AuthContext } from '../context/AuthContext';
import SkeletonLoader from '../components/SkeletonLoader';
import StateScreen from '../components/StateScreen';
import SearchBar from '../components/SearchBar';
import CategoryChip from '../components/CategoryChip';
import VehicleCard from '../components/VehicleCard';
import VehicleFilterModal from '../components/filters/VehicleFilterModal';
import { canViewVehiclePrice } from '../utils/vehiclePrice';

const SORTS = [
  { key: 'recent', label: '최신순' },
  { key: 'year', label: '연식순' },
  { key: 'maker', label: '제조사' },
];

const createdSeconds = (v) =>
  v?.createdAt?.seconds ?? v?.createdAt?._seconds ??
  (typeof v?.createdAt === 'number' ? v.createdAt / 1000 : 0);

const sortVehicles = (list, sortKey) => {
  const arr = [...list];
  if (sortKey === 'year') { return arr.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0)); }
  if (sortKey === 'maker') { return arr.sort((a, b) => String(a.manufacturer || '').localeCompare(String(b.manufacturer || ''))); }
  return arr.sort((a, b) => createdSeconds(b) - createdSeconds(a));
};

const VehicleBrowseScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user, role } = useContext(AuthContext);
  // 가격 비공개 정책: 일반 사용자는 가격 표시/필터/정렬 모두 차단
  const hidePrice = !canViewVehiclePrice(null, { role });
  const defaultSortBy = hidePrice ? 'year_desc' : 'price_asc';
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState('recent');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    manufacturers: [],
    sortBy: defaultSortBy,
  });

  useEffect(() => {
    if (!user) {return () => {};}
    setLoading(true);
    const unsubscribe = subscribeToFilteredVehicles(filters, (list) => {
      setVehicles(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [filters, user]);

  const activeFilterCount = getActiveFilterCount(filters, defaultSortBy);

  const filtered = sortVehicles(
    vehicles.filter((v) => {
      if (!searchText) {return true;}
      const s = searchText.toLowerCase();
      return v.vehicleName?.toLowerCase().includes(s) || v.manufacturer?.toLowerCase().includes(s) || v.model?.toLowerCase().includes(s);
    }),
    sortKey,
  );

  const renderItem = ({ item }) => (
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
      hidePrice={hidePrice}
      onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
      style={styles.cardSpacing}
    />
  );

  const renderHeader = () => (
    <View>
      <View style={styles.searchRow}>
        <SearchBar value={searchText} onChangeText={setSearchText} style={styles.searchFlex} />
        <TouchableOpacity
          style={[styles.filterButton, {
            backgroundColor: activeFilterCount > 0 ? theme.colors.primary.main : theme.colors.background.tertiary,
            borderRadius: theme.borderRadius.button,
          }]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Icon name="tune" size={22} color={activeFilterCount > 0 ? theme.colors.text.white : theme.colors.primary.main} />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: theme.colors.danger.main }]}>
              <Text style={[styles.filterBadgeText, { color: theme.colors.text.white }]}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.sortRow}>
        {SORTS.map((s) => (
          <CategoryChip key={s.key} label={s.label} selected={sortKey === s.key} onPress={() => setSortKey(s.key)} style={styles.sortChip} />
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['top', 'bottom']}>
      <View style={[styles.titleBar, { backgroundColor: theme.colors.background.card, borderBottomColor: theme.colors.border.light }]}>
        <Text style={[styles.titleText, { color: theme.colors.text.primary }]}>차량 목록</Text>
      </View>

      {loading ? (
        <SkeletonLoader count={5} style={styles.skeletonPad} />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <StateScreen
              icon="directions-car"
              title="차량이 없습니다"
              message={searchText ? '검색 결과가 없습니다.' : '아직 등록된 차량이 없습니다.'}
              style={styles.emptyState}
            />
          }
        />
      )}

      <VehicleFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={setFilters}
        initialFilters={filters}
        hidePrice={hidePrice}
      />

      {/* 등록 FAB */}
      <Pressable
        onPress={() => navigation.navigate('Register')}
        style={({ pressed }) => [
          styles.fab,
          theme.shadows.button,
          { backgroundColor: pressed ? theme.colors.primary.dark : theme.colors.primary.main },
        ]}
      >
        <Icon name="add" size={28} color={theme.colors.neutral.white} />
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleBar: { paddingVertical: 14, alignItems: 'center', borderBottomWidth: 1 },
  titleText: { fontSize: 17, fontWeight: '800' },
  listContent: { paddingBottom: 90, flexGrow: 1 },
  skeletonPad: { paddingTop: 8 },
  emptyState: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 14 },
  searchFlex: { flex: 1 },
  filterButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  filterBadge: { position: 'absolute', top: -4, right: -4, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  filterBadgeText: { fontSize: 12, fontWeight: '700' },
  sortRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 14 },
  sortChip: { marginRight: 8 },
  cardSpacing: { marginHorizontal: 20, marginBottom: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default VehicleBrowseScreen;
