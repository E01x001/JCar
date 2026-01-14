import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { formatPhone, formatPrice } from '../../../utils/format';
import { fetchCompletedConsultationsPaginated } from '../../../services/consultation/consultationQueryService';
import Card from '../../../components/Card';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import StateScreen from '../../../components/StateScreen';

const CompletedConsultationsTab = ({ consultations: initialConsultations, onNavigateToVehicle }) => {
  const theme = useTheme();
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Task 58: Pagination state
  const [consultationsData, setConsultationsData] = useState([]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [usePagination] = useState(false); // Toggle for pagination mode

  // Use real-time data from parent or paginated data
  const completedConsultations = usePagination ? consultationsData : initialConsultations;

  const months = useMemo(() => {
    const monthSet = new Set();
    completedConsultations.forEach(c => {
      // Task 50: Check both completedAt and archivedAt for month extraction
      const timestamp = c.archivedAt || c.completedAt;
      if (timestamp) {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthSet.add(monthKey);
      }
    });
    return ['all', ...Array.from(monthSet).sort().reverse()];
  }, [completedConsultations]);

  const filteredConsultations = useMemo(() => {
    let filtered = completedConsultations;

    // Filter by month
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(c => {
        // Task 50: Check both completedAt and archivedAt
        const timestamp = c.archivedAt || c.completedAt;
        if (!timestamp) {return false;}
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === selectedMonth;
      });
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(c => {
        if (selectedType === 'buy') {return c.type !== 'sell';}
        if (selectedType === 'sell') {return c.type === 'sell';}
        return true;
      });
    }

    return filtered;
  }, [completedConsultations, selectedMonth, selectedType]);

  const statistics = useMemo(() => {
    const totalCount = filteredConsultations.length;
    const buyCount = filteredConsultations.filter(c => c.type !== 'sell').length;
    const sellCount = filteredConsultations.filter(c => c.type === 'sell').length;
    const totalAmount = filteredConsultations.reduce((sum, c) => sum + (c.dealAmount || 0), 0);
    const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    return {
      totalCount,
      buyCount,
      sellCount,
      totalAmount,
      averageAmount,
    };
  }, [filteredConsultations]);

  const formatMonthLabel = (monthKey) => {
    if (monthKey === 'all') {return '전체';}
    const [year, month] = monthKey.split('-');
    return `${year}년 ${month}월`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) {return '-';}
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const getTypeLabel = (type) => {
    return type === 'sell' ? '판매상담' : '구매상담';
  };

  const getTypeBadgeStatus = (type) => {
    return type === 'sell' ? 'warning' : 'success';
  };

  // Task 58: Load initial page on mount or filter change
  useEffect(() => {
    if (!usePagination) {return;}

    const loadInitialData = async () => {
      setInitialLoading(true);
      const result = await fetchCompletedConsultationsPaginated({
        limit: 20,
        monthFilter: selectedMonth,
        typeFilter: selectedType,
      });

      setConsultationsData(result.consultations);
      setLastVisibleDoc(result.lastVisibleDoc);
      setHasMore(result.hasMore);
      setInitialLoading(false);
    };

    loadInitialData();
  }, [usePagination, selectedMonth, selectedType]);

  // Task 58: Load more consultations function
  const loadMoreConsultations = useCallback(async () => {
    if (!hasMore || loadingMore) {return;}

    setLoadingMore(true);
    const result = await fetchCompletedConsultationsPaginated({
      limit: 20,
      startAfterDoc: lastVisibleDoc,
      monthFilter: selectedMonth,
      typeFilter: selectedType,
    });

    setConsultationsData(prev => [...prev, ...result.consultations]);
    setLastVisibleDoc(result.lastVisibleDoc);
    setHasMore(result.hasMore);
    setLoadingMore(false);
  }, [hasMore, loadingMore, lastVisibleDoc, selectedMonth, selectedType]);

  const renderItem = ({ item }) => {
    // Task 50: Determine status badge based on consultationStatus
    const isArchived = item.consultationStatus === 'archived';
    const statusBadgeLabel = isArchived ? '보관됨' : '거래완료';
    const statusBadgeStatus = isArchived ? 'archived' : 'completed';
    const completionDate = item.archivedAt || item.completedAt;

    return (
      <TouchableOpacity key={item.id} onPress={() => onNavigateToVehicle(item.vehicleId)}>
        <Card style={{ marginBottom: theme.spacing.sm }}>
          <View style={styles.header}>
            <Badge
              status={getTypeBadgeStatus(item.type)}
              label={getTypeLabel(item.type)}
            />
            <Badge
              status={statusBadgeStatus}
              label={statusBadgeLabel}
            />
            {item.isOwnershipTransferred && (
              <Badge
                status="success"
                label="소유권이전"
              />
            )}
          </View>

          <Text style={[styles.vehicleName, {
            fontSize: theme.typography.fontSize.h4,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text.primary,
            marginTop: theme.spacing.sm,
          }]}>{item.vehicleName}</Text>

          <View style={{ marginTop: theme.spacing.sm }}>
            <Text style={[styles.infoText, {
              fontSize: theme.typography.fontSize.bodySmall,
              color: theme.colors.text.secondary,
            }]}>고객명: {item.userName} ({formatPhone(item.userPhone)})</Text>

            <Text style={[styles.infoText, {
              fontSize: theme.typography.fontSize.bodySmall,
              color: theme.colors.text.secondary,
              marginTop: theme.spacing.xxs,
            }]}>거래 금액: {formatPrice(item.dealAmount || 0)}</Text>

            <Text style={[styles.infoText, {
              fontSize: theme.typography.fontSize.bodySmall,
              color: theme.colors.text.secondary,
              marginTop: theme.spacing.xxs,
            }]}>{isArchived ? '보관일' : '완료일'}: {formatDate(completionDate)}</Text>

            {item.adminNotes && (
              <Text style={[styles.infoText, {
                fontSize: theme.typography.fontSize.bodySmall,
                color: theme.colors.text.tertiary,
                marginTop: theme.spacing.xs,
                fontStyle: 'italic',
              }]}>메모: {item.adminNotes}</Text>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  // Task 58: Render Load More button
  const renderLoadMoreButton = () => {
    if (!usePagination || !hasMore) {return null;}

    if (loadingMore) {
      return (
        <View style={{ paddingVertical: theme.spacing.lg, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={{
            marginTop: theme.spacing.sm,
            fontSize: theme.typography.fontSize.bodySmall,
            color: theme.colors.text.secondary,
          }}>불러오는 중...</Text>
        </View>
      );
    }

    return (
      <View style={{ paddingVertical: theme.spacing.md }}>
        <Button
          title="더 보기"
          onPress={loadMoreConsultations}
          variant="outline"
        />
      </View>
    );
  };

  // Task 58: Render header with filters
  const renderListHeader = () => (
    <>
      {/* Month Filter */}
      <Card style={{ marginBottom: theme.spacing.md }}>
        <Text style={[styles.filterTitle, {
          fontSize: theme.typography.fontSize.body,
          fontWeight: theme.typography.fontWeight.semiBold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.sm,
        }]}>기간 선택</Text>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={months}
          keyExtractor={(item) => item}
          renderItem={({ item: month }) => (
            <TouchableOpacity
              style={[
                styles.monthButton,
                {
                  backgroundColor: selectedMonth === month
                    ? theme.colors.primary.main
                    : theme.colors.background.secondary,
                  borderRadius: theme.borderRadius.md,
                  paddingVertical: theme.spacing.xs,
                  paddingHorizontal: theme.spacing.sm,
                  marginRight: theme.spacing.xs,
                },
              ]}
              onPress={() => setSelectedMonth(month)}
            >
              <Text style={{
                fontSize: theme.typography.fontSize.bodySmall,
                fontWeight: theme.typography.fontWeight.medium,
                color: selectedMonth === month
                  ? theme.colors.text.white
                  : theme.colors.text.secondary,
              }}>{formatMonthLabel(month)}</Text>
            </TouchableOpacity>
          )}
        />
      </Card>

      {/* Type Filter */}
      <Card style={{ marginBottom: theme.spacing.md }}>
        <Text style={[styles.filterTitle, {
          fontSize: theme.typography.fontSize.body,
          fontWeight: theme.typography.fontWeight.semiBold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.sm,
        }]}>상담 유형</Text>

        <View style={styles.typeFilterRow}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              {
                backgroundColor: selectedType === 'all'
                  ? theme.colors.primary.main
                  : theme.colors.background.secondary,
                borderRadius: theme.borderRadius.md,
                paddingVertical: theme.spacing.xs,
                paddingHorizontal: theme.spacing.md,
                marginRight: theme.spacing.xs,
                flex: 1,
              },
            ]}
            onPress={() => setSelectedType('all')}
          >
            <Text style={{
              fontSize: theme.typography.fontSize.bodySmall,
              fontWeight: theme.typography.fontWeight.medium,
              color: selectedType === 'all'
                ? theme.colors.text.white
                : theme.colors.text.secondary,
              textAlign: 'center',
            }}>전체</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              {
                backgroundColor: selectedType === 'buy'
                  ? theme.colors.primary.main
                  : theme.colors.background.secondary,
                borderRadius: theme.borderRadius.md,
                paddingVertical: theme.spacing.xs,
                paddingHorizontal: theme.spacing.md,
                marginHorizontal: theme.spacing.xs,
                flex: 1,
              },
            ]}
            onPress={() => setSelectedType('buy')}
          >
            <Text style={{
              fontSize: theme.typography.fontSize.bodySmall,
              fontWeight: theme.typography.fontWeight.medium,
              color: selectedType === 'buy'
                ? theme.colors.text.white
                : theme.colors.text.secondary,
              textAlign: 'center',
            }}>구매상담</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeButton,
              {
                backgroundColor: selectedType === 'sell'
                  ? theme.colors.primary.main
                  : theme.colors.background.secondary,
                borderRadius: theme.borderRadius.md,
                paddingVertical: theme.spacing.xs,
                paddingHorizontal: theme.spacing.md,
                marginLeft: theme.spacing.xs,
                flex: 1,
              },
            ]}
            onPress={() => setSelectedType('sell')}
          >
            <Text style={{
              fontSize: theme.typography.fontSize.bodySmall,
              fontWeight: theme.typography.fontWeight.medium,
              color: selectedType === 'sell'
                ? theme.colors.text.white
                : theme.colors.text.secondary,
              textAlign: 'center',
            }}>판매상담</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Statistics Card */}
      <Card style={{ marginBottom: theme.spacing.md }}>
        <Text style={[styles.statsTitle, {
          fontSize: theme.typography.fontSize.h4,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.sm,
        }]}>통계</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, {
              fontSize: theme.typography.fontSize.bodySmall,
              color: theme.colors.text.secondary,
            }]}>총 거래</Text>
            <Text style={[styles.statValue, {
              fontSize: theme.typography.fontSize.h3,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.primary.main,
              marginTop: theme.spacing.xxs,
            }]}>{statistics.totalCount}건</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, {
              fontSize: theme.typography.fontSize.bodySmall,
              color: theme.colors.text.secondary,
            }]}>구매/판매</Text>
            <Text style={[styles.statValue, {
              fontSize: theme.typography.fontSize.h3,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text.primary,
              marginTop: theme.spacing.xxs,
            }]}>{statistics.buyCount} / {statistics.sellCount}</Text>
          </View>
        </View>

        <View style={[styles.statsRow, { marginTop: theme.spacing.sm }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, {
              fontSize: theme.typography.fontSize.bodySmall,
              color: theme.colors.text.secondary,
            }]}>총 거래 금액</Text>
            <Text style={[styles.statValue, {
              fontSize: theme.typography.fontSize.h4,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.success.main,
              marginTop: theme.spacing.xxs,
            }]}>{formatPrice(statistics.totalAmount)}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, {
              fontSize: theme.typography.fontSize.bodySmall,
              color: theme.colors.text.secondary,
            }]}>평균 거래 금액</Text>
            <Text style={[styles.statValue, {
              fontSize: theme.typography.fontSize.h4,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text.primary,
              marginTop: theme.spacing.xxs,
            }]}>{formatPrice(statistics.averageAmount)}</Text>
          </View>
        </View>
      </Card>
    </>
  );

  if (initialLoading && usePagination) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
      </View>
    );
  }

  if (completedConsultations.length === 0) {
    return (
      <StateScreen
        icon="check-circle"
        title="거래완료 내역이 없습니다"
        message="완료된 거래가 없습니다."
      />
    );
  }

  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
      }}
      data={filteredConsultations}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={renderListHeader}
      ListFooterComponent={renderLoadMoreButton}
      onEndReached={usePagination ? loadMoreConsultations : undefined}
      onEndReachedThreshold={0.5}
    />
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleName: {},
  infoText: {},
  filterTitle: {},
  monthFilterRow: {
    flexDirection: 'row',
  },
  monthButton: {},
  typeFilterRow: {
    flexDirection: 'row',
  },
  typeButton: {},
  statsTitle: {},
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {},
  statValue: {},
});

export default CompletedConsultationsTab;
