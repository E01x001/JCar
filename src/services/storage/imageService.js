/**
 * Image Service
 * Handles image upload, download, and management operations with Firebase Storage
 */

import storage from '@react-native-firebase/storage';
import { Platform } from 'react-native';

/**
 * Upload image to Firebase Storage
 */
export const uploadImage = async (uri, path) => {
  try {
    const filename = uri.substring(uri.lastIndexOf('/') + 1);
    const uploadPath = `${path}/${filename}`;

    // For Android, we need to handle the file URI properly
    const fileUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');

    const reference = storage().ref(uploadPath);
    await reference.putFile(fileUri);

    const downloadURL = await reference.getDownloadURL();

    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Upload multiple images
 */
export const uploadMultipleImages = async (uris, path) => {
  try {
    const uploadPromises = uris.map(uri => uploadImage(uri, path));
    const downloadURLs = await Promise.all(uploadPromises);

    return downloadURLs;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
};

/**
 * Delete image from Firebase Storage
 */
export const deleteImage = async (imageUrl) => {
  try {
    const reference = storage().refFromURL(imageUrl);
    await reference.delete();

    return { success: true };
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * Delete multiple images
 */
export const deleteMultipleImages = async (imageUrls) => {
  try {
    const deletePromises = imageUrls.map(url => deleteImage(url));
    await Promise.all(deletePromises);

    return { success: true };
  } catch (error) {
    console.error('Error deleting multiple images:', error);
    throw error;
  }
};

/**
 * Get image download URL
 */
export const getImageDownloadURL = async (path) => {
  try {
    const reference = storage().ref(path);
    const downloadURL = await reference.getDownloadURL();

    return downloadURL;
  } catch (error) {
    console.error('Error getting image download URL:', error);
    throw error;
  }
};

/**
 * Compress and upload image
 * Note: Actual compression would require additional library like react-native-image-resizer
 */
export const compressAndUploadImage = async (uri, path, quality = 0.8) => {
  try {
    // TODO: Implement image compression using react-native-image-resizer or similar
    // For now, just upload the original image
    const downloadURL = await uploadImage(uri, path);

    return downloadURL;
  } catch (error) {
    console.error('Error compressing and uploading image:', error);
    throw error;
  }
};

/**
 * Check if image exists in storage
 */
export const imageExists = async (path) => {
  try {
    const reference = storage().ref(path);
    await reference.getDownloadURL();

    return true;
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      return false;
    }
    console.error('Error checking image existence:', error);
    throw error;
  }
};

/**
 * Get image metadata
 */
export const getImageMetadata = async (path) => {
  try {
    const reference = storage().ref(path);
    const metadata = await reference.getMetadata();

    return metadata;
  } catch (error) {
    console.error('Error getting image metadata:', error);
    throw error;
  }
};

export default {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  getImageDownloadURL,
  compressAndUploadImage,
  imageExists,
  getImageMetadata,
};
