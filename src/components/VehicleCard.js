/**
 * JCar Design System - Vehicle Card Component
 *
 * 시안: 차량 카드 (이미지 + 차종 태그 + 차량명 + 제조사·연식 + 블루 가격).
 * 소프트 그림자로 떠 있는 16px 라운드 카드.
 */

import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useTheme } from '../theme/ThemeProvider';
import { formatPrice } from '../utils/format';
import { PRICE_HIDDEN_LABEL } from '../utils/vehiclePrice';
import { DEAL_STAGE, DEAL_STAGE_LABELS } from '../constants/vehicle';

/**
 * 차량 이미지 URL 정규화 — imageUrl은 배열 또는 문자열일 수 있음(firestore.js 참조).
 */
const resolveImage = (imageUrl) => {
  if (Array.isArray(imageUrl)) { return imageUrl[0] || null; }
  return imageUrl || null;
};

/**
 * VehicleCard Component
 *
 * @param {Object} props
 * @param {Object} props.vehicle - 차량 객체(vehicleName, manufacturer, year, price, imageUrl, carType)
 * @param {Function} [props.onPress] - 카드 클릭 핸들러
 * @param {string} [props.statusDot] - 우측 상단 상태 점 색(예: 승인 매물 표시). 없으면 미표시
 * @param {boolean} [props.hidePrice=true] - 가격을 숨기고 "상담 후 안내"로 표시.
 *   **기본값이 숨김이다.** 가격은 관리자 전용이며, 넘기는 것을 잊었을 때
 *   가격이 노출되는 쪽으로 기울면 안 된다. 관리자 화면만 hidePrice={false}를 명시한다.
 * @param {Object} [props.style] - Additional styles
 */
const VehicleCard = ({ vehicle, onPress, statusDot, hidePrice = true, style }) => {
  const theme = useTheme();
  const { vehicleName, manufacturer, year, price, imageUrl, carType, dealStage } = vehicle || {};
  const image = resolveImage(imageUrl);
  // 미매입(매입예정) vs 재고(즉시거래) 구분 배지
  const inStock = dealStage === DEAL_STAGE.IN_STOCK;
  const stageLabel = DEAL_STAGE_LABELS[dealStage];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderRadius: theme.borderRadius.card, backgroundColor: theme.colors.background.card },
        theme.shadows.soft,
        pressed && { opacity: 0.92 },
        style,
      ]}
    >
      {/* 이미지 클립용 내부 래퍼 — 그림자는 바깥(Pressable)에, overflow는 안쪽에 분리
          (같은 View에 overflow:hidden+shadow를 주면 iOS에서 그림자가 잘려 모서리가 이상해짐) */}
      <View style={[styles.clip, { borderRadius: theme.borderRadius.card }]}>
      <View style={styles.imageWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: theme.colors.background.tertiary }]}>
            <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>차량 이미지</Text>
          </View>
        )}
        {carType ? (
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>{carType}</Text>
          </View>
        ) : null}
        {stageLabel ? (
          <View style={[
            styles.stageTag,
            { backgroundColor: inStock ? theme.colors.success.main : 'rgba(0,0,0,0.55)' },
          ]}>
            <Text style={styles.stageTagText}>{stageLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: theme.typography.fontWeight.extraBold,
              color: theme.colors.text.primary,
            }}
            numberOfLines={1}
          >
            {vehicleName || '-'}
          </Text>
          {statusDot ? (
            <View style={[styles.statusDot, { backgroundColor: statusDot }]} />
          ) : null}
        </View>
        <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 3 }} numberOfLines={1}>
          {[manufacturer, year ? `${year}년` : null].filter(Boolean).join(' · ')}
        </Text>
        <Text
          style={{
            fontSize: hidePrice ? 15 : 19,
            fontWeight: theme.typography.fontWeight.extraBold,
            color: hidePrice ? theme.colors.text.secondary : theme.colors.primary.main,
            marginTop: 10,
          }}
        >
          {hidePrice
            ? PRICE_HIDDEN_LABEL
            : (price !== null && price !== undefined ? formatPrice(price) : '가격 문의')}
        </Text>
      </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    // 그림자 호스트 — overflow를 주지 않음(그림자가 잘리지 않도록)
  },
  clip: {
    overflow: 'hidden',
  },
  imageWrap: {
    height: 150,
    position: 'relative',
    backgroundColor: '#EEF1F5', // contain 레터박스 영역을 옅은 회색으로 자연스럽게
    paddingVertical: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(26,43,92,0.86)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 7,
  },
  typeTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  stageTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 7,
  },
  stageTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    padding: 15,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
});

VehicleCard.propTypes = {
  vehicle: PropTypes.shape({
    vehicleName: PropTypes.string,
    manufacturer: PropTypes.string,
    year: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    imageUrl: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
    carType: PropTypes.string,
  }).isRequired,
  onPress: PropTypes.func,
  statusDot: PropTypes.string,
  hidePrice: PropTypes.bool,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default VehicleCard;
