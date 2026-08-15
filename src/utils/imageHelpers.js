/**
 * Image Upload Optimization Utilities
 *
 * Expo 전환: react-native-image-crop-picker + react-native-compressor →
 *            expo-image-picker + expo-image-manipulator
 *
 * 외부에 노출하는 함수 시그니처와 반환 형태({ uri, size })는 그대로 유지해
 * 호출부(VehicleRegistrationScreen)는 수정이 필요 없다.
 *
 * 크로퍼 차이: 기존 라이브러리는 전용 크롭 UI를 제공했으나 expo-image-picker는
 * allowsEditing(단일 선택 시 기본 크롭)만 제공한다. 다중 선택에서는 양쪽 모두
 * 크롭을 지원하지 않으므로 동작이 동일하다.
 */

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { logger } from './logger';

// Configuration constants
const MAX_IMAGE_WIDTH = 1920;
const COMPRESSION_QUALITY = 0.8; // 80% quality
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** 권한 요청 — 거부되면 명확한 한글 메시지로 던진다 */
const ensureLibraryPermission = async () => {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!granted) {
    throw new Error('사진 보관함 접근 권한이 필요합니다. 설정에서 허용해주세요.');
  }
};

const ensureCameraPermission = async () => {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) {
    throw new Error('카메라 권한이 필요합니다. 설정에서 허용해주세요.');
  }
};

/** 선택 결과(asset) → 기존 코드가 기대하던 { path, size, width, height } 형태로 정규화 */
const toLegacyShape = (asset) => ({
  path: asset.uri,
  size: asset.fileSize ?? 0,
  width: asset.width,
  height: asset.height,
});

/**
 * Pick image from gallery with crop option
 * @param {Object} options
 * @param {boolean} options.cropping - 크롭 UI 사용 여부 (default: true)
 * @returns {Promise<Object|null>} 선택 결과(취소 시 null)
 */
export const pickImageFromGallery = async (options = {}) => {
  const { cropping = true } = options;
  await ensureLibraryPermission();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: cropping,
    quality: COMPRESSION_QUALITY,
  });

  if (result.canceled) {
    logger.debug('ℹ️ User cancelled image picker');
    return null;
  }

  const asset = result.assets[0];
  logger.debug('📷 Image selected from gallery:', {
    size: ((asset.fileSize ?? 0) / 1024).toFixed(2) + ' KB',
    dimensions: `${asset.width}x${asset.height}`,
  });
  return toLegacyShape(asset);
};

/**
 * Pick image from camera with crop option
 * @param {Object} options
 * @param {boolean} options.cropping - 크롭 UI 사용 여부 (default: true)
 * @returns {Promise<Object|null>} 촬영 결과(취소 시 null)
 */
export const pickImageFromCamera = async (options = {}) => {
  const { cropping = true } = options;
  await ensureCameraPermission();

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: cropping,
    quality: COMPRESSION_QUALITY,
  });

  if (result.canceled) {
    logger.debug('ℹ️ User cancelled camera');
    return null;
  }

  const asset = result.assets[0];
  logger.debug('📸 Image captured from camera:', {
    size: ((asset.fileSize ?? 0) / 1024).toFixed(2) + ' KB',
    dimensions: `${asset.width}x${asset.height}`,
  });
  return toLegacyShape(asset);
};

/**
 * Pick multiple images from gallery (Task 127)
 * 다중 선택에서는 크롭을 쓸 수 없다(크로퍼는 단일 이미지 전용).
 * @param {Object} options
 * @param {number} options.maxFiles - 최대 선택 장수
 * @returns {Promise<Array>} 선택 결과 배열(취소 시 빈 배열)
 */
export const pickMultipleFromGallery = async (options = {}) => {
  const { maxFiles = 8 } = options;
  await ensureLibraryPermission();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: maxFiles,
    quality: COMPRESSION_QUALITY,
  });

  if (result.canceled) {
    logger.debug('ℹ️ User cancelled multi image picker');
    return [];
  }
  return result.assets.map(toLegacyShape);
};

