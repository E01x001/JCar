import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../../../theme/ThemeProvider';
import EmptyState from '../../../components/EmptyState';
import MyPageListRow from '../../../components/MyPageListRow';
import { PRICE_HIDDEN_LABEL } from '../../../utils/vehiclePrice';

// 차종 → 태그 색(시안)
const tagPalette = (type, theme) => {
  const t = type || '';
  if (t.includes('SUV')) { return theme.colors.tag.info; }
  if (t.includes('전기')) { return theme.colors.statusChip.approved; } // 초록 계열
  return theme.colors.tag.neutral;
};

const MyVehiclesTab = ({ vehicles, onNavigateToVehicle, onManagePhotos }) => {
  const theme = useTheme();

  if (!vehicles || vehicles.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <EmptyState
          icon="directions-car"
          title="아직 등록한 차량이 없어요"
          message={'내 차량을 등록하고\n판매를 시작해 보세요'}
        />
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const pal = tagPalette(item.vehicleType, theme);
    // 실사진이 없으면 다른 사용자에게 노출되지 않는다. 판매자가 그 사실과
    // 해결 방법을 여기서 바로 알아야 한다 — 모르면 등록이 실패한 줄 안다.
    const noPhoto = !Array.isArray(item.imageUrls) || item.imageUrls.length === 0;
    const meta = [item.manufacturer, item.year, item.mileage ? `${item.mileage}` : null]
      .filter(Boolean)
      .join(' · ');

    return (
      <MyPageListRow
        imageUrl={item.imageUrl}
        title={item.vehicleName ?? '차량'}
        titleAccessory={item.vehicleType ? (
          <View style={[styles.tag, { backgroundColor: pal.bg }]}>
            <Text style={[styles.tagText, { color: pal.fg }]}>{item.vehicleType}</Text>
          </View>
        ) : null}
        subtitle={meta || '-'}
        right={(
          <View style={styles.priceWrap}>
            {/* 가격은 관리자 전용 — 일반 사용자에게는 절대 노출하지 않는다 */}
            <Text style={[styles.priceHidden, { color: theme.colors.text.tertiary }]}>
              {PRICE_HIDDEN_LABEL}
            </Text>
          </View>
        )}
        footer={noPhoto ? (
          <TouchableOpacity
            onPress={() => onManagePhotos?.(item.id)}
            activeOpacity={0.8}
            accessibilityRole="button"
            style={[styles.noPhoto, { backgroundColor: theme.colors.statusChip.pending.bg }]}
          >
            <Icon name="visibility-off" size={15} color={theme.colors.statusChip.pending.fg} />
            <Text style={[styles.noPhotoText, { color: theme.colors.statusChip.pending.fg }]}>
              사진이 없어 노출되지 않음 · 사진 추가
            </Text>
            <Icon name="chevron-right" size={16} color={theme.colors.statusChip.pending.fg} />
          </TouchableOpacity>
        ) : null}
        onPress={() => onNavigateToVehicle(item.id)}
      />
    );
  };

  return (
    <FlatList
      data={vehicles}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  tag: { paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: '700' },
  priceWrap: { alignItems: 'flex-end', maxWidth: 90 },
  priceHidden: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
  noPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  noPhotoText: { flex: 1, fontSize: 12, fontWeight: '600' },
});

export default MyVehiclesTab;
