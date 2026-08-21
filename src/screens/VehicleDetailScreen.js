import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialIcons';
import { fetchVehicleById, fetchVehiclePricing, subscribeVehicles } from '../services/vehicle/supabaseVehicleService';
import { logger } from '../utils/logger';
import { AuthContext } from '../context/AuthContext';
import { canViewVehiclePrice, PRICE_HIDDEN_LABEL } from '../utils/vehiclePrice';
import { DEAL_STAGE_LABELS, DEAL_STAGE_BADGE_STATUS } from '../constants/vehicle';
import { formatPrice } from '../utils/format';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/spacing';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Tag from '../components/Tag';
import ImageCarousel from '../components/ImageCarousel';
import { typography } from '../theme/typography';

// 빈 값/Unknown 행은 표시하지 않는다(데이터 없는 항목 깔끔히 숨김).
const cleanRows = (rows) => rows.filter(([, v]) => v != null && v !== '' && v !== '-' && v !== 'Unknown');

const VehicleDetailScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { user, role } = useContext(AuthContext);
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState(null);
  const [isOwnVehicle, setIsOwnVehicle] = useState(false);
  const [isSold, setIsSold] = useState(false);

  useEffect(() => {
    // Phase 2b: Supabase 실시간 구독(변경 시 재조회). 보는 중 sold 반영 유지.
    const unsubscribe = subscribeVehicles(
      async () => {
        const data = await fetchVehicleById(vehicleId);
        // 가격은 별도 테이블(admin 전용 RLS) — 관리자에게만 값이 온다
        if (data && role === 'admin') {
          try {
            const pricing = await fetchVehiclePricing(vehicleId);
            data.price = pricing?.price ?? null;
          } catch (e) { logger.error('가격 조회 오류:', e); }
        }
        return data;
      },
      (data) => {
        if (data) {
          setVehicle(data);
          setIsSold(data.status === 'sold');
          const ownerId = data.currentOwnerId || data.sellerId;
          setIsOwnVehicle(!!user && user.uid === ownerId);
        }
      },
      { channelKey: `vehicle-${vehicleId}` },
    );
    return () => unsubscribe();
  }, [vehicleId, role, user]);

  const handleConsultationRequest = () => {
    navigation.navigate('ConsultationRequest', { vehicle, isSell: isOwnVehicle });
  };

  if (!vehicle) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.background.secondary }]}>
        <Text style={{ fontSize: 14, color: c.text.secondary }}>차량 정보를 불러오는 중...</Text>
      </View>
    );
  }

  const images = vehicle.imageUrls || (vehicle.imageUrl ? [vehicle.imageUrl] : []);
  const isAdmin = role === 'admin';
  // 가격 게이팅은 SSOT(utils/vehiclePrice) 경유 — 정책 변경 시 한 곳만 수정
  const showPrice = canViewVehiclePrice(vehicle, { role });

  // 상태 칩(판매됨/거래단계/판매중)
  const stageLabel = DEAL_STAGE_LABELS[vehicle.dealStage];
  const statusChip = isSold
    ? { status: 'rejected', label: '판매완료' }
    : stageLabel
      ? { status: DEAL_STAGE_BADGE_STATUS[vehicle.dealStage], label: stageLabel }
      : { status: 'approved', label: '판매중' };

  const meta = cleanRows([
    ['m', vehicle.manufacturer],
    ['y', vehicle.year ? `${vehicle.year}년` : null],
    ['f', vehicle.fuelType],
  ]).map(([, v]) => v).join(' · ');

  const basicRows = cleanRows([
    ['제조사', vehicle.manufacturer],
    ['연식', vehicle.year ? `${vehicle.year}년` : null],
    ['연료', vehicle.fuelType],
    ['변속기', vehicle.transmission],
    ['구동방식', vehicle.driveType],
    ['배기량', vehicle.cc ? `${vehicle.cc} cc` : null],
    ['연비', vehicle.fuelEco ? `${vehicle.fuelEco} km/L` : null],
    ['좌석 수', vehicle.seats ? `${vehicle.seats}석` : null],
  ]);

  const partRows = cleanRows([
    ['앞 타이어', vehicle.frontTire],
    ['뒤 타이어', vehicle.rearTire],
    ['엔진 오일 용량', vehicle.engineOilLiter ? `${vehicle.engineOilLiter} L` : null],
    ['와이퍼 정보', vehicle.wiperInfo],
    ['배터리 모델', vehicle.battery],
    ['연료 탱크', vehicle.fuelTank ? `${vehicle.fuelTank} L` : null],
  ]);

  const renderGroup = (rows) => (
    <View style={[styles.infoGroup, { backgroundColor: c.background.secondary }]}>
      {rows.map(([label, value], i) => (
        <View key={label} style={[styles.infoRow, i < rows.length - 1 && styles.infoRowBorder]}>
          <Text style={[styles.infoLabel, { color: c.text.secondary }]}>{label}</Text>
          <Text style={[styles.infoValue, { color: c.text.primary }]}>{value}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background.secondary }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* 이미지 영역 */}
        <View style={styles.imageArea}>
          <ImageCarousel images={images} style={styles.carousel} />
          {vehicle.vehicleType ? (
            <Tag variant="accent" label={vehicle.vehicleType} style={[styles.imageTag, { top: insets.top + 10 }]} />
          ) : null}
        </View>

        {/* 시트 */}
        <View style={[styles.sheet, { backgroundColor: c.background.card }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: c.text.primary }]} numberOfLines={2}>{vehicle.vehicleName}</Text>
            <Badge variant="chip" status={statusChip.status} label={statusChip.label} style={styles.statusChip} />
          </View>

          {!!vehicle.subModel && (
            <Text style={[styles.subModel, { color: c.text.secondary }]}>{vehicle.subModel}</Text>
          )}
          {!!meta && <Text style={[styles.meta, { color: c.text.secondary }]}>{meta}</Text>}

          {/* 가격 — 관리자만 실가격, 그 외엔 상담 안내 배너 */}
          {showPrice ? (
            <Text style={[styles.priceHero, { color: c.primary.main }]}>{formatPrice(vehicle.price)}</Text>
          ) : (
            <View style={[styles.priceBanner, { backgroundColor: c.statusChip.completed.bg }]}>
              <View style={[styles.wonBadge, { backgroundColor: c.background.card }]}>
                <Text style={[styles.wonText, { color: c.primary.main }]}>₩</Text>
              </View>
              <View style={styles.priceBannerText}>
                <Text style={[styles.priceBannerTitle, { color: c.primary.main }]}>가격은 상담 시 안내드려요</Text>
                <Text style={[styles.priceBannerSub, { color: c.text.secondary }]}>담당 에이전트가 최적 가격을 안내합니다</Text>
              </View>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: c.text.primary }]}>기본 정보</Text>
          {renderGroup(basicRows)}

          {partRows.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: c.text.primary, marginTop: 20 }]}>부품 정보</Text>
              {renderGroup(partRows)}
            </>
          )}
        </View>
      </ScrollView>

      {/* 플로팅 백버튼 */}
      <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={[styles.backFab, { top: insets.top + 8, backgroundColor: c.background.card }]}>
        <Icon name="chevron-left" size={26} color={c.text.primary} />
      </Pressable>

      {/* 하단 바 */}
      <View style={[styles.bottomBar, { backgroundColor: c.background.card, paddingBottom: insets.bottom + 12, borderTopColor: c.border.light }]}>
        {isSold && (
          <Text style={[styles.soldMsg, { color: c.danger.main }]}>이미 판매된 차량입니다</Text>
        )}
        <View style={styles.bottomRow}>
          <View style={styles.bottomLeft}>
            <Text style={[styles.bottomLeftSm, { color: c.text.tertiary }]}>가격</Text>
            <Text style={[styles.bottomLeftMd, { color: c.text.secondary }]}>{showPrice ? formatPrice(vehicle.price) : '상담 안내'}</Text>
          </View>
          <Button
            variant="primary"
            title={isOwnVehicle ? '판매 상담 신청' : '구매 상담 신청'}
            onPress={handleConsultationRequest}
            disabled={isSold}
            style={styles.cta}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // 이미지
  imageArea: { backgroundColor: '#EEF1F5' },
  carousel: { width: '100%' },
  imageTag: { position: 'absolute', right: 16 },
  backFab: {
    position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1A2B5C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  // 시트
  sheet: {
    marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.screenX, paddingTop: 24, paddingBottom: 8,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  title: { flex: 1, fontSize: typography.fontSize.h2, fontWeight: '800', letterSpacing: -0.3 },
  statusChip: { marginTop: 4 },
  subModel: { fontSize: 14, marginTop: 6 },
  meta: { fontSize: 13, marginTop: 4 },
  priceHero: { fontSize: 28, fontWeight: '800', marginTop: 16, letterSpacing: -0.5 },
  // 가격 안내 배너
  priceBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, marginTop: 16 },
  wonBadge: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  wonText: { fontSize: 18, fontWeight: '800' },
  priceBannerText: { flex: 1 },
  priceBannerTitle: { fontSize: 14, fontWeight: '700' },
  priceBannerSub: { fontSize: 12, marginTop: 2 },
  // 섹션
  sectionTitle: { fontSize: typography.fontSize.bodyLarge, fontWeight: '800', letterSpacing: -0.2, marginTop: 24, marginBottom: 10 },
  infoGroup: { borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#ECEEF1' },
  infoLabel: { fontSize: 14, flex: 1 },
  infoValue: { fontSize: 14, fontWeight: '700', textAlign: 'right', flex: 1, marginLeft: 12 },
  // 하단 바
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.screenX, paddingTop: 12, borderTopWidth: 1 },
  soldMsg: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bottomLeft: { width: 64 },
  bottomLeftSm: { fontSize: 11 },
  bottomLeftMd: { fontSize: 14, fontWeight: '700', marginTop: 1 },
  cta: { flex: 1 },
});

export default VehicleDetailScreen;
