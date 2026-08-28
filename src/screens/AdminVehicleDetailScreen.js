import React, { useEffect, useState } from 'react';
import { logger } from '../utils/logger';
import { View, Text, ScrollView, StyleSheet, Dimensions, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { rowToApp } from '../lib/mappers';
import { fetchVehicleById, fetchVehiclePricing } from '../services/vehicle/supabaseVehicleService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatPrice, formatPhone } from '../utils/format';
import { formatWiper, formatBatteries } from '../utils/vehicleSpec';
import { useTheme } from '../theme/ThemeProvider';
import Card from '../components/Card';
import Tag from '../components/Tag';
import Badge from '../components/Badge';
import Button from '../components/Button';
import StateScreen from '../components/StateScreen';
import ImageCarousel from '../components/ImageCarousel';
import { setVehicleHidden } from '../services/vehicle/vehicleApprovalService';

const { width } = Dimensions.get('window');

const AdminVehicleDetailScreen = ({ route, navigation }) => {
  const { vehicleId } = route.params;
  const theme = useTheme();
  const [vehicle, setVehicle] = useState(null);
  const [contact, setContact] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      try {
        const vehicleData = await fetchVehicleById(vehicleId);
        if (vehicleData) {
          // 가격은 admin 전용 vehicle_pricing 테이블에서 별도 조회
          let pricing = null;
          try {
            pricing = await fetchVehiclePricing(vehicleId);
          } catch (pricingError) {
            logger.error('가격 조회 오류:', pricingError);
          }
          setVehicle({
            ...vehicleData,
            price: pricing?.price ?? null,
            // 신차가격은 조회처가 준 참고값이다. vehicle_pricing에 있으므로
            // 관리자에게만 온다 — 일반 사용자 화면으로는 어떤 경로로도 가지 않는다.
            newCarPrice: pricing?.newCarPrice ?? null,
          });
        }

        // 판매자 PII는 vehicle_private_contact (owner/admin 전용 RLS)
        const { data: contactRow, error: contactError } = await supabase
          .from('vehicle_private_contact')
          .select('*')
          .eq('vehicle_id', vehicleId)
          .maybeSingle();
        if (contactError) { throw contactError; }
        if (contactRow) {
          setContact(rowToApp(contactRow));
        }
      } catch (error) {
        logger.error('차량 상세정보 불러오기 오류:', error);
      }
    };

    fetchVehicleDetails();
  }, [vehicleId]);

  // 자동노출 정책: 사전승인 없음. 관리자는 부적절 매물을 사후에 '숨김/노출'로 관리.
  const handleToggleHidden = () => {
    const nextHidden = !vehicle.hidden;
    Alert.alert(
      nextHidden ? '매물 숨김' : '매물 노출',
      nextHidden
        ? '이 매물을 구매자 목록에서 숨기시겠습니까?'
        : '이 매물을 다시 구매자 목록에 노출하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: nextHidden ? '숨김' : '노출',
          style: nextHidden ? 'destructive' : 'default',
          onPress: async () => {
            setProcessing(true);
            try {
              await setVehicleHidden(vehicleId, nextHidden);
              setVehicle((prev) => ({ ...prev, hidden: nextHidden }));
              Alert.alert('완료', nextHidden ? '매물을 숨겼습니다.' : '매물을 다시 노출했습니다.');
            } catch (error) {
              logger.error('매물 숨김 처리 오류:', error);
              Alert.alert('오류', '처리 중 문제가 발생했습니다.');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

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

  const batteryList = formatBatteries(vehicle.batteries);

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
        {/* Vehicle Images (Task 127: carousel) */}
        <ImageCarousel
          images={vehicle.imageUrls || (vehicle.imageUrl ? [vehicle.imageUrl] : [])}
          style={{ marginBottom: theme.spacing.md }}
        />

        {/* Title and Badges */}
        <View style={{ marginBottom: theme.spacing.md }}>
          <View style={[styles.badgeContainer, { marginBottom: theme.spacing.xs }]}>
            <Tag variant="info" label={vehicle.vehicleType || '승용차'} />
            <Badge
              variant="chip"
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
            { label: '제조사', value: vehicle.manufacturer || '-' },
            { label: '연식', value: vehicle.year || '-' },
            { label: '연료 종류', value: vehicle.fuelType || '-' },
            { label: '변속기', value: vehicle.transmission || '-' },
            { label: '구동 방식', value: vehicle.driveType || '-' },
            { label: '배기량', value: vehicle.cc ? `${vehicle.cc} cc` : '-' },
            { label: '연비', value: vehicle.fuelEco ? `${vehicle.fuelEco} km/L` : '-' },
            { label: '연료탱크 용량', value: vehicle.fuelTank ? `${vehicle.fuelTank} L` : '-' },
            { label: '좌석 수', value: vehicle.seats ? `${vehicle.seats}석` : '-' },
            { label: '전산코드', value: vehicle.catalogUid || '-' },
            // 아래 두 줄은 가격이다 — 이 화면이 관리자 전용이라 여기에만 있다.
            { label: '신차가격', value: vehicle.newCarPrice ? formatPrice(vehicle.newCarPrice) : '-' },
            { label: '가격', value: formatPrice(vehicle.price) },
          ].map((item, index, rows) => (
            <View
              key={index}
              style={[styles.infoRow, {
                marginBottom: index < rows.length - 1 ? theme.spacing.xs : 0,
                paddingBottom: index < rows.length - 1 ? theme.spacing.xs : 0,
                borderBottomWidth: index < rows.length - 1 ? 1 : 0,
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
            { label: '앞 타이어', value: vehicle.frontTire || '-' },
            { label: '뒤 타이어', value: vehicle.rearTire || '-' },
            { label: '엔진 오일 용량', value: vehicle.engineOilLiter ? `${vehicle.engineOilLiter} L` : '-' },
            { label: '와이퍼 규격', value: formatWiper(vehicle.wiperInfo) || '-' },
            // 조회처는 브랜드별 호환 배터리를 여럿 준다. 예전엔 첫 모델명만 남겼다.
            { label: '호환 배터리', value: batteryList.length > 0 ? batteryList.join('\n') : (vehicle.battery || '-') },
          ].map((item, index, rows) => (
            <View
              key={index}
              style={[styles.infoRow, {
                marginBottom: index < rows.length - 1 ? theme.spacing.xs : 0,
                paddingBottom: index < rows.length - 1 ? theme.spacing.xs : 0,
                borderBottomWidth: index < rows.length - 1 ? 1 : 0,
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
            // Prefer the private contact subdoc; fall back to legacy inline fields
            // for vehicles not yet migrated (Task 125).
            { label: '이름', value: (contact?.sellerName) ?? vehicle.sellerName },
            { label: '전화번호', value: formatPhone((contact?.sellerPhone) ?? vehicle.sellerPhone) },
            { label: '이메일', value: (contact?.sellerEmail) ?? vehicle.sellerEmail },
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

        {/* 사후 모더레이션 — 숨김/노출 토글 (판매 완료 차량 제외) */}
        {vehicle.dealStage !== 'sold' && (
          <View style={styles.actionRow}>
            <Button
              variant={vehicle.hidden ? 'primary' : 'secondary'}
              title={vehicle.hidden ? '다시 노출' : '매물 숨김'}
              onPress={handleToggleHidden}
              disabled={processing}
              loading={processing}
              style={styles.actionButton}
            />
          </View>
        )}
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
  // 호환 배터리는 여러 줄이 된다 — 위쪽 정렬에 값 칸을 넓게 준다.
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoLabel: {
    flex: 1,
    lineHeight: 20,
  },
  infoValue: {
    flex: 2,
    lineHeight: 20,
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
});

export default AdminVehicleDetailScreen;
