/**
 * JCar Design System - OwnedVehiclesList Component
 *
 * Displays a horizontally scrollable list of admin-owned vehicles.
 */

import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';
import firestore from '@react-native-firebase/firestore';
import crashlytics from '@react-native-firebase/crashlytics';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { formatPrice } from '../utils/format';
import Card from './Card';
import StateScreen from './StateScreen';

/**
 * OwnedVehiclesList Component
 *
 * @param {Object} props
 * @param {Function} [props.onVehiclePress] - Callback when vehicle card is pressed
 */
const OwnedVehiclesList = ({ onVehiclePress }) => {
  const { user, role } = useContext(AuthContext);
  const theme = useTheme();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Don't fetch vehicles if user is not authenticated or not admin
    if (!user || role !== 'admin') {
      setVehicles([]);
      setLoading(false);
      return () => {};
    }
    const unsubscribe = firestore()
      .collection('admin_owned_vehicles')
      .where('status', '==', 'owned')
      .orderBy('purchaseDate', 'desc')
      .onSnapshot(
        (snapshot) => {
          const vehicleList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          setVehicles(vehicleList);
          setLoading(false);
        },
        (error) => {
          console.error('OwnedVehiclesList: Failed to fetch vehicles', error);
          crashlytics().recordError(error);
          crashlytics().log('OwnedVehiclesList: Firestore query failed');
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [user, role]);

  const formatDate = (timestamp) => {
    if (!timestamp) {return '-';}
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const renderVehicleItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => onVehiclePress && onVehiclePress(item.id)}
      activeOpacity={0.7}
    >
      <Card style={[styles.vehicleCard, {
        marginRight: theme.spacing.md,
        width: 280,
      }]}>
        {/* Vehicle Image */}
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={[styles.vehicleImage, {
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.sm,
            }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholderImage, {
            backgroundColor: theme.colors.background.secondary,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.sm,
          }]}>
            <Text style={{
              fontSize: theme.typography.fontSize.body,
              color: theme.colors.text.tertiary,
            }}>이미지 없음</Text>
          </View>
        )}

        {/* Vehicle Name */}
        <Text style={[styles.vehicleName, {
          fontSize: theme.typography.fontSize.h4,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        }]} numberOfLines={1}>{item.vehicleName || '차량명 없음'}</Text>

        {/* Purchase Price */}
        <Text style={[styles.infoText, {
          fontSize: theme.typography.fontSize.bodySmall,
          color: theme.colors.text.secondary,
          marginBottom: theme.spacing.xxs,
        }]}>매입가: {formatPrice(item.purchasePrice || 0)}</Text>

        {/* Purchase Date */}
        <Text style={[styles.infoText, {
          fontSize: theme.typography.fontSize.bodySmall,
          color: theme.colors.text.secondary,
        }]}>매입일: {formatDate(item.purchaseDate)}</Text>
      </Card>
    </TouchableOpacity>
  );

  // Loading state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, {
        paddingVertical: theme.spacing.xl,
      }]}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
        <Text style={{
          fontSize: theme.typography.fontSize.body,
          color: theme.colors.text.secondary,
          marginTop: theme.spacing.sm,
        }}>불러오는 중...</Text>
      </View>
    );
  }

  // Empty state
  if (vehicles.length === 0) {
    return (
      <StateScreen
        icon="directions-car"
        title="소유 차량이 없습니다"
        message="아직 매입한 차량이 없습니다."
      />
    );
  }

  // Vehicle list
  return (
    <FlatList
      data={vehicles}
      renderItem={renderVehicleItem}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.md,
      }}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCard: {},
  vehicleImage: {
    width: '100%',
    height: 160,
  },
  placeholderImage: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleName: {},
  infoText: {},
});

OwnedVehiclesList.propTypes = {
  onVehiclePress: PropTypes.func,
};

export default OwnedVehiclesList;
