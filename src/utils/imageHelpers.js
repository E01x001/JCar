
/**
 * Image Upload Optimization Utilities
 *
 * Task 107: Utilities for optimized image handling
 * - Image selection (gallery/camera)
 * - Client-side compression
 * - File size validation
 * - Upload progress tracking
 */

import ImagePicker from 'react-native-image-crop-picker';
import { Image } from 'react-native-compressor';
import { logger } from './logger';

// Configuration constants
const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1080;
const COMPRESSION_QUALITY = 0.8; // 80% quality
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Pick image from gallery with crop option
 * @param {Object} options - Configuration options
 * @param {boolean} options.cropping - Enable cropping (default: true)
 * @param {number} options.width - Crop width (default: MAX_IMAGE_WIDTH)
 * @param {number} options.height - Crop height (default: MAX_IMAGE_HEIGHT)
 * @returns {Promise<Object>} Selected image info
 */
export const pickImageFromGallery = async (options = {}) => {
  const {
    cropping = true,
    width = MAX_IMAGE_WIDTH,
    height = MAX_IMAGE_HEIGHT,
  } = options;

  try {
    const image = await ImagePicker.openPicker({
      width,
      height,
      cropping,
      compressImageQuality: COMPRESSION_QUALITY,
      mediaType: 'photo',
      includeBase64: false,
    });

    logger.debug('📷 Image selected from gallery:', {
      path: image.path,
      size: (image.size / 1024).toFixed(2) + ' KB',
      dimensions: `${image.width}x${image.height}`,
    });

    return image;
  } catch (error) {
    if (error.code === 'E_PICKER_CANCELLED') {
      logger.debug('ℹ️ User cancelled image picker');
      return null;
    }
    throw error;
  }
};

/**
 * Pick image from camera with crop option
 * @param {Object} options - Configuration options
 * @param {boolean} options.cropping - Enable cropping (default: true)
 * @param {number} options.width - Crop width (default: MAX_IMAGE_WIDTH)
 * @param {number} options.height - Crop height (default: MAX_IMAGE_HEIGHT)
 * @returns {Promise<Object>} Captured image info
 */
export const pickImageFromCamera = async (options = {}) => {
  const {
    cropping = true,
    width = MAX_IMAGE_WIDTH,
    height = MAX_IMAGE_HEIGHT,
  } = options;

  try {
    const image = await ImagePicker.openCamera({
      width,
      height,
      cropping,
      compressImageQuality: COMPRESSION_QUALITY,
      mediaType: 'photo',
      includeBase64: false,
    });

    logger.debug('📸 Image captured from camera:', {
      path: image.path,
      size: (image.size / 1024).toFixed(2) + ' KB',
      dimensions: `${image.width}x${image.height}`,
    });

    return image;
  } catch (error) {
    if (error.code === 'E_PICKER_CANCELLED') {
      logger.debug('ℹ️ User cancelled camera');
      return null;
    }
    throw error;
  }
};

/**
 * Pick multiple images from gallery (Task 127)
 * Cropping is disabled for multi-select (the cropper is single-image only).
 * @param {Object} options
 * @param {number} options.maxFiles - Maximum number of images to select
 * @returns {Promise<Array>} Array of selected image objects (empty if cancelled)
 */
export const pickMultipleFromGallery = async (options = {}) => {
  const { maxFiles = 8 } = options;

  try {
    const images = await ImagePicker.openPicker({
      multiple: true,
      maxFiles,
      mediaType: 'photo',
      compressImageQuality: COMPRESSION_QUALITY,
      includeBase64: false,
    });
    return Array.isArray(images) ? images : [images];
  } catch (error) {
    if (error.code === 'E_PICKER_CANCELLED') {
      logger.debug('ℹ️ User cancelled multi image picker');
      return [];
    }
    throw error;
  }
};

/**
 * Compress + validate a batch of picked images for upload (Task 127).
 * @param {Array} images - Picker image objects (with .path and .size)
 * @returns {Promise<Array>} Array of { uri, size } prepared images
 */
export const prepareImagesForUpload = async (images = []) => {
  const prepared = [];
  for (const image of images) {
    const compressedUri = await compressImage(image.path);
    const estimatedSize = image.size * COMPRESSION_QUALITY;
    validateFileSize(estimatedSize);
    prepared.push({ uri: compressedUri, originalUri: image.path, size: estimatedSize });
  }
  return prepared;
};

/**
 * Compress image to reduce file size
 * @param {string} imageUri - Local file path of image
 * @returns {Promise<string>} Compressed image path
 */
export const compressImage = async (imageUri) => {
  try {
    logger.debug('🗜️ Starting image compression...');
    const startTime = Date.now();

    const compressedUri = await Image.compress(imageUri, {
      maxWidth: MAX_IMAGE_WIDTH,
      maxHeight: MAX_IMAGE_HEIGHT,
      quality: COMPRESSION_QUALITY,
    });

    const duration = Date.now() - startTime;
    logger.debug(`✅ Image compressed in ${duration}ms`);
    logger.debug('   Output:', compressedUri);

    return compressedUri;
  } catch (error) {
    logger.error('❌ Image compression failed:', error);
    throw new Error('이미지 압축 중 오류가 발생했습니다.');
  }
};

/**
 * Validate file size is within limit
 * @param {number} sizeInBytes - File size in bytes
 * @returns {boolean} True if valid, throws error if too large
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
 * @param {string} source - 'gallery' or 'camera'
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} { uri, size, isValid } - Prepared image info
 */
export const prepareImageForUpload = async (source = 'gallery', options = {}) => {
  try {
    // Step 1: Pick image
    let image;
    if (source === 'camera') {
      image = await pickImageFromCamera(options);
    } else {
      image = await pickImageFromGallery(options);
    }

    if (!image) {
      return null; // User cancelled
    }

    // Step 2: Compress image
    const compressedUri = await compressImage(image.path);

    // Step 3: Get file info for compressed image
    // Note: react-native-compressor doesn't return size, so we use original size estimate
    const estimatedSize = image.size * COMPRESSION_QUALITY;

    // Step 4: Validate file size
    try {
      validateFileSize(estimatedSize);
    } catch (error) {
      logger.warn('⚠️ File size validation failed:', error.message);
      throw error;
    }

    logger.debug('✅ Image prepared for upload');
    return {
      uri: compressedUri,
      originalUri: image.path,
      size: estimatedSize,
      isValid: true,
    };
  } catch (error) {
    logger.error('❌ Image preparation failed:', error);
    throw error;
  }
};

/**
 * Cleanup function to remove temporary image files
 * @param {string} imageUri - Local file path to clean up
 */
export const cleanupImageCache = async (imageUri) => {
  try {
    await ImagePicker.cleanSingle(imageUri);
    logger.debug('🗑️ Cleaned up temporary image:', imageUri);
  } catch (error) {
    logger.warn('⚠️ Failed to clean up image cache:', error);
  }
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size string
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
