import React, { useState, useEffect, useContext } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialIcons';
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
import Avatar from '../components/Avatar';
import SectionHeader from '../components/SectionHeader';
import NotificationBell from '../components/NotificationBell';
import { canViewVehiclePrice, PRICE_HIDDEN_LABEL } from '../utils/vehiclePrice';

const ALL_CATEGORY = '전체';
const RECENT_LIMIT = 10;

// createdAt(Timestamp/숫자) → 정렬용 초 단위
const createdSeconds = (v) =>
  v?.createdAt?.seconds ?? v?.createdAt?._seconds ??
  (typeof v?.createdAt === 'number' ? v.createdAt / 1000 : 0);

const resolveImage = (imageUrl) => {
  if (Array.isArray(imageUrl)) { return imageUrl[0] || null; }
  return imageUrl || null;
};

const VehiclesListScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user, role, sellerName } = useContext(AuthContext);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  // 홈 공개 브라우즈에서는 일반 사용자에게 가격을 노출하지 않는다(상담 후 안내).
  // 가격 필터/정렬도 함께 차단 — 가격대 좁히기로 실가격 유추 가능하기 때문.
  const hidePrice = !canViewVehiclePrice(null, { role });
  const defaultSortBy = hidePrice ? 'year_desc' : 'price_asc';
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
    const unsubscribe = subscribeToFilteredVehicles(filters, (filteredVehicles) => {
      setVehicles(filteredVehicles);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [filters, user]);

  const handleApplyFilters = (newFilters) => setFilters(newFilters);
  const activeFilterCount = getActiveFilterCount(filters, defaultSortBy);

  // 검색/카테고리/필터가 활성화되면 단일 결과 목록 모드
  const isBrowsing = Boolean(searchText) || selectedCategory !== ALL_CATEGORY || activeFilterCount > 0;

  // 카테고리 칩(로드된 vehicleType 동적 구성)
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

  // 새로 등록된 차량(최근순) — 가로 스크롤용
  const recentVehicles = [...vehicles].sort((a, b) => createdSeconds(b) - createdSeconds(a)).slice(0, RECENT_LIMIT);

  const goDetail = (id) => navigation.navigate('VehicleDetail', { vehicleId: id });

  // 풀 카드(검색 결과/가로 스크롤 공용)
  const renderFullCard = (item, style) => (
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
      onPress={() => goDetail(item.id)}
      style={style}
    />
  );

  // 인기 차량 컴팩트 행
  const renderPopularRow = ({ item }) => {
    const image = resolveImage(item.imageUrl);
    return (
      <TouchableOpacity onPress={() => goDetail(item.id)} activeOpacity={0.75} style={styles.popRow}>
        {image ? (
          <Image source={{ uri: image }} style={[styles.popThumb, styles.popThumbBg]} resizeMode="cover" />
        ) : (
          <View style={[styles.popThumb, { backgroundColor: theme.colors.background.tertiary }]} />
        )}
        <View style={styles.popInfo}>
          <Text style={[styles.popName, { color: theme.colors.text.primary }]} numberOfLines={1}>
            {item.vehicleName ?? '차량'}
          </Text>
          <Text style={[styles.popMeta, { color: theme.colors.text.secondary }]} numberOfLines={1}>
            {[item.manufacturer, item.year ? `${item.year}년` : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Text style={[styles.popPrice, { color: hidePrice ? theme.colors.text.tertiary : theme.colors.primary.main }]}>
          {hidePrice ? PRICE_HIDDEN_LABEL : '가격 문의'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderHeaderTop = () => (
    <View>
      <View style={styles.greetingRow}>
        <View style={styles.greetingTextWrap}>
          <Text style={[styles.greetingHello, { color: theme.colors.text.secondary }]}>안녕하세요</Text>
          <Text style={[styles.greetingName, { color: theme.colors.text.primary }]}>
            {sellerName ? `${sellerName}님 👋` : '반가워요 👋'}
          </Text>
        </View>
        <View style={styles.greetingActions}>
          <NotificationBell />
          <Avatar name={sellerName || 'J'} size={40} />
        </View>
      </View>

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
              <Text style={[styles.filterBadgeText, { color: theme.colors.text.white, fontSize: theme.typography.fontSize.caption }]}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {categories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
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

      {/* 기본 홈: 새로 등록된 차량(가로 스크롤) */}
      {!isBrowsing && recentVehicles.length > 0 && (
        <View>
          <SectionHeader title="새로 등록된 차량" style={styles.sectionHeader} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
            {recentVehicles.map((item) => (
              <View key={item.id} style={styles.recentCardWrap}>
                {renderFullCard(item, styles.recentCard)}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <SectionHeader
        title={isBrowsing ? '차량 목록' : '이번 주 인기 차량'}
        style={styles.sectionHeader}
      />
    </View>
  );

  const data = isBrowsing ? filteredVehicles : vehicles;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['top', 'bottom']}>
      {loading ? (
        <SkeletonLoader count={5} style={styles.skeletonPad} />
      ) : (
        <FlatList
          data={data}
          renderItem={isBrowsing ? ({ item }) => renderFullCard(item, styles.cardSpacing) : renderPopularRow}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeaderTop}
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
        hidePrice={hidePrice}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingBottom: 16, flexGrow: 1 },
  skeletonPad: { paddingTop: 8 },
  emptyState: { flex: 1 },
  cardSpacing: { marginHorizontal: 20, marginBottom: 14 },
  // 인사 헤더
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  greetingTextWrap: { flex: 1 },
  greetingHello: { fontSize: 13 },
  greetingName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.2 },
  // 검색 + 필터
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 16, gap: 10 },
  searchFlex: { flex: 1 },
  filterButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  filterBadge: { position: 'absolute', top: -4, right: -4, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  filterBadgeText: { fontWeight: '700' },
  // 카테고리
  categoryRow: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  categoryChipSpacing: { marginRight: 8 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 2, paddingBottom: 12 },
  greetingActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // 새로 등록된 차량(가로)
  recentRow: { paddingHorizontal: 20, paddingTop: 2, paddingBottom: 10, gap: 14 },
  recentCardWrap: {},
  recentCard: { width: 220 },
  // 인기 차량(컴팩트 행)
  popRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  popThumb: { width: 70, height: 52, borderRadius: 10 },
  popThumbBg: { backgroundColor: '#EEF1F5' },
  popInfo: { flex: 1, minWidth: 0 },
  popName: { fontSize: 14, fontWeight: '700' },
  popMeta: { fontSize: 12, marginTop: 2 },
  popPrice: { fontSize: 13, fontWeight: '700' },
});

export default VehiclesListScreen;
