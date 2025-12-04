import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { formatPhone, formatPrice } from '../../../utils/format';
import Card from '../../../components/Card';
import Badge from '../../../components/Badge';
import StateScreen from '../../../components/StateScreen';

const CompletedConsultationsTab = ({ consultations, onNavigateToVehicle }) => {
  const theme = useTheme();
  const [selectedMonth, setSelectedMonth] = useState('all');

  const completedConsultations = consultations.filter(
    c => c.consultationStatus === 'completed'
  );

  const months = useMemo(() => {
    const monthSet = new Set();
    completedConsultations.forEach(c => {
      if (c.completedAt) {
        const date = c.completedAt.toDate ? c.completedAt.toDate() : new Date(c.completedAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthSet.add(monthKey);
      }
    });
    return ['all', ...Array.from(monthSet).sort().reverse()];
  }, [completedConsultations]);

  const filteredConsultations = useMemo(() => {
    if (selectedMonth === 'all') {
      return completedConsultations;
    }
    return completedConsultations.filter(c => {
      if (!c.completedAt) {return false;}
      const date = c.completedAt.toDate ? c.completedAt.toDate() : new Date(c.completedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === selectedMonth;
    });
  }, [completedConsultations, selectedMonth]);

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

  const renderItem = (item) => (
    <TouchableOpacity key={item.id} onPress={() => onNavigateToVehicle(item.vehicleId)}>
      <Card style={{ marginBottom: theme.spacing.sm }}>
        <View style={styles.header}>
          <Badge
            status={getTypeBadgeStatus(item.type)}
            label={getTypeLabel(item.type)}
          />
          <Badge
            status="completed"
            label="거래완료"
          />
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
          }]}>완료일: {formatDate(item.completedAt)}</Text>

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
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
      }}
    >
      {/* Month Filter */}
      <Card style={{ marginBottom: theme.spacing.md }}>
        <Text style={[styles.filterTitle, {
          fontSize: theme.typography.fontSize.body,
          fontWeight: theme.typography.fontWeight.semiBold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.sm,
        }]}>기간 선택</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.monthFilterRow}>
            {months.map(month => (
              <TouchableOpacity
                key={month}
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
            ))}
          </View>
        </ScrollView>
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

      {/* Completed Consultations List */}
      {filteredConsultations.length === 0 ? (
        <StateScreen
          icon="search"
          title="검색 결과가 없습니다"
          message="선택한 기간에 완료된 거래가 없습니다."
        />
      ) : (
        filteredConsultations.map(item => renderItem(item))
      )}
    </ScrollView>
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
