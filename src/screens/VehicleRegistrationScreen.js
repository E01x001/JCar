import React, { useState, useContext } from 'react';
import { logger } from '../utils/logger';
import { View, Text, TextInput, Button, ScrollView, ActivityIndicator, StyleSheet, SafeAreaView, Image, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getFirestore, collection, doc, writeBatch, serverTimestamp } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import functions from '@react-native-firebase/functions';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { VEHICLE_STATUS, VEHICLE_TYPES, isValidVehicleType } from '../constants';
import useVehicleStore from '../stores/vehicleStore';
import { generateTempId, executeOptimisticUpdate } from '../utils/optimisticHelpers';
import { prepareImageForUpload, prepareImagesForUpload, pickMultipleFromGallery, uploadImageWithProgress } from '../utils/imageHelpers';

const MAX_IMAGES = 8;

const VehicleRegistrationScreen = () => {
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
      const getVehicleInfo = functions('asia-northeast3').httpsCallable('getVehicleInfo');
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
        sellerName: sellerName || 'Unknown',
        sellerPhone: sellerPhone || 'Unknown',
        sellerEmail: sellerEmail || 'Unknown',
        status: 'pending', // Vehicles start as pending approval
      };

      // Optimistic update: Add immediately to store
      addOptimisticVehicle(vehicleDataToSave, tempId);

      // Clear cache to show new vehicle immediately
      invalidateUserVehiclesCache(user.uid);

      // Show success immediately (optimistic)
      toast.showSuccess('성공', '차량 정보가 저장되었습니다. 관리자 승인을 기다리세요.');

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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.label}>차량번호</Text>
        <TextInput
          value={regiNumber}
          onChangeText={(text) => setRegiNumber(formatRegiNumber(text))}
          style={styles.input}
          placeholder="예: 서울12가 3456"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>소유자명</Text>
        <TextInput
          value={ownerName}
          onChangeText={setOwnerName}
          style={styles.input}
          placeholder="소유자 이름 입력"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>차량 종류</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={vehicleType}
            onValueChange={(itemValue) => setVehicleType(itemValue)}
            style={[styles.picker, { color: vehicleType ? '#000' : '#aaa' }]} // ✅ 선택 여부에 따라 글자색 다르게
            dropdownIconColor="#000"
          >
            <Picker.Item label="차량 종류 선택" value="" color="#aaa" />
            <Picker.Item label="승용차" value="승용차" color="#eeeeee" />
            <Picker.Item label="택시" value="택시" color="#eeeeee" />
            <Picker.Item label="렌터카" value="렌터카" color="#eeeeee" />
            <Picker.Item label="화물차" value="화물차" color="#eeeeee" />
            <Picker.Item label="군용차" value="군용차" color="#eeeeee" />
            <Picker.Item label="외교차" value="외교차" color="#eeeeee" />
          </Picker>
        </View>

        <TouchableOpacity onPress={handleImageSelect} style={styles.imageButton}>
          <Text style={styles.imageButtonText}>
            추가 사진 선택 (선택) {images.length > 0 ? `· ${images.length}/${MAX_IMAGES}` : ''}
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
            <Text style={styles.progressText}>업로드 중... {uploadProgress.toFixed(0)}%</Text>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button title="차량 정보 조회" onPress={fetchVehicleInfo} disabled={loading} color="#2B4593" />
          {loading && <ActivityIndicator size="large" color="#2B4593" />}
        </View>

        {vehicleData && (
          <View style={styles.vehiclePreview}>
            <Text style={styles.previewTitle}>🚗 차량 정보 미리보기</Text>
            {vehicleData.CARURL && (
              <Image
                source={{ uri: `https://www.cartory.net/cars/${vehicleData.CARURL}` }}
                style={styles.vehicleImage}
              />
            )}
            <Text>🔹 차량번호: {regiNumber}</Text>
            <Text>🔹 소유자명: {ownerName}</Text>
            <Text>🔹 차량명: {vehicleData.CARNAME}</Text>
            <Text>🔹 제조사: {vehicleData.CARVENDER}</Text>
            <Text>🔹 연식: {vehicleData.CARYEAR}</Text>
            <Text>🔹 연료: {vehicleData.FUEL}</Text>
            <Text>🔹 변속기: {vehicleData.MISSION}</Text>
            <Text>🔹 배기량: {vehicleData.CC} cc</Text>
            <Text>🔹 연비: {vehicleData.FUELECO} km/L</Text>

            <View style={styles.buttonContainer}>
              <Button
                title={saving ? '저장 중...' : '차량 정보 저장'}
                onPress={saveVehicleData}
                disabled={saving || isUploading}
                color="#2B4593"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollViewContent: { padding: 20, paddingBottom: 30 },
  label: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 15, borderRadius: 8, backgroundColor: '#fff', fontSize: 16 },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, overflow: 'hidden', marginBottom: 15, backgroundColor: '#fff' },
  picker: { height: 55, width: '100%', fontSize: 16 }, // ✅ 높이와 글자 크기 조정
  buttonContainer: { marginTop: 20, alignItems: 'center' },
  vehiclePreview: { marginTop: 30, padding: 15, backgroundColor: '#fff', borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  previewTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  vehicleImage: { width: '100%', height: 200, resizeMode: 'contain', marginBottom: 10 },
  imageButton: { padding: 10, backgroundColor: '#e0e0e0', alignItems: 'center', marginBottom: 10, borderRadius: 6 },
  imageButtonText: { color: '#333' },
  // Task 127: multi-image thumbnail strip
  thumbStrip: { marginBottom: 10 },
  thumbWrapper: { marginRight: 8, position: 'relative' },
  thumb: { width: 90, height: 90, borderRadius: 6, resizeMode: 'cover' },
  thumbRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#d11', alignItems: 'center', justifyContent: 'center',
  },
  thumbRemoveText: { color: '#fff', fontSize: 16, lineHeight: 18, fontWeight: 'bold' },
  progressContainer: { marginTop: 10, marginBottom: 15 },
  progressText: { fontSize: 14, color: '#2B4593', marginBottom: 5, textAlign: 'center', fontWeight: '600' },
  progressBarBackground: { height: 20, backgroundColor: '#e0e0e0', borderRadius: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#28a745', borderRadius: 10 },
});

export default VehicleRegistrationScreen;
