/**
 * JCar - AdminOwnedVehicleDetailScreen
 *
 * Displays detailed information about an admin-owned vehicle and allows marking it as sold.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatPrice } from '../utils/format';
import { useTheme } from '../theme/ThemeProvider';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import StateScreen from '../components/StateScreen';
import SoldVehicleModal from '../components/SoldVehicleModal';

const AdminOwnedVehicleDetailScreen = ({ route, navigation }) => {
  const { vehicleId } = route.params;
  const theme = useTheme();
  const [vehicle, setVehicle] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicleDetails();
  }, [vehicleId]);

  /**
   * Fetch vehicle details from Firestore
   */
  const fetchVehicleDetails = async () => {
    try {
      setLoading(true);
      const vehicleDoc = await firestore()
        .collection('admin_owned_vehicles')
        .doc(vehicleId)
        .get();

      if (vehicleDoc.exists) {
        setVehicle({ id: vehicleDoc.id, ...vehicleDoc.data() });
      }
    } catch (error) {
      console.error('차량 상세정보 불러오기 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format date
   */
  const formatDate = (timestamp) => {
    if (!timestamp) {return '-';}
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  /**
   * Get status badge configuration
   */
  const getStatusBadge = (status) => {
    if (status === 'sold') {
      return { status: 'completed', label: '판매완료' };
    }
    return { status: 'approved', label: '보유중' };
  };

  /**
   * Calculate profit/loss
   */
  const calculateProfit = () => {
    if (!vehicle || !vehicle.soldPrice) {return null;}
    return vehicle.soldPrice - (vehicle.purchasePrice || 0);
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.colors.background.secondary }]}
        edges={['bottom']}
      >
        <StateScreen
          icon="directions-car"
          title="차량 정보를 불러오는 중..."
          message="잠시만 기다려주세요."
        />
      </SafeAreaView>
    );
  }

  if (!vehicle) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.colors.background.secondary }]}
        edges={['bottom']}
      >
        <StateScreen
          icon="error"
          title="차량을 찾을 수 없습니다"
          message="요청하신 차량 정보를 찾을 수 없습니다."
        />
      </SafeAreaView>
    );
  }

  const statusBadge = getStatusBadge(vehicle.status);
  const profit = calculateProfit();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background.secondary }]}
      edges={['bottom']}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
          paddingBottom: theme.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View style={{ marginBottom: theme.spacing.md }}>
          <Badge status={statusBadge.status} label={statusBadge.label} />
        </View>

        {/* Vehicle Name */}
        <Text
          style={[
            styles.title,
            {
              fontSize: theme.typography.fontSize.h1,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.lg,
            },
          ]}
        >
          {vehicle.vehicleName}
        </Text>

        {/* Purchase Information Card */}
        <Card style={{ marginBottom: theme.spacing.md }}>
          <Text
            style={[
              styles.sectionTitle,
              {
                fontSize: theme.typography.fontSize.h3,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text.primary,
                marginBottom: theme.spacing.sm,
              },
            ]}
          >
            구매 정보
          </Text>

          {[
            { label: '구매 금액', value: formatPrice(vehicle.purchasePrice || 0) },
            { label: '구매일', value: formatDate(vehicle.purchaseDate) },
            { label: '이전 소유자', value: vehicle.previousOwnerName || '-' },
          ].map((item, index) => (
            <View
              key={index}
              style={[
                styles.infoRow,
                {
                  paddingVertical: theme.spacing.xs,
                  borderBottomWidth: index < 2 ? 1 : 0,
                  borderBottomColor: theme.colors.border.light,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: theme.typography.fontSize.body,
                  color: theme.colors.text.secondary,
                  flex: 1,
                }}
              >
                {item.label}
              </Text>
              <Text
                style={{
                  fontSize: theme.typography.fontSize.body,
                  fontWeight: theme.typography.fontWeight.semiBold,
                  color: theme.colors.text.primary,
                  flex: 1,
                  textAlign: 'right',
                }}
              >
                {item.value}
              </Text>
            </View>
          ))}
        </Card>

        {/* Sale Information Card (if sold) */}
        {vehicle.status === 'sold' && (
          <Card style={{ marginBottom: theme.spacing.md }}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  fontSize: theme.typography.fontSize.h3,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing.sm,
                },
              ]}
            >
              판매 정보
            </Text>

            {[
              { label: '판매 금액', value: formatPrice(vehicle.soldPrice || 0) },
              { label: '판매일', value: formatDate(vehicle.soldDate) },
            ].map((item, index) => (
              <View
                key={index}
                style={[
                  styles.infoRow,
                  {
                    paddingVertical: theme.spacing.xs,
                    borderBottomWidth: index < 1 ? 1 : 0,
                    borderBottomColor: theme.colors.border.light,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: theme.typography.fontSize.body,
                    color: theme.colors.text.secondary,
                    flex: 1,
                  }}
                >
                  {item.label}
                </Text>
                <Text
                  style={{
                    fontSize: theme.typography.fontSize.body,
                    fontWeight: theme.typography.fontWeight.semiBold,
                    color: theme.colors.text.primary,
                    flex: 1,
                    textAlign: 'right',
                  }}
                >
                  {item.value}
                </Text>
              </View>
            ))}

            {/* Profit/Loss Display */}
            {profit !== null && (
              <View
                style={{
                  marginTop: theme.spacing.md,
                  padding: theme.spacing.sm,
                  backgroundColor: theme.colors.background.secondary,
                  borderRadius: theme.borderRadius.md,
                }}
              >
                <Text
                  style={{
                    fontSize: theme.typography.fontSize.bodySmall,
                    color: theme.colors.text.secondary,
                    marginBottom: theme.spacing.xxs,
                  }}
                >
                  수익/손실
                </Text>
                <Text
                  style={{
                    fontSize: theme.typography.fontSize.h3,
                    fontWeight: theme.typography.fontWeight.bold,
                    color: profit >= 0 ? theme.colors.success.main : theme.colors.danger.main,
                  }}
                >
                  {profit >= 0 ? '+' : ''}
                  {formatPrice(profit)}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Action Button - Only show if vehicle is still owned */}
        {vehicle.status === 'owned' && (
          <Button
            variant="primary"
            title="판매완료 처리"
            onPress={() => setModalVisible(true)}
            style={{ marginTop: theme.spacing.md }}
          />
        )}
      </ScrollView>

      {/* Sold Vehicle Modal */}
      <SoldVehicleModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        vehicle={vehicle}
        onComplete={() => {
          fetchVehicleDetails();
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  title: {},
  sectionTitle: {},
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AdminOwnedVehicleDetailScreen;
