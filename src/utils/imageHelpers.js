/* eslint-disable no-console */
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
import storage from '@react-native-firebase/storage';

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

    console.log('📷 Image selected from gallery:', {
      path: image.path,
      size: (image.size / 1024).toFixed(2) + ' KB',
      dimensions: `${image.width}x${image.height}`,
    });

    return image;
  } catch (error) {
    if (error.code === 'E_PICKER_CANCELLED') {
      console.log('ℹ️ User cancelled image picker');
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

    console.log('📸 Image captured from camera:', {
      path: image.path,
      size: (image.size / 1024).toFixed(2) + ' KB',
      dimensions: `${image.width}x${image.height}`,
    });

    return image;
  } catch (error) {
    if (error.code === 'E_PICKER_CANCELLED') {
      console.log('ℹ️ User cancelled camera');
      return null;
    }
    throw error;
  }
};

/**
 * Compress image to reduce file size
 * @param {string} imageUri - Local file path of image
 * @returns {Promise<string>} Compressed image path
 */
export const compressImage = async (imageUri) => {
  try {
    console.log('🗜️ Starting image compression...');
    const startTime = Date.now();

    const compressedUri = await Image.compress(imageUri, {
      maxWidth: MAX_IMAGE_WIDTH,
      maxHeight: MAX_IMAGE_HEIGHT,
      quality: COMPRESSION_QUALITY,
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Image compressed in ${duration}ms`);
    console.log('   Output:', compressedUri);

    return compressedUri;
  } catch (error) {
    console.error('❌ Image compression failed:', error);
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
 * Upload image to Firebase Storage with progress tracking
 * @param {string} imageUri - Local file path
 * @param {string} storagePath - Firebase storage path (e.g., 'vehicles/image.jpg')
 * @param {Function} onProgress - Callback for progress updates (0-100)
 * @returns {Promise<string>} Download URL of uploaded image
 */
export const uploadImageWithProgress = async (imageUri, storagePath, onProgress) => {
  try {
    const reference = storage().ref(storagePath);
    const uploadTask = reference.putFile(imageUri);

    // Track upload progress
    uploadTask.on('state_changed', (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log(`📤 Upload progress: ${progress.toFixed(0)}%`);

      if (onProgress) {
        onProgress(progress);
      }
    });

    // Wait for upload to complete
    await uploadTask;

    // Get download URL
    const downloadURL = await reference.getDownloadURL();
    console.log('✅ Image uploaded successfully:', downloadURL);

    return downloadURL;
  } catch (error) {
    console.error('❌ Image upload failed:', error);
    throw new Error('이미지 업로드 중 오류가 발생했습니다.');
  }
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
      console.warn('⚠️ File size validation failed:', error.message);
      throw error;
    }

    console.log('✅ Image prepared for upload');
    return {
      uri: compressedUri,
      originalUri: image.path,
      size: estimatedSize,
      isValid: true,
    };
  } catch (error) {
    console.error('❌ Image preparation failed:', error);
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
    console.log('🗑️ Cleaned up temporary image:', imageUri);
  } catch (error) {
    console.warn('⚠️ Failed to clean up image cache:', error);
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