/**
 * Compress + validate a batch of picked images for upload (Task 127).
 * @param {Array} images - 선택 결과 배열(.path/.size)
 * @returns {Promise<Array>} { uri, originalUri, size } 배열
 */
export const prepareImagesForUpload = async (images = []) => {
  const prepared = [];
  for (const image of images) {
    const { uri, size } = await compressImage(image.path);
    validateFileSize(size || image.size * COMPRESSION_QUALITY);
    prepared.push({
      uri,
      originalUri: image.path,
      size: size || image.size * COMPRESSION_QUALITY,
    });
  }
  return prepared;
};

/**
 * 이미지 리사이즈·압축.
 * expo-image-manipulator는 압축 후 실제 파일 크기를 돌려주지 않으므로
 * expo-file-system으로 크기를 직접 조회한다(기존 구현은 추정값만 썼다).
 *
 * @param {string} imageUri
 * @returns {Promise<{uri: string, size: number}>}
 */
export const compressImage = async (imageUri) => {
  try {
    logger.debug('🗜️ Starting image compression...');
    const startTime = Date.now();

    const context = ImageManipulator.ImageManipulator.manipulate(imageUri);
    context.resize({ width: MAX_IMAGE_WIDTH });
    const image = await context.renderAsync();
    const result = await image.saveAsync({
      compress: COMPRESSION_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    let size = 0;
    try {
      const info = await FileSystem.getInfoAsync(result.uri);
      size = info.exists ? info.size ?? 0 : 0;
    } catch (e) {
      logger.debug('압축 파일 크기 조회 실패(추정값 사용):', e?.message);
    }

    logger.debug(`✅ Image compressed in ${Date.now() - startTime}ms`);
    return { uri: result.uri, size };
  } catch (error) {
    logger.error('❌ Image compression failed:', error);
    throw new Error('이미지 압축 중 오류가 발생했습니다.');
  }
};

/**
 * Validate file size is within limit
 * @param {number} sizeInBytes
 * @returns {boolean} 초과 시 throw
 */
export const validateFileSize = (sizeInBytes) => {
  if (sizeInBytes > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    throw new Error(
      `파일 크기가 너무 큽니다. (${sizeMB}MB)\n최대 ${MAX_FILE_SIZE_MB}MB까지 업로드 가능합니다.`
    );
  }
  return true;
};

/**
 * Complete workflow: Pick, compress, validate, and prepare for upload
 * @param {string} source - 'gallery' | 'camera'
 * @param {Object} options
 * @returns {Promise<Object|null>} { uri, originalUri, size, isValid }
 */
export const prepareImageForUpload = async (source = 'gallery', options = {}) => {
  try {
    const image = source === 'camera'
      ? await pickImageFromCamera(options)
      : await pickImageFromGallery(options);

    if (!image) { return null; } // 사용자 취소

    const { uri, size } = await compressImage(image.path);
    const finalSize = size || image.size * COMPRESSION_QUALITY;
    validateFileSize(finalSize);

    logger.debug('✅ Image prepared for upload');
    return { uri, originalUri: image.path, size: finalSize, isValid: true };
  } catch (error) {
    logger.error('❌ Image preparation failed:', error);
    throw error;
  }
};

/**
 * 임시 이미지 파일 정리.
 * expo-image-picker는 캐시 정리 API를 제공하지 않으므로 파일을 직접 지운다.
 * @param {string} imageUri
 */
export const cleanupImageCache = async (imageUri) => {
  try {
    await FileSystem.deleteAsync(imageUri, { idempotent: true });
    logger.debug('🗑️ Cleaned up temporary image:', imageUri);
  } catch (error) {
    logger.warn('⚠️ Failed to clean up image cache:', error?.message);
  }
};

/**
 * Format file size for display
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (bytes < 1024) {
    return bytes + ' B';
  }
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};
