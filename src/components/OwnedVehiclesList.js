/**
 * JCar Design System - OwnedVehiclesList Component
 *
 * Displays admin's owned vehicles in a horizontal scrollable list.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';
import { getAdminOwnedVehicles } from '../services/firebaseService';
import { formatPrice } from '../utils/format';
import Card from './Card';
import StateScreen from './StateScreen';

/**
 * OwnedVehiclesList Component
 *
 * @param {Object} props
 * @param {Function} [props.onVehiclePress] - Handler for vehicle card press
 */
const OwnedVehiclesList = ({ onVehiclePress }) => {
  const theme = useTheme();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOwnedVehicles();
  }, []);

  /**
   * Fetch owned vehicles from Firestore
   */
  const fetchOwnedVehicles = async () => {
    try {
      setLoading(true);
      const result = await getAdminOwnedVehicles('owned');
      if (result.success) {
        setVehicles(result.vehicles);
      }
    } catch (error) {
      console.error('보유 차량 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format purchase date
   */
  const formatDate = (timestamp) => {
    if (!timestamp) {return '-';}
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  /**
   * Render individual vehicle card
   */
  const renderVehicleCard = ({ item }) => (
    <Card
      style={[
        styles.vehicleCard,
        {
          width: 280,
          marginRight: theme.spacing.md,
        },
      ]}
      onPress={() => onVehiclePress && onVehiclePress(item)}
    >
      {/* Vehicle Image Placeholder */}
      <View
        style={[
          styles.imagePlaceholder,
          {
            backgroundColor: theme.colors.background.secondary,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.sm,
          },
        ]}
      >
        <Text
          style={{
            fontSize: theme.typography.fontSize.bodySmall,
            color: theme.colors.text.tertiary,
          }}
        >
          차량 이미지
        </Text>
      </View>

      {/* Vehicle Name */}
      <Text
        style={[
          styles.vehicleName,
          {
            fontSize: theme.typography.fontSize.h4,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.xs,
          },
        ]}
        numberOfLines={1}
      >
        {item.vehicleName}
      </Text>

      {/* Purchase Info */}
      <View style={{ marginTop: theme.spacing.xs }}>
        <Text
          style={[
            styles.infoText,
            {
              fontSize: theme.typography.fontSize.bodySmall,
              color: theme.colors.text.secondary,
            },
          ]}
        >
          구매 금액: {formatPrice(item.purchasePrice)}
        </Text>

        <Text
          style={[
            styles.infoText,
            {
              fontSize: theme.typography.fontSize.bodySmall,
              color: theme.colors.text.secondary,
              marginTop: theme.spacing.xxs,
            },
          ]}
        >
          구매일: {formatDate(item.purchaseDate)}
        </Text>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={{ minHeight: 150, justifyContent: 'center' }}>
        <Text
          style={{
            fontSize: theme.typography.fontSize.body,
            color: theme.colors.text.secondary,
            textAlign: 'center',
          }}
        >
          로딩 중...
        </Text>
      </View>
    );
  }

  if (vehicles.length === 0) {
    return (
      <View style={{ minHeight: 150 }}>
        <StateScreen
          icon="directions-car"
          title="보유 차량이 없습니다"
          message="아직 보유한 차량이 없습니다."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={vehicles}
        renderItem={renderVehicleCard}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  vehicleCard: {
    padding: 16,
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleName: {},
  infoText: {},
});

OwnedVehiclesList.propTypes = {
  onVehiclePress: PropTypes.func,
};

export default OwnedVehiclesList;
