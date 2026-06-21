import React, { useEffect, useState, useContext } from 'react';
import { logger } from '../utils/logger';
import { AuthContext } from '../context/AuthContext';
import { PRICE_HIDDEN_LABEL } from '../utils/vehiclePrice';
import { DEAL_STAGE_LABELS, DEAL_STAGE_BADGE_STATUS } from '../constants/vehicle';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { getFirestore, doc, onSnapshot } from '@react-native-firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from '@react-native-firebase/auth';
import { formatPrice } from '../utils/format';
import { useTheme } from '../theme/ThemeProvider';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ImageCarousel from '../components/ImageCarousel';

const { width } = Dimensions.get('window');

const VehicleDetailScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const { role } = useContext(AuthContext);
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState(null);
  const [isOwnVehicle, setIsOwnVehicle] = useState(false);
  const [isSold, setIsSold] = useState(false);

  useEffect(() => {
    const db = getFirestore();
    const vehicleDocRef = doc(db, 'vehicles', vehicleId);
    const currentUser = getAuth().currentUser;

    // Realtime subscription so status changes (e.g. → 'sold') reflect live while
    // the buyer is viewing — otherwise they could request a consultation on a
    // car that was just sold.
    const unsubscribe = onSnapshot(
      vehicleDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const vehicleData = snapshot.data();
          setVehicle(vehicleData);
          setIsSold(vehicleData.status === 'sold');
          const ownerId = vehicleData.currentOwnerId || vehicleData.sellerId;
          setIsOwnVehicle(!!currentUser && currentUser.uid === ownerId);
        }
      },
      (error) => {
        logger.error('차량 상세정보 구독 오류:', error);
      }
    );

    return () => unsubscribe();
  }, [vehicleId]);

  const handleConsultationRequest = () => {
    navigation.navigate('ConsultationRequest', {
      vehicle,
      isSell: isOwnVehicle, // ✅ 판매자면 true 전달
    });
  };

  if (!vehicle) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{
          fontSize: theme.typography.fontSize.body,
          color: theme.colors.text.secondary,
        }}>차량 정보를 불러오는 중...</Text>
      </View>
    );
  }

  const InfoRow = ({ label, value, isLast = false }) => (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
      <Text style={[styles.infoLabel, { color: theme.colors.text.secondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.colors.text.primary }]}>{value || '-'}</Text>
    </View>
  );

  const InfoGroup = ({ children }) => (
    <View style={[styles.infoGroup, { backgroundColor: theme.colors.background.secondary }]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.primary }]} edges={['bottom']}>
      <ScrollView
        style={[styles.container, {
          padding: theme.spacing.md,
          backgroundColor: theme.colors.background.secondary,
        }]}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <ImageCarousel
          images={vehicle.imageUrls || (vehicle.imageUrl ? [vehicle.imageUrl] : [])}
          style={{ marginBottom: theme.spacing.md }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
          <Badge status="completed" label={vehicle.vehicleType || '승용차'} />
          {DEAL_STAGE_LABELS[vehicle.dealStage] ? (
            <Badge
              variant="chip"
              status={DEAL_STAGE_BADGE_STATUS[vehicle.dealStage]}
              label={DEAL_STAGE_LABELS[vehicle.dealStage]}
              style={styles.stageBadge}
            />
          ) : null}
        </View>

        <Text style={[styles.title, {
          fontSize: theme.typography.fontSize.h2,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.xs,
        }]}>{vehicle.vehicleName}</Text>

        <Text style={[styles.subTitle, {
          fontSize: theme.typography.fontSize.h4,
          fontWeight: theme.typography.fontWeight.semiBold,
          color: theme.colors.text.secondary,
          marginBottom: theme.spacing.lg,
        }]}>{vehicle.subModel}</Text>

        {/* Price — 소유자 본인 또는 관리자만 표시. 일반 구매자는 "상담 후 안내" */}
        <Text style={[styles.priceHero, {
          color: (isOwnVehicle || role === 'admin') ? theme.colors.primary.main : theme.colors.text.secondary,
        }]}>
          {(isOwnVehicle || role === 'admin') ? formatPrice(vehicle.price) : PRICE_HIDDEN_LABEL}
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>기본 정보</Text>
        <InfoGroup>
          <InfoRow label="제조사"      value={vehicle.manufacturer} />
          <InfoRow label="연식"        value={vehicle.year ? `${vehicle.year}년` : '-'} />
          <InfoRow label="연료 종류"   value={vehicle.fuelType} />
          <InfoRow label="변속기"      value={vehicle.transmission} />
          <InfoRow label="구동 방식"   value={vehicle.driveType} />
          <InfoRow label="배기량"      value={vehicle.cc ? `${vehicle.cc} cc` : '-'} />
          <InfoRow label="연비"        value={vehicle.fuelEco ? `${vehicle.fuelEco} km/L` : '-'} />
          <InfoRow label="주행거리"    value={vehicle.mileage ? `${vehicle.mileage} km` : '-'} isLast />
        </InfoGroup>

        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary, marginTop: theme.spacing.lg }]}>부품 정보</Text>
        <InfoGroup>
          <InfoRow label="앞 타이어"       value={vehicle.frontTire} />
          <InfoRow label="뒤 타이어"       value={vehicle.rearTire} />
          <InfoRow label="엔진 오일 용량"  value={vehicle.engineOilLiter ? `${vehicle.engineOilLiter} L` : '-'} />
          <InfoRow label="와이퍼 정보"     value={vehicle.wiperInfo} />
          <InfoRow label="배터리 모델"     value={vehicle.battery} isLast />
        </InfoGroup>
      </ScrollView>

      <View style={[styles.bottomButtonContainer, {
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background.primary,
        ...theme.shadows.card,
      }]}>
        {isSold && (
          <Text style={[styles.soldMessage, {
            fontSize: theme.typography.fontSize.body,
            fontWeight: theme.typography.fontWeight.semiBold,
            color: theme.colors.danger.main,
            textAlign: 'center',
            marginBottom: theme.spacing.sm,
          }]}>
            이미 판매된 차량입니다
          </Text>
        )}
        <Button
          variant="primary"
          title={isOwnVehicle ? '판매 상담 신청' : '구매 상담 신청'}
          onPress={handleConsultationRequest}
          disabled={isSold}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  stageBadge: {
    marginLeft: 8,
  },
  container: {
    flex: 1,
  },
  image: {
    width: width - 32,
    height: undefined,
    aspectRatio: 16 / 9,
    marginBottom: 16,
    resizeMode: 'cover',
    alignSelf: 'center',
  },
  title: {},
  subTitle: {},
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceHero: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  infoGroup: {
    borderRadius: 14,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF1',
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  soldMessage: {},
});

export default VehicleDetailScreen;
