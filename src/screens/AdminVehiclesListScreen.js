import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
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
  const [deletingVehicleId, setDeletingVehicleId] = useState(null);

  useEffect(() => {
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

    fetchVehicles();
  }, []);

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
                <Badge label={item.vehicleType || '승용차'} />
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
      {/* Loading State */}
      {loading ? (
        <View style={{ paddingHorizontal: theme.spacing.md }}>
          <SkeletonLoader count={4} height={120} />
        </View>
      ) : (
        <FlatList
          data={vehicles}
          renderItem={renderVehicle}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <StateScreen
              icon="directions-car"
              title="등록된 차량이 없습니다"
              message="차량을 등록해주세요."
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
