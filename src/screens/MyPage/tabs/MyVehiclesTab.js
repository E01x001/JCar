import React from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import EmptyState from '../../../components/EmptyState';
import { PRICE_HIDDEN_LABEL } from '../../../utils/vehiclePrice';

const resolveImage = (imageUrl) => {
  if (Array.isArray(imageUrl)) { return imageUrl[0] || null; }
  return imageUrl || null;
};

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

  const renderItem = ({ item, index }) => {
    const isLast = index === vehicles.length - 1;
    const image = resolveImage(item.imageUrl);
    const pal = tagPalette(item.vehicleType, theme);
    const meta = [item.manufacturer, item.year, item.mileage ? `${item.mileage}` : null]
      .filter(Boolean)
      .join(' · ');

    return (
      <TouchableOpacity
        onPress={() => onNavigateToVehicle(item.id)}
        activeOpacity={0.7}
        style={[
          styles.row,
          !isLast && { borderBottomWidth: 1, borderBottomColor: '#ECEEF1' },
        ]}
      >
        {image ? (
          <Image source={{ uri: image }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, { backgroundColor: theme.colors.background.tertiary }]} />
        )}

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: theme.colors.text.primary }]} numberOfLines={1}>
              {item.vehicleName ?? '차량'}
            </Text>
            {item.vehicleType ? (
              <View style={[styles.tag, { backgroundColor: pal.bg }]}>
                <Text style={[styles.tagText, { color: pal.fg }]}>{item.vehicleType}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.meta, { color: theme.colors.text.tertiary }]} numberOfLines={1}>
            {meta || '-'}
          </Text>
        </View>

        <View style={styles.priceWrap}>
          <Text style={[styles.priceHidden, { color: theme.colors.text.tertiary }]}>{PRICE_HIDDEN_LABEL}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={vehicles}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}
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
  container: {
    marginHorizontal: 22,
    marginTop: 14,
    borderRadius: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  tag: { paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6 },
  tagText: { fontSize: 10, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 3 },
  priceWrap: { alignItems: 'flex-end', maxWidth: 90 },
  priceHidden: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
});

export default MyVehiclesTab;
