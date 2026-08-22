import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
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

const MyVehiclesTab = ({ vehicles, onNavigateToVehicle }) => {
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
});

export default MyVehiclesTab;
