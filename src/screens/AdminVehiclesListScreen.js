/**
 * AdminVehiclesListScreen — 차량 관리.
 *
 * 예전 목록은 56px도 안 되는 텍스트 줄이었다. 차량 목록에서 정작 차가 안 보였고,
 * "가격:" 라벨은 값 없이 덩그러니 남아 있었다 — 가격은 vehicle_pricing에 있는데
 * 목록이 그것을 조회한 적이 없기 때문이다(상세 화면만 조회했다).
 *
 * 지금은 이미지가 카드의 주인공이고, 매입가가 없으면 그 사실 자체를 할 일로 만든다.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, Image, FlatList, TouchableOpacity, Alert,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import Icon from '@expo/vector-icons/MaterialIcons';
import { logger } from '../utils/logger';
import { deleteVehicleAdmin } from '../services/vehicle/vehicleService';
import { fetchAllVehiclePricing } from '../services/vehicle/supabaseVehicleService';
import { formatPrice } from '../utils/format';
import { useTheme } from '../theme/ThemeProvider';
import { pickVehicleImage } from '../utils/vehicleImage';
import AdminHeader from '../components/admin/AdminHeader';
import AdminHero from '../components/admin/AdminHero';
import SegmentFilter from '../components/admin/SegmentFilter';
import StateScreen from '../components/StateScreen';
import SkeletonLoader from '../components/SkeletonLoader';
import InputField from '../components/InputField';
import useVehicleStore from '../stores/vehicleStore';

/** 목록에 보이는 차량(= 노출 중)의 승인 상태 */
const LISTED = 'approved';

