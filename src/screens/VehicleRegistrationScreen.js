import React, { useState, useContext } from 'react';
import { logger } from '../utils/logger';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../theme/ThemeProvider';
import Card from '../components/Card';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { getFirestore, collection, doc, writeBatch, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { VEHICLE_STATUS, VEHICLE_TYPES, isValidVehicleType, DEAL_STAGE } from '../constants';
import useVehicleStore from '../stores/vehicleStore';
import { generateTempId, executeOptimisticUpdate } from '../utils/optimisticHelpers';
import { prepareImageForUpload, prepareImagesForUpload, pickMultipleFromGallery, uploadImageWithProgress } from '../utils/imageHelpers';

const MAX_IMAGES = 8;

const VehicleRegistrationScreen = () => {
  const theme = useTheme();
  const { user, sellerName, sellerPhone, sellerEmail } = useContext(AuthContext);
  const toast = useToast();
  const { addOptimisticVehicle, removeOptimisticVehicle, invalidateUserVehiclesCache } = useVehicleStore();

  const [regiNumber, setRegiNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [vehicleType, setVehicleType] = useState(''); // ✅ 초기값 "" (선택 안 한 상태)
  const [loading, setLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState(null);
  const [images, setImages] = useState([]); // Task 127: multiple images [{ uri, size }]
  const [uploadProgress, setUploadProgress] = useState(0); // Track upload progress (0-100)
  const [isUploading, setIsUploading] = useState(false); // Upload state flag
  const [saving, setSaving] = useState(false); // Save in-progress flag (double-submit guard)

  const isValidRegiNumber = (number) => {
    const regex = /^([가-힣]{0,2})?(\d{2,3})([가-힣A-Z외임])\s?(\d{3,4})$/;
    return regex.test(number);
  };

  const formatRegiNumber = (input) => {
    const cleanInput = input.replace(/\s+/g, '');
    const regex = /^([가-힣]{0,2})?(\d{2,3})([가-힣A-Z외임])(\d{3,4})$/;
    const match = cleanInput.match(regex);

    if (match) {
      const region = match[1] || '';
      const firstNumbers = match[2];
      const letter = match[3];
      const lastNumbers = match[4];
      return `${region}${firstNumbers}${letter} ${lastNumbers}`;
    }
    return input;
  };

  /**
   * Task 107: Optimized image selection with compression
   * Shows alert to choose between gallery or camera, then prepares image
   */
  const remaining = MAX_IMAGES - images.length;

  const handleImageSelect = async () => {
    if (remaining <= 0) {
      toast.showWarning('알림', `사진은 최대 ${MAX_IMAGES}장까지 추가할 수 있습니다.`);
      return;
    }

    Alert.alert(
      '사진 선택',
      `사진을 어디서 가져오시겠습니까? (최대 ${remaining}장 추가 가능)`,
      [
        {
          text: '갤러리 (여러 장)',
          onPress: async () => {
            try {
              const picked = await pickMultipleFromGallery({ maxFiles: remaining });
              if (picked.length > 0) {
                const prepared = await prepareImagesForUpload(picked);
                setImages((prev) => [...prev, ...prepared].slice(0, MAX_IMAGES));
                toast.showSuccess('사진 준비 완료', `${prepared.length}장 추가됨`);
              }
            } catch (error) {
              logger.error('Gallery selection error:', error);
              toast.showError('오류', error.message || '사진 선택 중 오류가 발생했습니다.');
            }
          },
        },
        {
          text: '카메라 (1장)',
          onPress: async () => {
            try {
              const result = await prepareImageForUpload('camera');
              if (result) {
                setImages((prev) => [...prev, { uri: result.uri, size: result.size }].slice(0, MAX_IMAGES));
                toast.showSuccess('사진 촬영 완료', '1장 추가됨');
              }
            } catch (error) {
              logger.error('Camera capture error:', error);
              toast.showError('오류', error.message || '사진 촬영 중 오류가 발생했습니다.');
            }
          },
        },
        {
          text: '취소',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const removeImageAt = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const fetchVehicleInfo = async () => {
    if (!regiNumber || !ownerName) {
      toast.showWarning('입력 오류', '차량번호와 소유자명을 입력하세요.');
      return;
    }

    if (!isValidRegiNumber(regiNumber)) {
      toast.showWarning('입력 오류', '올바른 차량번호 형식이 아닙니다. 예: 서울12가 3456');
      return;
    }

    setLoading(true);

    try {
      // Task #72: Use Firebase Function proxy for secure API key storage
      // Function deployed in asia-northeast3 (Seoul) for lower latency
      // 리전 지정은 getFunctions(app, region) 모듈러 API 사용 (RN Firebase v22)
      const fns = getFunctions(getApp(), 'asia-northeast3');
      const getVehicleInfo = httpsCallable(fns, 'getVehicleInfo');
      const result = await getVehicleInfo({ regiNumber, ownerName });

      logger.debug('API 응답:', result.data);

      if (!result.data.success) {
        toast.showError('조회 실패', '차량 정보를 찾을 수 없습니다.');
        return;
      }

      setVehicleData(result.data.data);
      toast.showInfo('조회 성공', '차량 정보를 성공적으로 가져왔습니다.');

    } catch (error) {
      logger.error('차량 정보 조회 실패:', error);
      // Firebase Function error handling
      const errorMessage = error.message || '차량 정보를 조회하는 중 오류가 발생했습니다.';
      toast.showError('오류', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Task 106.2: Optimistic UI - Save vehicle data
   *
   * Flow:
   * 1. Upload image (must complete first)
   * 2. Add vehicle to store optimistically
   * 3. Fire Firestore write (non-blocking)
   * 4. Clear form immediately
   * 5. Handle write success/failure in background
   */
  const saveVehicleData = async () => {
    // 중복 제출 방지
    if (saving) {
      return;
    }

    if (!vehicleData) {
      toast.showWarning('오류', '조회된 차량 정보가 없습니다.');
      return;
    }

    if (!isValidVehicleType(vehicleType)) {
      toast.showWarning('입력 오류', '차량 종류를 정확히 선택해주세요.');
      return;
    }

    // Generate temporary ID for optimistic update
    const tempId = generateTempId('temp_vehicle');

    setSaving(true);
    try {
      // Task 62.4: Use modular currentUser
      const auth = getAuth();
      const currentUser = auth.currentUser;
      // Default to the CarZen catalog image when the user adds no photos.
      let imageUrls = [`https://www.cartory.net/cars/${vehicleData.CARURL}`];

      // Task 127: upload each selected image, tracking overall progress.
      if (images.length > 0) {
        setIsUploading(true);
        setUploadProgress(0);

        try {
          const uploaded = [];
          for (let i = 0; i < images.length; i++) {
            const filename = `vehicle_${Date.now()}_${tempId}_${i}.jpg`;
            const url = await uploadImageWithProgress(
              images[i].uri,
              `vehicles/${filename}`,
              (progress) => {
                // Combine per-image progress into an overall 0-100 value.
                setUploadProgress(((i + progress / 100) / images.length) * 100);
              }
            );
            uploaded.push(url);
          }
          imageUrls = uploaded;
          logger.debug(`✅ Uploaded ${uploaded.length} images`);
        } catch (uploadError) {
          logger.error('❌ Image upload failed:', uploadError);
          toast.showError('오류', '이미지 업로드 중 오류가 발생했습니다.');
          setIsUploading(false);
          setSaving(false);
          return; // Stop if upload fails
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }

      // Prepare vehicle data
      const vehicleDataToSave = {
        vehicleName: vehicleData.CARNAME,
        subModel: vehicleData.SUBMODEL,
        manufacturer: vehicleData.CARVENDER,
        year: vehicleData.CARYEAR,
        driveType: vehicleData.DRIVE,
        fuelType: vehicleData.FUEL,
        price: vehicleData.PRICE,
        cc: vehicleData.CC,
        transmission: vehicleData.MISSION,
        imageUrls, // Task 127: full gallery
        imageUrl: imageUrls[0], // backward-compat single image (list/legacy reads)
        vin: vehicleData.VIN,
        frontTire: vehicleData.FRONTTIRE,
        rearTire: vehicleData.REARTIRE,
        engineOilLiter: vehicleData.EOILLITER,
        wiperInfo: vehicleData.WIPER,
        seats: vehicleData.SEATS,
        battery: Array.isArray(vehicleData.BATTERYLIST) && vehicleData.BATTERYLIST.length > 0 ? vehicleData.BATTERYLIST[0].MODEL : 'Unknown',
        fuelEco: vehicleData.FUELECO,
        fuelTank: vehicleData.FUELTANK,
        regiNumber,
        ownerName,
        vehicleType,
        createdAt: new Date(), // Use local time for optimistic data
        sellerId: user.uid,
        currentOwnerId: user.uid, // 소유 축 정본: 등록 시 판매자 = 현재 소유자
        isAdminOwned: false,
        sellerName: sellerName || 'Unknown',
        sellerPhone: sellerPhone || 'Unknown',
        sellerEmail: sellerEmail || 'Unknown',
        // 자동노출 정책: 등록 즉시 구매자 목록에 노출(사전승인 없음).
        // 품질 문제는 관리자가 사후에 hidden 처리로 내림(post-moderation).
        status: 'approved',
        dealStage: DEAL_STAGE.LISTED,
        hidden: false,
      };

      // Optimistic update: Add immediately to store
      addOptimisticVehicle(vehicleDataToSave, tempId);

      // Clear cache to show new vehicle immediately
      invalidateUserVehiclesCache(user.uid);

      // Show success immediately (optimistic)
      toast.showSuccess('성공', '차량이 등록되어 목록에 노출됩니다.');

      // Clear form immediately
      setRegiNumber('');
      setOwnerName('');
      setVehicleData(null);
      setImages([]);
      setVehicleType('');

      // Firestore write (non-blocking)
      const db = getFirestore();
      const vehiclesRef = collection(db, 'vehicles');
      const newVehicleRef = doc(vehiclesRef);

      // Task 125: keep seller PII OUT of the public vehicle doc. Split into a
      // public doc (listing data) and a private contact subdoc readable only by
      // the owner/admin. The private doc carries sellerId so its security rule
      // needs no parent get() (avoids a race during the batched create).
      const {
        sellerName: _piiName,
        sellerPhone: _piiPhone,
        sellerEmail: _piiEmail,
        ownerName: _piiOwner,
        regiNumber: _piiRegi,
        vin: _piiVin,
        ...publicVehicleData
      } = vehicleDataToSave;

      const privateContactData = {
        sellerId: user.uid,
        sellerName: vehicleDataToSave.sellerName,
        sellerPhone: vehicleDataToSave.sellerPhone,
        sellerEmail: vehicleDataToSave.sellerEmail,
        ownerName: vehicleDataToSave.ownerName,
        regiNumber: vehicleDataToSave.regiNumber,
        vin: vehicleDataToSave.vin,
      };

      // Execute write without awaiting (using executeOptimisticUpdate helper)
      executeOptimisticUpdate({
        optimisticFn: null, // Already done above
        serverFn: async () => {
          const batch = writeBatch(db);
          batch.set(newVehicleRef, {
            ...publicVehicleData,
            vehicleId: newVehicleRef.id,
            createdAt: serverTimestamp(), // Use server timestamp for real data
          });
          const contactRef = doc(db, 'vehicles', newVehicleRef.id, 'private', 'contact');
          batch.set(contactRef, {
            ...privateContactData,
            createdAt: serverTimestamp(),
          });
          await batch.commit();
          return newVehicleRef.id;
        },
        onSuccess: (realId) => {
          logger.debug(`✅ Vehicle saved successfully with ID: ${realId}`);
          // Firestore listener will automatically update the store
        },
        onError: (error) => {
          logger.error('❌ Firestore write failed:', error);
          // Remove optimistic vehicle
          removeOptimisticVehicle(tempId);
          // Show error to user
          toast.showError('오류', '차량 정보 저장 중 문제가 발생했습니다. 다시 시도해주세요.');
        },
        revertFn: () => {
          removeOptimisticVehicle(tempId);
        },
      });

      // Synchronous setup + background write scheduled; safe to re-enable.
      setSaving(false);

    } catch (error) {
      // This catches errors from image upload or data preparation
      logger.error('저장 준비 중 오류:', error);
      toast.showError('오류', '차량 정보를 저장하는 중 문제가 발생했습니다.');
      // Remove optimistic vehicle if we added it
      removeOptimisticVehicle(tempId);
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.screenTitleBar}>
        <Text style={styles.screenTitle}>차량 등록</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
        <Card elevated style={styles.formCard}>
          <InputField
            label="차량번호"
            value={regiNumber}
            onChangeText={(text) => setRegiNumber(formatRegiNumber(text))}
            placeholder="예: 서울12가 3456"
          />
          <InputField
            label="소유자명"
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="소유자 이름 입력"
          />

          <Text style={[styles.fieldLabel, { color: theme.colors.text.secondary }]}>차량 종류</Text>
          <View style={[styles.pickerContainer, {
            borderColor: theme.colors.border.subtle,
            borderRadius: theme.borderRadius.input,
            backgroundColor: theme.colors.background.primary,
          }]}>
            <Picker
              selectedValue={vehicleType}
              onValueChange={(itemValue) => setVehicleType(itemValue)}
              style={{ color: vehicleType ? theme.colors.text.primary : theme.colors.text.tertiary }}
              dropdownIconColor={theme.colors.text.secondary}
            >
              <Picker.Item label="차량 종류 선택" value="" color={theme.colors.text.tertiary} />
              <Picker.Item label="승용차" value="승용차" />
              <Picker.Item label="택시" value="택시" />
              <Picker.Item label="렌터카" value="렌터카" />
              <Picker.Item label="화물차" value="화물차" />
              <Picker.Item label="군용차" value="군용차" />
              <Picker.Item label="외교차" value="외교차" />
            </Picker>
          </View>

          <TouchableOpacity
            onPress={handleImageSelect}
            activeOpacity={0.8}
            style={[styles.imageTile, {
              borderColor: theme.colors.border.subtle,
              borderRadius: theme.borderRadius.input,
              backgroundColor: theme.colors.background.secondary,
            }]}
          >
            <Icon name="add-photo-alternate" size={22} color={theme.colors.primary.main} />
            <Text style={[styles.imageTileText, { color: theme.colors.text.secondary }]}>
              추가 사진 선택 (선택){images.length > 0 ? ` · ${images.length}/${MAX_IMAGES}` : ''}
            </Text>
          </TouchableOpacity>

          {/* Task 127: multi-image thumbnail strip with per-image remove */}
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbStrip}>
              {images.map((img, index) => (
                <View key={`${index}-${img.uri}`} style={styles.thumbWrapper}>
                  <Image source={{ uri: img.uri }} style={styles.thumb} />
                  <TouchableOpacity
                    style={styles.thumbRemove}
                    onPress={() => removeImageAt(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.thumbRemoveText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {isUploading && (
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, { color: theme.colors.text.secondary }]}>업로드 중... {uploadProgress.toFixed(0)}%</Text>
              <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.background.tertiary }]}>
                <View style={[styles.progressBarFill, { width: `${uploadProgress}%`, backgroundColor: theme.colors.primary.main }]} />
              </View>
            </View>
          )}

          <Button
            variant="primary"
            title={loading ? '조회 중...' : '차량 정보 조회'}
            onPress={fetchVehicleInfo}
            loading={loading}
            disabled={loading}
            fullWidth
            style={styles.lookupButton}
          />
        </Card>

        {vehicleData && (
          <Card elevated style={styles.previewCard}>
            <Text style={[styles.previewTitle, { color: theme.colors.text.primary }]}>차량 정보 미리보기</Text>
            {vehicleData.CARURL && (
              <Image
                source={{ uri: `https://www.cartory.net/cars/${vehicleData.CARURL}` }}
                style={styles.vehicleImage}
              />
            )}
            {[
              ['차량번호', regiNumber],
              ['소유자명', ownerName],
              ['차량명', vehicleData.CARNAME],
              ['제조사', vehicleData.CARVENDER],
              ['연식', vehicleData.CARYEAR],
              ['연료', vehicleData.FUEL],
              ['변속기', vehicleData.MISSION],
              ['배기량', vehicleData.CC ? `${vehicleData.CC} cc` : '-'],
              ['연비', vehicleData.FUELECO ? `${vehicleData.FUELECO} km/L` : '-'],
            ].map(([k, v]) => (
              <View key={k} style={[styles.previewRow, { borderBottomColor: theme.colors.border.light }]}>
                <Text style={[styles.previewKey, { color: theme.colors.text.secondary }]}>{k}</Text>
                <Text style={[styles.previewVal, { color: theme.colors.text.primary }]}>{v || '-'}</Text>
              </View>
            ))}

            <Button
              variant="primary"
              title={saving ? '저장 중...' : '차량 정보 저장'}
              onPress={saveVehicleData}
              loading={saving}
              disabled={saving || isUploading}
              fullWidth
              style={styles.saveButton}
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  screenTitleBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
  screenTitle: { fontSize: 20, fontWeight: '800', color: '#212529', letterSpacing: -0.2 },
  scrollViewContent: { padding: 20, paddingBottom: 30 },
  formCard: { padding: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 7 },
  pickerContainer: { borderWidth: 1.5, overflow: 'hidden', marginBottom: 12 },
  imageTile: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 16, marginBottom: 4,
  },
  imageTileText: { fontSize: 14, fontWeight: '600' },
  lookupButton: { marginTop: 16 },
  // Preview card
  previewCard: { padding: 20, marginTop: 16 },
  previewTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  vehicleImage: { width: '100%', height: 200, resizeMode: 'contain', marginBottom: 12 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1 },
  previewKey: { fontSize: 14 },
  previewVal: { fontSize: 14, fontWeight: '600' },
  saveButton: { marginTop: 18 },
  // Task 127: multi-image thumbnail strip
  thumbStrip: { marginVertical: 10 },
  thumbWrapper: { marginRight: 8, position: 'relative' },
  thumb: { width: 90, height: 90, borderRadius: 12, resizeMode: 'cover' },
  thumbRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#DC3545', alignItems: 'center', justifyContent: 'center',
  },
  thumbRemoveText: { color: '#fff', fontSize: 16, lineHeight: 18, fontWeight: 'bold' },
  progressContainer: { marginTop: 10, marginBottom: 6 },
  progressText: { fontSize: 13, marginBottom: 6, textAlign: 'center', fontWeight: '600' },
  progressBarBackground: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
});

export default VehicleRegistrationScreen;
