/**
 * VehiclePhotosScreen — 등록한 차량의 사진 관리.
 *
 * 이 화면이 없어서 생긴 문제: 차량을 등록한 뒤 사진을 추가하거나 바꿀 방법이
 * 아예 없었다(updateVehicle 서비스와 image_urls 컬럼 권한은 있는데 화면이 없었다).
 * 실사진 1장 이상을 노출 조건으로 걸려면 먼저 이 경로가 있어야 한다 —
 * 없으면 사진 없는 차량이 미노출 상태에서 빠져나오지 못한다.
 *
 * 여기서 다루는 것은 **판매자가 직접 찍은 사진(image_urls)** 뿐이다.
 * 모델 참고 이미지(catalog_image_url)는 노출 판단에 쓰지 않으므로 건드리지 않는다.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import Icon from '@expo/vector-icons/MaterialIcons';
import { logger } from '../utils/logger';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';
import { fetchVehicleById, updateVehicle } from '../services/vehicle/supabaseVehicleService';
import { uploadImage } from '../services/storage/imageService';
import { prepareImageForUpload, prepareImagesForUpload, pickMultipleFromGallery } from '../utils/imageHelpers';
import Button from '../components/Button';
import StateScreen from '../components/StateScreen';

const MAX_IMAGES = 8;

const VehiclePhotosScreen = ({ route, navigation }) => {
  const { vehicleId } = route.params;
  const theme = useTheme();
  const toast = useToast();

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 이미 올라간 사진(원격 URL)과 이번에 고른 사진(로컬 uri)을 한 배열로 다룬다.
  // 저장할 때만 로컬을 업로드하고, 순서는 사용자가 본 그대로 유지한다.
  const [items, setItems] = useState([]);

  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const v = await fetchVehicleById(vehicleId);
        if (disposed) { return; }
        setVehicle(v);
        setItems((v?.imageUrls ?? []).map((url) => ({ kind: 'remote', url })));
      } catch (error) {
        logger.error('차량 조회 실패:', error);
        toast.showError('오류', '차량 정보를 불러오지 못했습니다.');
      } finally {
        if (!disposed) { setLoading(false); }
      }
    })();
    return () => { disposed = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  const remaining = MAX_IMAGES - items.length;

  const addImages = useCallback(() => {
    if (remaining <= 0) {
      toast.showWarning('알림', `사진은 최대 ${MAX_IMAGES}장까지 추가할 수 있습니다.`);
      return;
    }

    Alert.alert('사진 선택', `사진을 어디서 가져오시겠습니까? (최대 ${remaining}장 추가 가능)`, [
      {
        text: '갤러리 (여러 장)',
        onPress: async () => {
          try {
            const picked = await pickMultipleFromGallery({ maxFiles: remaining });
            if (picked.length === 0) { return; }
            const prepared = await prepareImagesForUpload(picked);
            setItems((prev) => [
              ...prev,
              ...prepared.map((p) => ({ kind: 'local', uri: p.uri })),
            ].slice(0, MAX_IMAGES));
          } catch (error) {
            logger.error('갤러리 선택 실패:', error);
            toast.showError('오류', error.message || '사진 선택 중 오류가 발생했습니다.');
          }
        },
      },
      {
        text: '카메라 (1장)',
        onPress: async () => {
          try {
            const result = await prepareImageForUpload('camera');
            if (!result) { return; }
            setItems((prev) => [...prev, { kind: 'local', uri: result.uri }].slice(0, MAX_IMAGES));
          } catch (error) {
            logger.error('촬영 실패:', error);
            toast.showError('오류', error.message || '사진 촬영 중 오류가 발생했습니다.');
          }
        },
      },
      { text: '취소', style: 'cancel' },
    ]);
  }, [remaining, toast]);

  const removeAt = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    setSaving(true);
    try {
      // 로컬로 고른 것만 업로드한다. 이미 올라간 URL을 다시 올리지 않는다.
      const urls = [];
      for (const item of items) {
        urls.push(item.kind === 'remote' ? item.url : await uploadImage(item.uri));
      }

      await updateVehicle(vehicleId, { imageUrls: urls });

      toast.showSuccess(
        '저장 완료',
        urls.length > 0 ? '사진이 저장되었습니다.' : '사진을 모두 삭제했습니다.',
      );
      navigation.goBack();
    } catch (error) {
      logger.error('사진 저장 실패:', error);
      toast.showError('오류', '사진을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  if (!vehicle) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}>
        <StateScreen
          icon="directions-car"
          title="차량을 찾을 수 없습니다"
          message="삭제되었거나 접근 권한이 없습니다."
        />
      </SafeAreaView>
    );
  }

  const empty = items.length === 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.secondary }]}
      edges={['bottom']}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.vehicleName, { color: theme.colors.text.primary }]} numberOfLines={1}>
          {vehicle.vehicleName}
        </Text>

        {/* 사진이 없으면 그 결과를 먼저 말한다 — 저장하고 나서 알게 되면 늦다 */}
        {empty ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.statusChip.pending.bg }]}>
            <Icon name="visibility-off" size={18} color={theme.colors.statusChip.pending.fg} />
            <Text style={[styles.noticeText, { color: theme.colors.statusChip.pending.fg }]}>
              사진이 없어 다른 사용자에게 노출되지 않습니다. 실제 차량 사진을 1장 이상 올려주세요.
            </Text>
          </View>
        ) : (
          <Text style={[styles.hint, { color: theme.colors.text.secondary }]}>
            첫 번째 사진이 목록의 대표 이미지가 됩니다. 최대 {MAX_IMAGES}장.
          </Text>
        )}

        <View style={styles.grid}>
          {items.map((item, index) => (
            <View key={item.kind === 'remote' ? item.url : `${item.uri}-${index}`} style={styles.tile}>
              <Image
                source={{ uri: item.kind === 'remote' ? item.url : item.uri }}
                style={styles.thumb}
                resizeMode="cover"
              />
              {index === 0 ? (
                <View style={[styles.coverTag, { backgroundColor: theme.colors.primary.main }]}>
                  <Text style={[styles.coverTagText, { color: theme.colors.text.white }]}>대표</Text>
                </View>
              ) : null}
              <TouchableOpacity
                onPress={() => removeAt(index)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${index + 1}번째 사진 삭제`}
                style={styles.removeButton}
              >
                <Icon name="close" size={15} color={theme.colors.text.white} />
              </TouchableOpacity>
            </View>
          ))}

          {remaining > 0 ? (
            <TouchableOpacity
              onPress={addImages}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="사진 추가"
              style={[styles.tile, styles.addTile, { borderColor: theme.colors.border.subtle }]}
            >
              <Icon name="add-a-photo" size={24} color={theme.colors.text.tertiary} />
              <Text style={[styles.addText, { color: theme.colors.text.secondary }]}>
                {items.length}/{MAX_IMAGES}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.border.light, backgroundColor: theme.colors.background.card }]}>
        <Button
          variant="primary"
          title={saving ? '저장 중...' : '저장'}
          onPress={save}
          disabled={saving}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
};

VehiclePhotosScreen.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({ vehicleId: PropTypes.string.isRequired }).isRequired,
  }).isRequired,
  navigation: PropTypes.shape({ goBack: PropTypes.func.isRequired }).isRequired,
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 14 },
  vehicleName: { fontSize: 20, fontWeight: '800' },
  notice: { flexDirection: 'row', gap: 10, borderRadius: 14, padding: 14 },
  noticeText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  hint: { fontSize: 13, lineHeight: 19 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: 104, height: 104, borderRadius: 14, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%', backgroundColor: '#EEF1F5' },
  coverTag: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  coverTagText: { fontSize: 10, fontWeight: '700' },
  removeButton: {
    position: 'absolute',
    right: 5,
    top: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(33,37,41,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 5 },
  addText: { fontSize: 12, fontWeight: '600' },

  footer: { padding: 20, borderTopWidth: 1 },
});

export default VehiclePhotosScreen;
