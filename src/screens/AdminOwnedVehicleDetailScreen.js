/**
 * JCar Admin - AdminOwnedVehicleDetailScreen
 *
 * Displays detailed information about an admin-owned vehicle with ability to mark as sold.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, collection, doc, onSnapshot, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import crashlytics from '@react-native-firebase/crashlytics';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';
import { formatPrice } from '../utils/format';
import Card from '../components/Card';
import Button from '../components/Button';
import StateScreen from '../components/StateScreen';
import SoldVehicleModal from '../components/SoldVehicleModal';

const AdminOwnedVehicleDetailScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const toast = useToast();
  const { vehicleId } = route.params;

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const db = getFirestore();
    const vehicleDocRef = doc(db, 'admin_owned_vehicles', vehicleId);
    const unsubscribe = onSnapshot(
      vehicleDocRef,
        (doc) => {
          if (doc.exists) {
            setVehicle({ id: doc.id, ...doc.data() });
          } else {
            setVehicle(null);
          }
          setLoading(false);
        },
        (error) => {
          console.error('AdminOwnedVehicleDetailScreen: Failed to fetch vehicle', error);
          crashlytics().recordError(error);
          crashlytics().log('AdminOwnedVehicleDetailScreen: Firestore query failed');
          toast.showError('차량 정보를 불러오는데 실패했습니다.');
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [vehicleId, toast]);

  const formatDate = (timestamp) => {
    if (!timestamp) {return '-';}
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const handleMarkAsSold = async (soldPrice) => {
    setIsUpdating(true);
    try {
      const db = getFirestore();
      const vehicleDocRef = doc(db, 'admin_owned_vehicles', vehicleId);
      await updateDoc(vehicleDocRef, {
        status: 'sold',
        soldPrice: soldPrice,
        soldDate: serverTimestamp(),
      });

      toast.showSuccess('차량이 판매완료 처리되었습니다.');
      setIsModalVisible(false);

      // Navigate back to previous screen
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (error) {
      console.error('AdminOwnedVehicleDetailScreen: Failed to mark as sold', error);
      crashlytics().recordError(error);
      crashlytics().log('AdminOwnedVehicleDetailScreen: Update failed');
      toast.showError('판매완료 처리에 실패했습니다.');
      throw error; // Re-throw for modal to handle
    } finally {
      setIsUpdating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={{
            fontSize: theme.typography.fontSize.body,
            color: theme.colors.text.secondary,
            marginTop: theme.spacing.sm,
          }}>불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state - vehicle not found
  if (!vehicle) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
        <StateScreen
          icon="error"
          title="차량을 찾을 수 없습니다"
          message="해당 차량 정보가 존재하지 않습니다."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
        {/* Vehicle Image */}
        <Card style={{ marginBottom: theme.spacing.md }}>
          {vehicle.imageUrl ? (
            <Image
              source={{ uri: vehicle.imageUrl }}
              style={[styles.vehicleImage, {
                borderRadius: theme.borderRadius.md,
              }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.placeholderImage, {
              backgroundColor: theme.colors.background.secondary,
              borderRadius: theme.borderRadius.md,
            }]}>
              <Text style={{
                fontSize: theme.typography.fontSize.h3,
                color: theme.colors.text.tertiary,
              }}>이미지 없음</Text>
            </View>
          )}
        </Card>

        {/* Vehicle Information */}
        <Card style={{ marginBottom: theme.spacing.md }}>
          <Text style={[styles.sectionTitle, {
            fontSize: theme.typography.fontSize.h3,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.md,
          }]}>차량 정보</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.label, {
              fontSize: theme.typography.fontSize.body,
              color: theme.colors.text.secondary,
            }]}>차량명</Text>
            <Text style={[styles.value, {
              fontSize: theme.typography.fontSize.body,
              fontWeight: theme.typography.fontWeight.semiBold,
              color: theme.colors.text.primary,
            }]}>{vehicle.vehicleName || '-'}</Text>
          </View>

          <View style={[styles.infoRow, { marginTop: theme.spacing.sm }]}>
            <Text style={[styles.label, {
              fontSize: theme.typography.fontSize.body,
              color: theme.colors.text.secondary,
            }]}>상태</Text>
            <Text style={[styles.value, {
              fontSize: theme.typography.fontSize.body,
              fontWeight: theme.typography.fontWeight.semiBold,
              color: vehicle.status === 'owned' ? theme.colors.success.main : theme.colors.text.tertiary,
            }]}>{vehicle.status === 'owned' ? '소유중' : '판매완료'}</Text>
          </View>
        </Card>

        {/* Purchase Information */}
        <Card style={{ marginBottom: theme.spacing.md }}>
          <Text style={[styles.sectionTitle, {
            fontSize: theme.typography.fontSize.h3,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.md,
          }]}>매입 정보</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.label, {
              fontSize: theme.typography.fontSize.body,
              color: theme.colors.text.secondary,
            }]}>매입가</Text>
            <Text style={[styles.value, {
              fontSize: theme.typography.fontSize.body,
              fontWeight: theme.typography.fontWeight.semiBold,
              color: theme.colors.text.primary,
            }]}>{formatPrice(vehicle.purchasePrice || 0)}</Text>
          </View>

          <View style={[styles.infoRow, { marginTop: theme.spacing.sm }]}>
            <Text style={[styles.label, {
              fontSize: theme.typography.fontSize.body,
              color: theme.colors.text.secondary,
            }]}>매입일</Text>
            <Text style={[styles.value, {
              fontSize: theme.typography.fontSize.body,
              fontWeight: theme.typography.fontWeight.semiBold,
              color: theme.colors.text.primary,
            }]}>{formatDate(vehicle.purchaseDate)}</Text>
          </View>
        </Card>

        {/* Sale Information (if sold) */}
        {vehicle.status === 'sold' && (
          <Card style={{ marginBottom: theme.spacing.md }}>
            <Text style={[styles.sectionTitle, {
              fontSize: theme.typography.fontSize.h3,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.md,
            }]}>판매 정보</Text>

            <View style={styles.infoRow}>
              <Text style={[styles.label, {
                fontSize: theme.typography.fontSize.body,
                color: theme.colors.text.secondary,
              }]}>판매가</Text>
              <Text style={[styles.value, {
                fontSize: theme.typography.fontSize.body,
                fontWeight: theme.typography.fontWeight.semiBold,
                color: theme.colors.text.primary,
              }]}>{formatPrice(vehicle.soldPrice || 0)}</Text>
            </View>

            <View style={[styles.infoRow, { marginTop: theme.spacing.sm }]}>
              <Text style={[styles.label, {
                fontSize: theme.typography.fontSize.body,
                color: theme.colors.text.secondary,
              }]}>판매일</Text>
              <Text style={[styles.value, {
                fontSize: theme.typography.fontSize.body,
                fontWeight: theme.typography.fontWeight.semiBold,
                color: theme.colors.text.primary,
              }]}>{formatDate(vehicle.soldDate)}</Text>
            </View>

            <View style={[styles.infoRow, { marginTop: theme.spacing.sm }]}>
              <Text style={[styles.label, {
                fontSize: theme.typography.fontSize.body,
                color: theme.colors.text.secondary,
              }]}>수익</Text>
              <Text style={[styles.value, {
                fontSize: theme.typography.fontSize.body,
                fontWeight: theme.typography.fontWeight.bold,
                color: (vehicle.soldPrice || 0) - (vehicle.purchasePrice || 0) >= 0
                  ? theme.colors.success.main
                  : theme.colors.error.main,
              }]}>{formatPrice((vehicle.soldPrice || 0) - (vehicle.purchasePrice || 0))}</Text>
            </View>
          </Card>
        )}

        {/* Mark as Sold Button (only if status is 'owned') */}
        {vehicle.status === 'owned' && (
          <Button
            variant="success"
            title="판매완료 처리"
            onPress={() => setIsModalVisible(true)}
            disabled={isUpdating}
            style={{ marginTop: theme.spacing.md }}
          />
        )}
      </ScrollView>

      {/* Sold Vehicle Modal */}
      <SoldVehicleModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleMarkAsSold}
        vehicleId={vehicleId}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleImage: {
    width: '100%',
    height: 240,
  },
  placeholderImage: {
    width: '100%',
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {},
  value: {},
});

export default AdminOwnedVehicleDetailScreen;
