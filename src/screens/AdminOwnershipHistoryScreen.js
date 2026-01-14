/**
 * AdminOwnershipHistoryScreen
 *
 * Screen for viewing and managing vehicle ownership transfer history.
 * Features:
 * - View all ownership transfers
 * - Filter by date range
 * - Filter by vehicle
 * - View detailed transfer information
 * - Display statistics (total transfers, total amount)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeProvider';
import { getFirestore, collection, query, orderBy, getDocs } from '@react-native-firebase/firestore';
import { reportCrashlyticsError, logCrashlyticsMessage } from '../services/notification/notificationService';
import Card from '../components/Card';
import InputField from '../components/InputField';
import StateScreen from '../components/StateScreen';
import OwnershipTransferDetailModal from '../components/modals/OwnershipTransferDetailModal';
import useOwnershipStats from '../hooks/useOwnershipStats';

const AdminOwnershipHistoryScreen = ({ navigation }) => {
  const theme = useTheme();

  // State
  const [transfers, setTransfers] = useState([]);
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'week', 'month'

  // Modal state
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Calculate date range based on filter (memoized to prevent infinite loops)
  const { startDate, endDate } = useMemo(() => {
    if (dateFilter === 'all') {
      return { startDate: null, endDate: null };
    }

    const endDate = new Date();
    const startDate = new Date();

    if (dateFilter === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (dateFilter === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    return { startDate, endDate };
  }, [dateFilter]);

  const { totalTransfers, totalAmount, loading: statsLoading } = useOwnershipStats(startDate, endDate);

  // Fetch ownership transfers (Modular API)
  const fetchTransfers = useCallback(async () => {
    try {
      console.log('📥 Fetching ownership transfers');

      // Get Firestore instance
      const db = getFirestore();
      const transfersRef = collection(db, 'ownership_transfers');

      // Build and execute query
      const q = query(transfersRef, orderBy('transferredAt', 'desc'));
      const snapshot = await getDocs(q);

      const transfersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTransfers(transfersData);
      setError(null);
      console.log(`✅ Fetched ${transfersData.length} ownership transfers`);
    } catch (err) {
      console.error('❌ Failed to fetch ownership transfers:', err);
      reportCrashlyticsError(err);
      setError('소유권 이전 기록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // Apply filters
  useEffect(() => {
    let filtered = [...transfers];

    // Apply search filter (vehicle ID)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((transfer) =>
        transfer.vehicleId?.toLowerCase().includes(query)
      );
    }

    // Apply date filter
    if (dateFilter !== 'all' && startDate) {
      filtered = filtered.filter((transfer) => {
        if (!transfer.transferredAt) {return false;}
        const transferDate = transfer.transferredAt.toDate();
        return transferDate >= startDate;
      });
    }

    setFilteredTransfers(filtered);
  }, [transfers, searchQuery, dateFilter, startDate]);

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransfers();
  };

  // Open detail modal
  const handleTransferPress = (transfer) => {
    setSelectedTransfer(transfer);
    setShowDetailModal(true);
  };

  // Close detail modal
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedTransfer(null);
  };

  // Format price for display
  const formatPrice = (price) => {
    if (!price) {return '0원';}
    const million = Math.floor(price / 10000);
    return `${million.toLocaleString()}만원`;
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) {return 'N/A';}
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (err) {
      return 'N/A';
    }
  };

  // Get transfer type display text
  const getTransferTypeText = (type) => {
    switch (type) {
      case 'sell_to_admin':
        return '판매자 → 관리자';
      case 'admin_to_buyer':
        return '관리자 → 구매자';
      default:
        return type || 'N/A';
    }
  };

  // Get transfer type icon
  const getTransferTypeIcon = (type) => {
    switch (type) {
      case 'sell_to_admin':
        return 'arrow-downward';
      case 'admin_to_buyer':
        return 'arrow-upward';
      default:
        return 'swap-horiz';
    }
  };

  // Get transfer type color
  const getTransferTypeColor = (type) => {
    switch (type) {
      case 'sell_to_admin':
        return theme.colors.primary.main;
      case 'admin_to_buyer':
        return theme.colors.success.main;
      default:
        return theme.colors.text.secondary;
    }
  };

  // Render transfer item
  const renderTransferItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleTransferPress(item)}
      activeOpacity={0.7}
    >
      <Card
        style={[
          styles.transferCard,
          {
            marginBottom: theme.spacing.md,
            borderLeftWidth: 4,
            borderLeftColor: getTransferTypeColor(item.transferType),
          },
        ]}
      >
        <View style={styles.transferHeader}>
          <View style={styles.transferTypeContainer}>
            <MaterialIcons
              name={getTransferTypeIcon(item.transferType)}
              size={20}
              color={getTransferTypeColor(item.transferType)}
            />
            <Text
              style={[
                styles.transferTypeText,
                {
                  fontSize: theme.typography.fontSize.caption,
                  color: getTransferTypeColor(item.transferType),
                  marginLeft: theme.spacing.xs,
                },
              ]}
            >
              {getTransferTypeText(item.transferType)}
            </Text>
          </View>
          <Text
            style={[
              styles.dateText,
              {
                fontSize: theme.typography.fontSize.caption,
                color: theme.colors.text.secondary,
              },
            ]}
          >
            {formatDate(item.transferredAt)}
          </Text>
        </View>

        <View style={[styles.transferBody, { marginTop: theme.spacing.sm }]}>
          <View style={styles.infoRow}>
            <MaterialIcons
              name="directions-car"
              size={16}
              color={theme.colors.text.secondary}
            />
            <Text
              style={[
                styles.infoText,
                {
                  fontSize: theme.typography.fontSize.body,
                  color: theme.colors.text.primary,
                  marginLeft: theme.spacing.xs,
                },
              ]}
            >
              차량 ID: {item.vehicleId || 'N/A'}
            </Text>
          </View>

          <View style={[styles.infoRow, { marginTop: theme.spacing.xs }]}>
            <MaterialIcons
              name="attach-money"
              size={16}
              color={theme.colors.text.secondary}
            />
            <Text
              style={[
                styles.infoText,
                {
                  fontSize: theme.typography.fontSize.body,
                  fontWeight: theme.typography.fontWeight.semiBold,
                  color: theme.colors.text.primary,
                  marginLeft: theme.spacing.xs,
                },
              ]}
            >
              {formatPrice(item.price)}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => {
    if (loading) {return null;}

    return (
      <StateScreen
        iconName="history"
        message="소유권 이전 기록이 없습니다"
        description={
          searchQuery || dateFilter !== 'all'
            ? '필터 조건을 변경해보세요'
            : '거래가 완료되면 여기에 표시됩니다'
        }
      />
    );
  };

  // Render header
  const renderHeader = () => (
    <View style={{ marginBottom: theme.spacing.md }}>
      {/* Statistics Card */}
      <Card
        style={[
          styles.statsCard,
          {
            marginBottom: theme.spacing.md,
            backgroundColor: theme.colors.primary.main,
          },
        ]}
      >
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialIcons name="swap-horiz" size={32} color="#fff" />
            <Text
              style={[
                styles.statValue,
                {
                  fontSize: theme.typography.fontSize.h3,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: '#fff',
                  marginTop: theme.spacing.xs,
                },
              ]}
            >
              {statsLoading ? '-' : totalTransfers}건
            </Text>
            <Text
              style={[
                styles.statLabel,
                {
                  fontSize: theme.typography.fontSize.caption,
                  color: '#fff',
                  opacity: 0.9,
                },
              ]}
            >
              총 이전 건수
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <MaterialIcons name="attach-money" size={32} color="#fff" />
            <Text
              style={[
                styles.statValue,
                {
                  fontSize: theme.typography.fontSize.h3,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: '#fff',
                  marginTop: theme.spacing.xs,
                },
              ]}
            >
              {statsLoading ? '-' : formatPrice(totalAmount)}
            </Text>
            <Text
              style={[
                styles.statLabel,
                {
                  fontSize: theme.typography.fontSize.caption,
                  color: '#fff',
                  opacity: 0.9,
                },
              ]}
            >
              총 거래액
            </Text>
          </View>
        </View>
      </Card>

      {/* Search Filter */}
      <InputField
        label="차량 ID 검색"
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="차량 ID를 입력하세요"
        style={{ marginBottom: theme.spacing.md }}
      />

      {/* Date Filter Buttons */}
      <View style={[styles.filterButtons, { marginBottom: theme.spacing.md }]}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor:
                dateFilter === 'all'
                  ? theme.colors.primary.main
                  : theme.colors.background.secondary,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.sm,
              flex: 1,
              marginRight: theme.spacing.xs,
            },
          ]}
          onPress={() => setDateFilter('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              {
                fontSize: theme.typography.fontSize.body,
                color:
                  dateFilter === 'all'
                    ? '#fff'
                    : theme.colors.text.primary,
                textAlign: 'center',
              },
            ]}
          >
            전체
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor:
                dateFilter === 'week'
                  ? theme.colors.primary.main
                  : theme.colors.background.secondary,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.sm,
              flex: 1,
              marginHorizontal: theme.spacing.xs,
            },
          ]}
          onPress={() => setDateFilter('week')}
        >
          <Text
            style={[
              styles.filterButtonText,
              {
                fontSize: theme.typography.fontSize.body,
                color:
                  dateFilter === 'week'
                    ? '#fff'
                    : theme.colors.text.primary,
                textAlign: 'center',
              },
            ]}
          >
            지난 7일
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor:
                dateFilter === 'month'
                  ? theme.colors.primary.main
                  : theme.colors.background.secondary,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.sm,
              flex: 1,
              marginLeft: theme.spacing.xs,
            },
          ]}
          onPress={() => setDateFilter('month')}
        >
          <Text
            style={[
              styles.filterButtonText,
              {
                fontSize: theme.typography.fontSize.body,
                color:
                  dateFilter === 'month'
                    ? '#fff'
                    : theme.colors.text.primary,
                textAlign: 'center',
              },
            ]}
          >
            지난 한 달
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <StateScreen
        iconName="hourglass-empty"
        message="로딩 중..."
        description="소유권 이전 기록을 불러오고 있습니다"
      />
    );
  }

  if (error) {
    return (
      <StateScreen
        iconName="error-outline"
        message="오류 발생"
        description={error}
        actionLabel="다시 시도"
        onActionPress={fetchTransfers}
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <FlatList
        data={filteredTransfers}
        renderItem={renderTransferItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={{
          padding: theme.spacing.md,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary.main]}
          />
        }
      />

      {/* Detail Modal */}
      <OwnershipTransferDetailModal
        isVisible={showDetailModal}
        onClose={handleCloseDetailModal}
        transferData={selectedTransfer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsCard: {},
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#fff',
    opacity: 0.3,
  },
  statValue: {},
  statLabel: {},
  filterButtons: {
    flexDirection: 'row',
  },
  filterButton: {},
  filterButtonText: {},
  transferCard: {},
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transferTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transferTypeText: {},
  dateText: {},
  transferBody: {},
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {},
});

export default AdminOwnershipHistoryScreen;
