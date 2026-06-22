import React, { useState, useContext } from 'react';
import { logger } from '../utils/logger';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Switch, Modal, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeProvider';
import Card from '../components/Card';
import InputField from '../components/InputField';
import Button from '../components/Button';
import CategoryChip from '../components/CategoryChip';
import ApiProgressOverlay from '../components/ApiProgressOverlay';
import { useFakeProgress } from '../hooks/useFakeProgress';

// 차량 정보 조회 진행 중 안내 문구(상담형·가벼움). 임계값(%)별 교체.
const LOOKUP_MESSAGES = [
  { at: 0, text: '차량번호로 등록원부를 조회하고 있어요' },
  { at: 25, text: '제조사와 연식을 확인하는 중이에요' },
  { at: 50, text: '배기량·연료·변속기 제원을 불러오는 중이에요' },
  { at: 70, text: '거의 다 됐어요. 정보를 맞춰보는 중이에요' },
  { at: 90, text: '조회한 정보를 정리하고 있어요' },
];

const VEHICLE_TYPE_OPTIONS = ['승용차', '택시', '렌터카', '화물차', '군용차', '외교차'];
// 영업 권리 거래 가치가 있는 차종(시안: 화물차·택시·렌터카)
const BIZ_RIGHTS_TYPES = ['화물차', '택시', '렌터카'];
import { getFirestore, collection, doc, writeBatch, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { isValidVehicleType, DEAL_STAGE } from '../constants';
import useVehicleStore from '../stores/vehicleStore';
import { generateTempId, executeOptimisticUpdate } from '../utils/optimisticHelpers';
import { prepareImageForUpload, prepareImagesForUpload, pickMultipleFromGallery, uploadImageWithProgress } from '../utils/imageHelpers';

const MAX_IMAGES = 8;

const VehicleRegistrationScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user, sellerName, sellerPhone, sellerEmail } = useContext(AuthContext);
  const toast = useToast();
  const { addOptimisticVehicle, removeOptimisticVehicle, invalidateUserVehiclesCache } = useVehicleStore();

  const [step, setStep] = useState(1); // 1 조회 · 2 사진/종류 · 3 영업권리
  const [regiNumber, setRegiNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [vehicleType, setVehicleType] = useState(''); // ✅ 초기값 "" (선택 안 한 상태)
  const [loading, setLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState(null);
  const [images, setImages] = useState([]); // Task 127: multiple images [{ uri, size }]
  const [uploadProgress, setUploadProgress] = useState(0); // Track upload progress (0-100)
  const [isUploading, setIsUploading] = useState(false); // Upload state flag
  const [saving, setSaving] = useState(false); // Save in-progress flag (double-submit guard)
  const [bizRights, setBizRights] = useState(false); // 영업 권리 함께 판매
  const [licenseInfo, setLicenseInfo] = useState(''); // 번호판 종류 / 운송 권역
  const [showSuccess, setShowSuccess] = useState(false); // 등록 완료 모달
  const [doneName, setDoneName] = useState(''); // 완료 모달에 표시할 차량명
  const bizApplicable = BIZ_RIGHTS_TYPES.includes(vehicleType);
  const lookup = useFakeProgress(LOOKUP_MESSAGES); // 조회 진행 오버레이

  const resetForm = () => {
    setRegiNumber('');
    setOwnerName('');
    setVehicleData(null);
    setImages([]);
    setVehicleType('');
    setBizRights(false);
    setLicenseInfo('');
    setStep(1);
  };

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
    lookup.start(); // 추정형 진행 오버레이 시작

    try {
      // Task #72: Use Firebase Function proxy for secure API key storage
      // Function deployed in asia-northeast3 (Seoul) for lower latency
      // 리전 지정은 getFunctions(app, region) 모듈러 API 사용 (RN Firebase v22)
      const fns = getFunctions(getApp(), 'asia-northeast3');
      const getVehicleInfo = httpsCallable(fns, 'getVehicleInfo');
      const result = await getVehicleInfo({ regiNumber, ownerName });

      logger.debug('API 응답:', result.data);

      if (!result.data.success) {
        lookup.cancel();
        toast.showError('조회 실패', '차량 정보를 찾을 수 없습니다.');
        return;
      }

      setVehicleData(result.data.data);
      lookup.finish(); // 응답 도착 → 100%로 마무리

    } catch (error) {
      logger.error('차량 정보 조회 실패:', error);
      lookup.cancel();
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
        businessRightsIncluded: bizApplicable ? bizRights : false,
        licenseInfo: (bizApplicable && bizRights) ? licenseInfo.trim() : '',
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

      // 등록 완료 모달 표시 (시안 플로우). 폼은 모달 액션에서 resetForm으로 정리.
      setDoneName(vehicleData.CARNAME);
      setShowSuccess(true);

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

  const STEP_LABEL = { 1: '차량 정보 조회', 2: '사진 추가', 3: '영업 권리 확인' };

  const goToStep2 = () => {
    if (!vehicleData) { toast.showWarning('알림', '먼저 차량 정보를 조회해주세요.'); return; }
    setStep(2);
  };
  const goToStep3 = () => {
    if (!isValidVehicleType(vehicleType)) { toast.showWarning('입력 오류', '차량 종류를 선택해주세요.'); return; }
    setStep(3);
  };
  const closeSuccess = (route) => {
    setShowSuccess(false);
    resetForm();
    if (route) { navigation.navigate(route); }
  };

  const c = theme.colors;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background.secondary }]} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: c.border.light, backgroundColor: c.background.card }]}>
        {step > 1 ? (
          <TouchableOpacity onPress={() => setStep(step - 1)} hitSlop={10} style={styles.backBtn}>
            <Icon name="chevron-left" size={28} color={c.primary.main} />
          </TouchableOpacity>
        ) : <View style={styles.backBtn} />}
        <Text style={[styles.headerTitle, { color: c.text.primary }]}>차량 등록</Text>
        <View style={styles.backBtn} />
      </View>

      {/* 진행 바 */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={[styles.progressSeg, { backgroundColor: s <= step ? c.primary.main : c.border.light }]} />
          ))}
        </View>
        <Text style={[styles.progressLabel, { color: c.text.tertiary }]}>{step} / 3 · {STEP_LABEL[step]}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* STEP 1 — 차량 정보 조회 */}
        {step === 1 && (
          <>
            <Card elevated style={styles.card}>
              <InputField label="차량번호" value={regiNumber} onChangeText={(t) => setRegiNumber(formatRegiNumber(t))} placeholder="예: 서울12가 3456" />
              <InputField label="소유자명" value={ownerName} onChangeText={setOwnerName} placeholder="소유자 이름 입력" />
              <Button
                variant="secondary"
                title={loading ? '조회 중...' : '차량 정보 조회'}
                onPress={fetchVehicleInfo}
                loading={loading}
                disabled={loading}
                fullWidth
                style={styles.mt8}
              />
            </Card>

            {vehicleData ? (
              <Card elevated style={styles.card}>
                <Text style={[styles.cardTitle, { color: c.text.primary }]}>차량 정보 미리보기</Text>
                <Image
                  source={{ uri: `https://www.cartory.net/cars/${vehicleData.CARURL}` }}
                  style={[styles.previewImage, { backgroundColor: '#EEF1F5' }]}
                  resizeMode="contain"
                />
                {[
                  ['차량번호', regiNumber],
                  ['소유자명', ownerName],
                  ['차량명', vehicleData.CARNAME],
                  ['제조사', vehicleData.CARVENDER],
                  ['연식', vehicleData.CARYEAR],
                  ['연료', vehicleData.FUEL],
                  ['변속기 · 배기량', `${vehicleData.MISSION || '-'} · ${vehicleData.CC ? `${vehicleData.CC} cc` : '-'}`],
                ].map(([k, v]) => (
                  <View key={k} style={[styles.kvRow, { borderBottomColor: c.border.light }]}>
                    <Text style={[styles.kvKey, { color: c.text.tertiary }]}>{k}</Text>
                    <Text style={[styles.kvVal, { color: c.text.primary }]}>{v || '-'}</Text>
                  </View>
                ))}
                <Button variant="primary" title="다음 단계" onPress={goToStep2} fullWidth style={styles.mt16} />
              </Card>
            ) : null}

            <View style={[styles.infoBanner, { backgroundColor: c.statusChip.completed.bg }]}>
              <Icon name="info" size={18} color={c.primary.main} />
              <Text style={[styles.infoText, { color: c.primary.main }]}>차량번호·소유자명으로 등록원부를 자동 조회합니다.</Text>
            </View>
          </>
        )}

        {/* STEP 2 — 차량 종류 + 사진 */}
        {step === 2 && (
          <>
            <Card elevated style={styles.card}>
              <Text style={[styles.cardTitle, { color: c.text.primary }]}>차량 사진 추가</Text>
              <Text style={[styles.cardDesc, { color: c.text.secondary }]}>실제 차량 사진을 추가하면 구매자 신뢰도가 높아져요. 최대 {MAX_IMAGES}장.</Text>

              <Text style={[styles.fieldLabel, { color: c.text.primary }]}>차량 종류</Text>
              <View style={styles.chipWrap}>
                {VEHICLE_TYPE_OPTIONS.map((t) => (
                  <CategoryChip key={t} label={t} selected={vehicleType === t} onPress={() => setVehicleType(t)} style={styles.chip} />
                ))}
              </View>

              <TouchableOpacity
                onPress={handleImageSelect}
                activeOpacity={0.8}
                style={[styles.imageTile, { borderColor: c.border.subtle, borderRadius: theme.borderRadius.input, backgroundColor: c.background.secondary }]}
              >
                <Icon name="add" size={22} color={c.primary.main} />
                <Text style={[styles.imageTileText, { color: c.text.secondary }]}>사진 추가 · {images.length}/{MAX_IMAGES}</Text>
              </TouchableOpacity>

              {images.length > 0 && (
                <View style={styles.thumbGrid}>
                  {images.map((img, index) => (
                    <View key={`${index}-${img.uri}`} style={styles.thumbWrapper}>
                      <Image source={{ uri: img.uri }} style={styles.thumb} />
                      <TouchableOpacity style={styles.thumbRemove} onPress={() => removeImageAt(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Icon name="close" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            <View style={styles.navRow}>
              <Button variant="ghost" title="이전" onPress={() => setStep(1)} style={styles.navPrev} />
              <Button variant="primary" title="다음 단계" onPress={goToStep3} style={styles.navNext} />
            </View>
          </>
        )}

        {/* STEP 3 — 영업 권리 + 요약 */}
        {step === 3 && (
          <>
            <Card elevated style={styles.card}>
              <Text style={[styles.cardTitle, { color: c.text.primary }]}>영업 권리 함께 판매</Text>
              <Text style={[styles.cardDesc, { color: c.text.secondary }]}>
                화물차·택시·렌터카는 차량과 별개로 운송 면허·영업용 번호판에 거래 가치가 있어요.
                {bizApplicable ? ' 함께 판매할지 선택하세요.' : ' 이 차종은 해당되지 않습니다.'}
              </Text>

              {bizApplicable && (
                <>
                  <View style={[styles.toggleCard, { backgroundColor: c.background.secondary }]}>
                    <View style={[styles.toggleBadge, { backgroundColor: c.statusChip.completed.bg }]}>
                      <Text style={[styles.toggleBadgeText, { color: c.primary.main }]}>면허</Text>
                    </View>
                    <View style={styles.toggleInfo}>
                      <Text style={[styles.toggleTitle, { color: c.text.primary }]}>영업용 번호판·면허 함께 판매</Text>
                      <Text style={[styles.toggleSub, { color: c.text.secondary }]}>번호판 권리·운송사업 허가 포함</Text>
                    </View>
                    <Switch
                      value={bizRights}
                      onValueChange={setBizRights}
                      trackColor={{ false: c.border.default, true: c.primary.main }}
                      thumbColor={c.neutral.white}
                    />
                  </View>

                  {bizRights && (
                    <>
                      <InputField label="번호판 종류 / 운송 권역" value={licenseInfo} onChangeText={setLicenseInfo} placeholder="예: 영업용 / 서울 개별화물" style={styles.mt12} />
                      <View style={[styles.warnBanner, { backgroundColor: c.statusChip.pending.bg }]}>
                        <Text style={[styles.warnText, { color: c.statusChip.pending.fg }]}>면허·번호판 권리는 관리자 검토 후 별도 안내됩니다. 명의이전 절차가 추가될 수 있어요.</Text>
                      </View>
                    </>
                  )}
                </>
              )}
            </Card>

            <Card elevated style={styles.card}>
              <Text style={[styles.cardTitle, { color: c.text.primary }]}>등록 요약</Text>
              {[
                ['차량', vehicleData ? `${vehicleData.CARNAME} · ${vehicleData.CARVENDER}` : '-'],
                ['차량 종류', vehicleType || '-'],
                ['사진', `${images.length}장 첨부`],
                ['영업 권리', (bizApplicable && bizRights) ? '포함 (영업 권리 함께 판매)' : '미포함 (차량만 판매)'],
              ].map(([k, v]) => (
                <View key={k} style={[styles.kvRow, { borderBottomColor: c.border.light }]}>
                  <Text style={[styles.kvKey, { color: c.text.tertiary }]}>{k}</Text>
                  <Text style={[styles.kvVal, { color: k === '영업 권리' && bizApplicable && bizRights ? c.primary.main : c.text.primary }]}>{v}</Text>
                </View>
              ))}
            </Card>

            {isUploading && (
              <View style={styles.progressContainer}>
                <Text style={[styles.progressText, { color: c.text.secondary }]}>업로드 중... {uploadProgress.toFixed(0)}%</Text>
                <View style={[styles.progressBarBackground, { backgroundColor: c.background.tertiary }]}>
                  <View style={[styles.progressBarFill, { width: `${uploadProgress}%`, backgroundColor: c.primary.main }]} />
                </View>
              </View>
            )}

            <View style={styles.navRow}>
              <Button variant="ghost" title="이전" onPress={() => setStep(2)} disabled={saving || isUploading} style={styles.navPrev} />
              <Button variant="primary" title={saving ? '등록 중...' : '등록 완료'} onPress={saveVehicleData} loading={saving} disabled={saving || isUploading} style={styles.navNext} />
            </View>
          </>
        )}
      </ScrollView>

      {/* 차량 정보 조회 진행 오버레이 */}
      <ApiProgressOverlay
        visible={lookup.active}
        progress={lookup.progress}
        message={lookup.message}
        title="차량 정보 조회 중"
      />

      {/* 등록 완료 모달 */}
      <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={() => closeSuccess()}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.background.card }]}>
            <View style={[styles.checkCircle, { backgroundColor: c.statusChip.approved.bg }]}>
              <Icon name="check" size={36} color={c.success.main} />
            </View>
            <Text style={[styles.modalTitle, { color: c.text.primary }]}>차량 등록 완료</Text>
            <Text style={[styles.modalDesc, { color: c.text.secondary }]}>{doneName || '차량'}가 등록되어{'\n'}구매자 목록에 노출됩니다.</Text>
            <View style={[styles.modalNote, { backgroundColor: c.background.secondary }]}>
              <Text style={[styles.modalNoteText, { color: c.text.tertiary }]}>품질 검토 후 문제가 있으면{'\n'}관리자가 안내드려요</Text>
            </View>
            <Button variant="primary" title="내 차량 보기" onPress={() => closeSuccess('MyPage')} fullWidth style={styles.mt8} />
            <Pressable onPress={() => closeSuccess('Vehicles')} hitSlop={8} style={styles.modalHome}>
              <Text style={[styles.modalHomeText, { color: c.text.tertiary }]}>홈으로</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  // 헤더
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 32, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  // 진행 바
  progressWrap: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 4 },
  progressTrack: { flexDirection: 'row', gap: 6 },
  progressSeg: { flex: 1, height: 5, borderRadius: 3 },
  progressLabel: { fontSize: 12, marginTop: 9 },
  scroll: { padding: 20, paddingBottom: 30 },
  card: { padding: 20, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  cardDesc: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  // 미리보기/요약 키-값
  previewImage: { width: '100%', height: 180, borderRadius: 14, marginBottom: 14 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1 },
  kvKey: { fontSize: 14 },
  kvVal: { fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  // 정보/경고 배너
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14 },
  infoText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },
  warnBanner: { padding: 13, borderRadius: 12, marginTop: 12 },
  warnText: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  // 종류 칩
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { marginRight: 8, marginBottom: 8 },
  // 사진 타일/썸네일
  imageTile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 16 },
  imageTileText: { fontSize: 14, fontWeight: '700' },
  thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  thumbWrapper: { position: 'relative' },
  thumb: { width: 76, height: 76, borderRadius: 12, resizeMode: 'cover' },
  thumbRemove: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#DC3545', alignItems: 'center', justifyContent: 'center' },
  // 영업 권리 토글
  toggleCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: 14 },
  toggleBadge: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleBadgeText: { fontSize: 13, fontWeight: '800' },
  toggleInfo: { flex: 1 },
  toggleTitle: { fontSize: 14, fontWeight: '700' },
  toggleSub: { fontSize: 12, marginTop: 2 },
  // 이전/다음 버튼 행
  navRow: { flexDirection: 'row', gap: 12 },
  navPrev: { flex: 1 },
  navNext: { flex: 2 },
  // 업로드 진행
  progressContainer: { marginBottom: 14 },
  progressText: { fontSize: 13, marginBottom: 6, textAlign: 'center', fontWeight: '600' },
  progressBarBackground: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  // 완료 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,22,38,0.55)', justifyContent: 'center', paddingHorizontal: 32 },
  modalCard: { borderRadius: 24, padding: 28, alignItems: 'center' },
  checkCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginTop: 18 },
  modalDesc: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  modalNote: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginTop: 18, alignSelf: 'stretch' },
  modalNoteText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  modalHome: { paddingVertical: 12, marginTop: 6 },
  modalHomeText: { fontSize: 14, fontWeight: '600' },
});

export default VehicleRegistrationScreen;
