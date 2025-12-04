import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, TextInput, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore, { collection, getDocs } from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { formatPrice } from '../utils/format';
import { useTheme } from '../theme/ThemeProvider';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import StateScreen from '../components/StateScreen';
import SkeletonLoader from '../components/SkeletonLoader';

const AdminVehiclesListScreen = ({ navigation }) => {
  const theme = useTheme();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingVehicleId, setDeletingVehicleId] = useState(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(firestore(), 'vehicles'));
      const vehiclesData = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('차량 목록 불러오기 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles();
    setRefreshing(false);
  };

  // Statistics calculation
  const statistics = useMemo(() => {
    const total = vehicles.length;
    const pending = vehicles.filter(v => v.status === 'pending').length;
    const approved = vehicles.filter(v => v.status === 'approved').length;
    const rejected = vehicles.filter(v => v.status === 'rejected').length;

    return { total, pending, approved, rejected };
  }, [vehicles]);

  // Filter and search logic
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        vehicle.vehicleName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;

      // Type filter
      const matchesType = typeFilter === 'all' || vehicle.vehicleType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [vehicles, searchQuery, statusFilter, typeFilter]);

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
              // Firebase Function 호출
              const emergencyDeleteVehicleFunction = functions().httpsCallable('emergencyDeleteVehicle');
              const result = await emergencyDeleteVehicleFunction({ vehicleId });

              // UI에서 차량 제거
              setVehicles(prevVehicles => prevVehicles.filter(vehicle => vehicle.id !== vehicleId));

              Alert.alert(
                '삭제 완료',
                result.data.message + `\n삭제된 이미지: ${result.data.deletedImages}개`
              );
            } catch (error) {
              console.error('차량 삭제 오류:', error);

              let errorMessage = '차량 삭제 중 문제가 발생했습니다.';
              if (error.code === 'permission-denied') {
                errorMessage = '관리자 권한이 필요합니다.';
              } else if (error.code === 'not-found') {
                errorMessage = '차량을 찾을 수 없습니다.';
              } else if (error.message) {
                errorMessage = error.message;
              }

              Alert.alert('삭제 실패', errorMessage);
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
        <Card style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm }}>
          <View style={styles.cardContent}>
            <View style={styles.vehicleInfo}>
              {/* Vehicle Type Badge */}
              <View style={styles.header}>
                <Badge status="completed" label={item.vehicleType || '승용차'} />
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

  const renderStatCard = (icon, label, count, color) => {
    return (
      <Card
        key={label}
        style={{
          minWidth: 120,
          marginRight: theme.spacing.sm,
          padding: theme.spacing.md,
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <Icon name={icon} size={32} color={color} />
          <Text
            style={{
              fontSize: theme.typography.fontSize.h2,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text.primary,
              marginTop: theme.spacing.xs,
            }}
          >
            {count}
          </Text>
          <Text
            style={{
              fontSize: theme.typography.fontSize.bodySmall,
              color: theme.colors.text.secondary,
              marginTop: theme.spacing.xxs,
            }}
          >
            {label}
          </Text>
        </View>
      </Card>
    );
  };

  const renderFilterChip = (label, value, activeValue, onPress) => {
    const isActive = activeValue === value;
    return (
      <TouchableOpacity
        key={value}
        onPress={onPress}
        style={[
          styles.filterChip,
          {
            backgroundColor: isActive ? theme.colors.primary.main : theme.colors.background.primary,
            borderColor: isActive ? theme.colors.primary.main : theme.colors.border.light,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.borderRadius.full,
            borderWidth: 1,
            marginRight: theme.spacing.xs,
          },
        ]}
      >
        <Text
          style={{
            fontSize: theme.typography.fontSize.bodySmall,
            fontWeight: theme.typography.fontWeight.medium,
            color: isActive ? theme.colors.text.white : theme.colors.text.secondary,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['bottom']}>
      {/* Statistics Dashboard */}
      {!loading && (
        <View style={{ paddingVertical: theme.spacing.md }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: theme.spacing.md }}
          >
            {renderStatCard('directions-car', '전체', statistics.total, theme.colors.primary.main)}
            {renderStatCard('hourglass-empty', '대기중', statistics.pending, theme.colors.warning.main)}
            {renderStatCard('check-circle', '승인됨', statistics.approved, theme.colors.success.main)}
            {renderStatCard('cancel', '거절됨', statistics.rejected, theme.colors.danger.main)}
          </ScrollView>
        </View>
      )}

      {/* Search Bar */}
      <View style={[styles.searchContainer, { paddingHorizontal: theme.spacing.md }]}>
        <View style={[styles.searchBar, {
          backgroundColor: theme.colors.background.primary,
          borderRadius: theme.borderRadius.md,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.colors.border.light,
        }]}>
          <Icon name="search" size={20} color={theme.colors.text.tertiary} />
          <TextInput
            style={{
              flex: 1,
              marginLeft: theme.spacing.xs,
              fontSize: theme.typography.fontSize.body,
              color: theme.colors.text.primary,
              padding: 0,
            }}
            placeholder="차량명 또는 제조사로 검색"
            placeholderTextColor={theme.colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="clear" size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={{ paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm }}>
        <Text style={{
          fontSize: theme.typography.fontSize.bodySmall,
          fontWeight: theme.typography.fontWeight.semiBold,
          color: theme.colors.text.secondary,
          marginBottom: theme.spacing.xs,
        }}>상태 필터</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: theme.spacing.sm }}>
          {renderFilterChip('전체', 'all', statusFilter, () => setStatusFilter('all'))}
          {renderFilterChip('대기중', 'pending', statusFilter, () => setStatusFilter('pending'))}
          {renderFilterChip('승인됨', 'approved', statusFilter, () => setStatusFilter('approved'))}
          {renderFilterChip('거절됨', 'rejected', statusFilter, () => setStatusFilter('rejected'))}
        </ScrollView>

        <Text style={{
          fontSize: theme.typography.fontSize.bodySmall,
          fontWeight: theme.typography.fontWeight.semiBold,
          color: theme.colors.text.secondary,
          marginBottom: theme.spacing.xs,
        }}>차종 필터</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderFilterChip('전체', 'all', typeFilter, () => setTypeFilter('all'))}
          {renderFilterChip('승용차', '승용차', typeFilter, () => setTypeFilter('승용차'))}
          {renderFilterChip('SUV', 'SUV', typeFilter, () => setTypeFilter('SUV'))}
          {renderFilterChip('트럭', '트럭', typeFilter, () => setTypeFilter('트럭'))}
          {renderFilterChip('승합차', '승합차', typeFilter, () => setTypeFilter('승합차'))}
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
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary.main]}
              tintColor={theme.colors.primary.main}
            />
          }
          ListEmptyComponent={
            <StateScreen
              icon="directions-car"
              title={searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? '검색 결과가 없습니다'
                : '등록된 차량이 없습니다'}
              message={searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? '다른 검색어나 필터를 시도해보세요.'
                : '차량을 등록해주세요.'}
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
  searchContainer: {},
  searchBar: {},
  filterChip: {},
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