const AdminVehiclesListScreen = ({ navigation }) => {
  const theme = useTheme();

  const {
    vehicles,
    loading,
    subscribeToAllVehicles,
    unsubscribeFromVehicles,
    clearCache,
  } = useVehicleStore();

  const [deletingVehicleId, setDeletingVehicleId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [pricing, setPricing] = useState({});

  useEffect(() => {
    subscribeToAllVehicles();
    return () => { unsubscribeFromVehicles(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 가격은 vehicles와 다른 테이블이라 따로 가져온다(관리자만 결과가 있다).
  // 실패해도 목록은 그대로 쓸 수 있어야 하므로 조용히 넘긴다.
  const loadPricing = useCallback(async () => {
    try {
      setPricing(await fetchAllVehiclePricing());
    } catch (error) {
      logger.error('차량 가격 조회 실패:', error);
    }
  }, []);

  useEffect(() => { loadPricing(); }, [loadPricing]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    clearCache();
    unsubscribeFromVehicles();
    subscribeToAllVehicles();
    await loadPricing();
    setIsRefreshing(false);
  };

  const counts = useMemo(() => ({
    all: vehicles.length,
    pending: vehicles.filter((v) => v.status === 'pending').length,
    approved: vehicles.filter((v) => v.status === LISTED).length,
    rejected: vehicles.filter((v) => v.status === 'rejected').length,
  }), [vehicles]);

  // 노출 중인데 매입가가 없는 차량 — 히어로가 말하는 "할 일"
  const missingPrice = useMemo(
    () => vehicles.filter((v) => v.status === LISTED && !pricing[v.id]?.purchasePrice).length,
    [vehicles, pricing],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vehicles.filter((v) => {
      const matchesSearch = q === ''
        || v.vehicleName?.toLowerCase().includes(q)
        || v.manufacturer?.toLowerCase().includes(q);
      const matchesStatus = selectedStatus === 'all' || v.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchQuery, selectedStatus]);

  const handleDeleteVehicle = (vehicleId) => {
    Alert.alert(
      '긴급 삭제 확인',
      '정말로 이 차량을 삭제하시겠습니까?\n\n차량 문서와 모든 관련 이미지가 완전히 삭제되며, 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setDeletingVehicleId(vehicleId);
            try {
              await deleteVehicleAdmin(vehicleId);
            } catch (error) {
              logger.error('차량 삭제 오류:', error);
            } finally {
              setDeletingVehicleId(null);
            }
          },
        },
      ],
    );
  };

  const renderVehicle = ({ item }) => {
    const isDeleting = deletingVehicleId === item.id;
    // 실사진이면 채우고, 카탈로그(흰 배경 PNG)면 잘리지 않게 넣는다.
    // 관리자 목록에는 실사진 없는 차량도 보이므로 이 분기가 실제로 쓰인다.
    const picked = pickVehicleImage(item);
    const purchasePrice = pricing[item.id]?.purchasePrice;
    const chipKey = item.status === LISTED ? 'approved' : item.status === 'rejected' ? 'rejected' : 'pending';
    const chip = theme.colors.statusChip[chipKey];
    const statusLabel = item.status === LISTED ? '승인됨' : item.status === 'rejected' ? '거절됨' : '대기중';
    const meta = [item.manufacturer, item.year].filter(Boolean).join(' · ');

    return (
      <View style={[styles.cardShadow, theme.shadows.soft]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('AdminVehicleDetail', { vehicleId: item.id })}
          activeOpacity={0.85}
          style={[styles.card, { backgroundColor: theme.colors.background.card }]}
        >
          {/* 이미지 — 없으면 자리만 만들지 않고 아래 행 형태로 떨어진다 */}
          {picked ? (
            <View style={[styles.cover, { backgroundColor: theme.colors.background.tertiary }]}>
              <Image source={{ uri: picked.uri }} style={styles.coverImage} resizeMode={picked.resizeMode} />
              <View style={[styles.coverBadge, { backgroundColor: chip.bg }]}>
                <Text style={[styles.coverBadgeText, { color: chip.fg }]}>{statusLabel}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <View style={styles.titleCol}>
                <Text style={[styles.name, { color: theme.colors.text.primary }]} numberOfLines={1}>
                  {item.vehicleName}
                </Text>
                <Text style={[styles.meta, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                  {meta || '-'}
                </Text>
              </View>

              {!picked ? (
                <View style={[styles.chip, { backgroundColor: chip.bg }]}>
                  <Text style={[styles.chipText, { color: chip.fg }]}>{statusLabel}</Text>
                </View>
              ) : null}
            </View>

            {/* 매입가 — 관리자 전용 값. 없으면 빈칸이 아니라 "미설정"이라고 말한다. */}
            <View style={[styles.priceRow, { borderTopColor: theme.colors.border.light }]}>
              {purchasePrice ? (
                <View style={styles.priceCol}>
                  <Text style={[styles.priceLabel, { color: theme.colors.text.tertiary }]}>매입가</Text>
                  <Text style={[styles.price, { color: theme.colors.text.primary }]}>
                    {formatPrice(purchasePrice)}
                  </Text>
                </View>
              ) : (
                <View style={styles.priceCol}>
                  <Icon name="error-outline" size={14} color={theme.colors.statusChip.pending.fg} />
                  <Text style={[styles.priceMissing, { color: theme.colors.statusChip.pending.fg }]}>
                    매입가 미설정
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => handleDeleteVehicle(item.id)}
                disabled={isDeleting}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="차량 삭제"
                style={[styles.deleteButton, { backgroundColor: theme.colors.statusChip.rejected.bg }]}
              >
                {isDeleting
                  ? <ActivityIndicator size="small" color={theme.colors.danger.main} />
                  : <Icon name="delete-outline" size={18} color={theme.colors.danger.main} />}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}
      edges={['top']}
    >
      <AdminHeader title="차량" />

      <AdminHero
        value={counts.approved}
        title="대가 노출 중입니다"
        subtitle={missingPrice > 0 ? `${missingPrice}대는 아직 매입가가 없습니다` : undefined}
      />

      <View style={styles.search}>
        <InputField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="차량명 또는 제조사로 검색"
        />
      </View>

      <SegmentFilter
        value={selectedStatus}
        onChange={setSelectedStatus}
        items={[
          { key: 'all', label: '전체', count: counts.all },
          { key: 'pending', label: '대기중', count: counts.pending },
          { key: 'approved', label: '승인됨', count: counts.approved },
          { key: 'rejected', label: '거절됨', count: counts.rejected },
        ]}
      />

      {loading ? (
        <View style={styles.skeleton}>
          <SkeletonLoader count={3} height={140} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderVehicle}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={filtered.length === 0 ? styles.emptyWrap : styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary.main]}
              tintColor={theme.colors.primary.main}
            />
          }
          ListEmptyComponent={
            <StateScreen
              icon="directions-car"
              title={vehicles.length === 0 ? '등록된 차량이 없습니다' : '검색 결과가 없습니다'}
              message={vehicles.length === 0 ? '차량을 등록해주세요.' : '다른 검색어나 필터를 시도해보세요.'}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: { paddingHorizontal: 22, paddingBottom: 12 },
  content: { paddingHorizontal: 22, paddingBottom: 20, gap: 12 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22 },
  skeleton: { paddingHorizontal: 22 },

  // 그림자와 클리핑을 분리한다 — 한 View에 같이 두면 안드로이드에서 그림자가 잘린다
  cardShadow: { borderRadius: 18 },
  card: { borderRadius: 18, overflow: 'hidden' },

  cover: { height: 128, justifyContent: 'center', alignItems: 'center' },
  coverImage: { ...StyleSheet.absoluteFillObject },
  coverBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  coverBadgeText: { fontSize: 11, fontWeight: '600' },

  cardBody: { padding: 16, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleCol: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 13 },
  chip: { borderRadius: 9, paddingVertical: 7, paddingHorizontal: 13 },
  chipText: { fontSize: 12, fontWeight: '700' },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  priceCol: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  priceLabel: { fontSize: 13 },
  price: { fontSize: 15, fontWeight: '800' },
  priceMissing: { fontSize: 12, fontWeight: '600' },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

AdminVehiclesListScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

export default AdminVehiclesListScreen;
