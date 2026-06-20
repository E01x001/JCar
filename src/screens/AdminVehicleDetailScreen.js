import React, { useEffect, useState } from 'react';
import { logger } from '../utils/logger';
import { View, Text, Image, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatPrice, formatPhone } from '../utils/format';
import { useTheme } from '../theme/ThemeProvider';
import Card from '../components/Card';
import Badge from '../components/Badge';
import StateScreen from '../components/StateScreen';

const { width } = Dimensions.get('window');

const AdminVehicleDetailScreen = ({ route, navigation }) => {
  const { vehicleId } = route.params;
  const theme = useTheme();
  const [vehicle, setVehicle] = useState(null);

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      try {
        const db = getFirestore();
        const vehicleDocRef = doc(db, 'vehicles', vehicleId);
        const vehicleDoc = await getDoc(vehicleDocRef);
        if (vehicleDoc.exists()) {
          setVehicle(vehicleDoc.data());
        }
      } catch (error) {
        logger.error('차량 상세정보 불러오기 오류:', error);
      }
    };

    fetchVehicleDetails();
  }, [vehicleId]);

  if (!vehicle) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.secondary }]} edges={['bottom']}>
        <StateScreen
          icon="directions-car"
          title="차량 정보를 불러오는 중..."
          message="잠시만 기다려주세요."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.secondary }]} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingBottom: theme.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Vehicle Image */}
        <Image
          source={{ uri: vehicle.imageUrl }}
          style={[styles.image, {
            borderRadius: theme.borderRadius.lg,
            marginBottom: theme.spacing.md,
          }]}
        />

        {/* Title and Badges */}
        <View style={{ marginBottom: theme.spacing.md }}>
          <View style={[styles.badgeContainer, { marginBottom: theme.spacing.xs }]}>
            <Badge
              status={vehicle.status || 'pending'}
              label={vehicle.vehicleType || '승용차'}
            />
            <Badge
              status={vehicle.status || 'pending'}
              label={vehicle.status === 'approved' ? '승인됨' : vehicle.status === 'rejected' ? '거절됨' : '대기중'}
            />
          </View>
          <Text style={[styles.title, {
            fontSize: theme.typography.fontSize.h1,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.xs,
          }]}>{vehicle.vehicleName}</Text>
          <Text style={[styles.subTitle, {
            fontSize: theme.typography.fontSize.h3,
            fontWeight: theme.typography.fontWeight.semiBold,
            color: theme.colors.text.secondary,
          }]}>{vehicle.subModel}</Text>
        </View>

        {/* 차량 정보 Card */}
        <Card style={{ marginBottom: theme.spacing.md }}>
          <Text style={[styles.sectionTitle, {
            fontSize: theme.typography.fontSize.h3,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.sm,
          }]}>차량 정보</Text>

          {[
            { label: '제조사', value: vehicle.manufacturer },
            { label: '연식', value: vehicle.year },
            { label: '연료 종류', value: vehicle.fuelType },
            { label: '변속기', value: vehicle.transmission },
            { label: '구동 방식', value: vehicle.driveType },
            { label: '배기량', value: `${vehicle.cc} cc` },
            { label: '연비', value: `${vehicle.fuelEco} km/L` },
            { label: '연료탱크 용량', value: `${vehicle.fuelTank} L` },
            { label: '가격', value: formatPrice(vehicle.price) },
          ].map((item, index) => (
            <View
              key={index}
              style={[styles.infoRow, {
                marginBottom: index < 8 ? theme.spacing.xs : 0,
                paddingBottom: index < 8 ? theme.spacing.xs : 0,
                borderBottomWidth: index < 8 ? 1 : 0,
                borderBottomColor: theme.colors.border.light,
              }]}
            >
              <Text style={[styles.infoLabel, {
                fontSize: theme.typography.fontSize.bodySmall,
                fontWeight: theme.typography.fontWeight.semiBold,
                color: theme.colors.text.secondary,
              }]}>{item.label}</Text>
              <Text style={[styles.infoValue, {
                fontSize: theme.typography.fontSize.body,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text.primary,
              }]}>{item.value}</Text>
            </View>
          ))}
        </Card>

        {/* 부품 정보 Card */}
        <Card style={{ marginBottom: theme.spacing.md }}>
          <Text style={[styles.sectionTitle, {
            fontSize: theme.typography.fontSize.h3,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.sm,
          }]}>부품 정보</Text>

          {[
            { label: '앞 타이어', value: vehicle.frontTire },
            { label: '뒤 타이어', value: vehicle.rearTire },
            { label: '엔진 오일 용량', value: `${vehicle.engineOilLiter} L` },
            { label: '와이퍼 정보', value: vehicle.wiperInfo },
            { label: '배터리 모델', value: vehicle.battery },
          ].map((item, index) => (
            <View
              key={index}
              style={[styles.infoRow, {
                marginBottom: index < 4 ? theme.spacing.xs : 0,
                paddingBottom: index < 4 ? theme.spacing.xs : 0,
                borderBottomWidth: index < 4 ? 1 : 0,
                borderBottomColor: theme.colors.border.light,
              }]}
            >
              <Text style={[styles.infoLabel, {
                fontSize: theme.typography.fontSize.bodySmall,
                fontWeight: theme.typography.fontWeight.semiBold,
                color: theme.colors.text.secondary,
              }]}>{item.label}</Text>
              <Text style={[styles.infoValue, {
                fontSize: theme.typography.fontSize.body,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text.primary,
              }]}>{item.value}</Text>
            </View>
          ))}
        </Card>

        {/* 등록자 정보 Card */}
        <Card>
          <Text style={[styles.sectionTitle, {
            fontSize: theme.typography.fontSize.h3,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.sm,
          }]}>등록자 정보</Text>

          {[
            { label: '이름', value: vehicle.sellerName },
            { label: '전화번호', value: formatPhone(vehicle.sellerPhone) },
            { label: '이메일', value: vehicle.sellerEmail },
          ].map((item, index) => (
            <View
              key={index}
              style={[styles.infoRow, {
                marginBottom: index < 2 ? theme.spacing.xs : 0,
                paddingBottom: index < 2 ? theme.spacing.xs : 0,
                borderBottomWidth: index < 2 ? 1 : 0,
                borderBottomColor: theme.colors.border.light,
              }]}
            >
              <Text style={[styles.infoLabel, {
                fontSize: theme.typography.fontSize.bodySmall,
                fontWeight: theme.typography.fontWeight.semiBold,
                color: theme.colors.text.secondary,
              }]}>{item.label}</Text>
              <Text style={[styles.infoValue, {
                fontSize: theme.typography.fontSize.body,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text.primary,
              }]}>{item.value}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
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
  image: {
    width: width - 32,
    height: undefined,
    aspectRatio: 16 / 9,
    resizeMode: 'cover',
    alignSelf: 'center',
  },
  title: {},
  subTitle: {},
  sectionTitle: {},
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    flex: 1,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
  },
});

export default AdminVehicleDetailScreen;
