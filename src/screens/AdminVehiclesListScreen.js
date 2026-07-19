import React, { useState, useEffect, useMemo } from 'react';
import { logger } from '../utils/logger';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import { deleteVehicleAdmin } from '../services/vehicle/vehicleService';
import { formatPrice } from '../utils/format';
import { useTheme } from '../theme/ThemeProvider';
import Card from '../components/Card';
import Tag from '../components/Tag';
import Badge from '../components/Badge';
import Button from '../components/Button';
import StateScreen from '../components/StateScreen';
import SkeletonLoader from '../components/SkeletonLoader';
import InputField from '../components/InputField';
import FilterChip from '../components/FilterChip';
import useVehicleStats from '../hooks/useVehicleStats';
import useVehicleStore from '../stores/vehicleStore';

const AdminVehiclesListScreen = ({ navigation }) => {
  const theme = useTheme();

  // Task 84: Use Zustand store for centralized state management
  const {
    vehicles,
    loading,
    subscribeToAllVehicles,
    unsubscribeFromVehicles,
    clearCache,
  } = useVehicleStore();

  const [deletingVehicleId, setDeletingVehicleId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedVehicleType, setSelectedVehicleType] = useState('all');

  // Get vehicle statistics
  const vehicleStats = useVehicleStats();

  // Task 84: Subscribe to real-time vehicle updates with caching
  useEffect(() => {
    subscribeToAllVehicles();

    // Cleanup: unsubscribe when component unmounts
    return () => {
      unsubscribeFromVehicles();
    };
  }, []);

  // Task 84: Refresh vehicles by clearing cache and resubscribing
  const onRefresh = async () => {
    setIsRefreshing(true);
    clearCache();
    unsubscribeFromVehicles();
    subscribeToAllVehicles();
    setIsRefreshing(false);
  };

  // Filter vehicles based on search query and filters
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' ||
        vehicle.vehicleName?.toLowerCase().includes(searchLower) ||
        vehicle.manufacturer?.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = selectedStatus === 'all' ||
        vehicle.status === selectedStatus;

      // Vehicle type filter
      const matchesType = selectedVehicleType === 'all' ||
        vehicle.vehicleType === selectedVehicleType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [vehicles, searchQuery, selectedStatus, selectedVehicleType]);

  const handleDeleteVehicle = async (vehicleId) => {
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
              // Supabase 직접 삭제 (관리자 RLS) + 이미지 best-effort 정리
              // 성공/실패 Alert는 서비스가 표시하고, UI는 realtime 구독으로 갱신된다.
              await deleteVehicleAdmin(vehicleId);
            } catch (error) {
              logger.error('차량 삭제 오류:', error);
            } finally {
              setDeletingVehicleId(null);
            }
          },
        },
      ]
    );
  };

  const renderVehicle = ({ item }) => {
    const isDeleting = deletingVehicleId === item.id;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('AdminVehicleDetail', { vehicleId: item.id })}
        activeOpacity={0.7}
      >
        <Card elevated style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm }}>
          <View style={styles.cardContent}>
            <View style={styles.vehicleInfo}>
              {/* Vehicle Type Tag + Approval Status Chip */}
              <View style={styles.header}>
                <Tag variant="info" label={item.vehicleType || '승용차'} />
                {item.status ? (
                  <Badge
                    variant="chip"
                    status={item.status}
                    label={item.status === 'approved' ? '승인됨' : item.status === 'rejected' ? '거절됨' : '대기중'}
                  />
                ) : null}
                <Text style={[styles.vehicleName, {
                  fontSize: theme.typography.fontSize.h3,
                  fontWeight: theme.typography.fontWeight.semiBold,
                  color: theme.colors.text.primary,
                }]}>{item.vehicleName}</Text>
              </View>

              {/* Vehicle Details */}
              <Text style={[styles.detailText, {
                fontSize: theme.typography.fontSize.bodySmall,
                color: theme.colors.text.secondary,
                marginTop: theme.spacing.xs,
              }]}>제조사: {item.manufacturer}</Text>
              <Text style={[styles.detailText, {
                fontSize: theme.typography.fontSize.bodySmall,
                color: theme.colors.text.secondary,
              }]}>가격: {formatPrice(item.price)}</Text>
            </View>

            {/* Delete Button */}
            <Button
              variant="danger"
              title={isDeleting ? '' : '삭제'}
              onPress={() => handleDeleteVehicle(item.id)}
              disabled={isDeleting}
              style={{ minWidth: 60 }}
            >
              {isDeleting && <ActivityIndicator size="small" color="#fff" />}
            </Button>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['bottom']}>
      {/* Search Bar */}
      <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm }}>
        <InputField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="차량명 또는 제조사로 검색..."
          style={{ marginBottom: theme.spacing.xs }}
        />
      </View>

      {/* Total Vehicles Count */}
      {!vehicleStats.loading && (
        <View style={{
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.spacing.xs,
        }}>
          <Text style={{
            fontSize: theme.typography.fontSize.body,
            color: theme.colors.text.secondary,
            fontWeight: theme.typography.fontWeight.medium,
          }}>
            등록된 차량: {vehicleStats.total}대
          </Text>
        </View>
      )}

      {/* Status Filter Chips */}
      <View style={{ marginBottom: theme.spacing.xs }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.md,
            alignItems: 'center',
          }}
          style={{ flexGrow: 0 }}
        >
          <FilterChip
            label="전체"
            active={selectedStatus === 'all'}
            onPress={() => setSelectedStatus('all')}
          />
          <FilterChip
            label="대기중"
            active={selectedStatus === 'pending'}
            onPress={() => setSelectedStatus('pending')}
          />
          <FilterChip
            label="승인됨"
            active={selectedStatus === 'approved'}
            onPress={() => setSelectedStatus('approved')}
          />
          <FilterChip
            label="거절됨"
            active={selectedStatus === 'rejected'}
            onPress={() => setSelectedStatus('rejected')}
          />
        </ScrollView>
      </View>

      {/* Vehicle Type Filter Chips */}
      <View style={{ marginBottom: theme.spacing.sm }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.md,
            alignItems: 'center',
          }}
          style={{ flexGrow: 0 }}
        >
          <FilterChip
            label="전체 타입"
            active={selectedVehicleType === 'all'}
            onPress={() => setSelectedVehicleType('all')}
          />
          <FilterChip
            label="승용차"
            active={selectedVehicleType === '승용차'}
            onPress={() => setSelectedVehicleType('승용차')}
          />
          <FilterChip
            label="SUV"
            active={selectedVehicleType === 'SUV'}
            onPress={() => setSelectedVehicleType('SUV')}
          />
          <FilterChip
            label="트럭"
            active={selectedVehicleType === '트럭'}
            onPress={() => setSelectedVehicleType('트럭')}
          />
        </ScrollView>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={{ paddingHorizontal: theme.spacing.md }}>
          <SkeletonLoader count={4} height={120} />
        </View>
      ) : (
        <FlatList
          data={filteredVehicles}
          renderItem={renderVehicle}
          keyExtractor={(item) => item.id}
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
  container: {
    flex: 1,
  },
  title: {},
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
    marginRight: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleName: {},
  detailText: {},
});

AdminVehiclesListScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

export default AdminVehiclesListScreen;
