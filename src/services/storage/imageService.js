/**
 * Image Service (Phase 2b — Firebase Storage → Supabase Storage 'vehicles' 버킷)
 *
 * 개선(배포점검 반영):
 *  - 파일명은 타임스탬프+난수로 생성 → 동일 원본명 충돌/덮어쓰기 방지
 *  - 다중 업로드 부분 실패 시 이미 올라간 파일 정리(고아 파일 방지)
 */
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

const BUCKET = 'vehicles';

const extFromUri = (uri) => {
  const m = /\.(\w{2,5})(?:\?|$)/.exec(uri || '');
  return (m ? m[1] : 'jpg').toLowerCase();
};

const randomName = (uri) =>
  `vehicle_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${extFromUri(uri)}`;

/** 공개 URL에서 버킷 내 경로 추출 */
const pathFromPublicUrl = (url) => {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
};

/**
 * 이미지 1장 업로드 → 공개 URL 반환
 */
export const uploadImage = async (uri) => {
  try {
    const response = await fetch(uri);
    // RN에서 Blob 직접 업로드는 0바이트 업로드 사례가 알려져 있어(supabase-js#RN)
    // ArrayBuffer를 우선 사용하고, 미지원 환경에서만 Blob으로 폴백한다.
    const blob = await response.blob();
    const body = typeof blob.arrayBuffer === 'function' ? await blob.arrayBuffer() : blob;
    const path = randomName(uri);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, body, { contentType: blob.type || 'image/jpeg', upsert: false });
    if (error) { throw error; }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    logger.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * 다중 업로드 — 하나라도 실패하면 성공분을 정리하고 throw
 */
export const uploadMultipleImages = async (uris) => {
  const results = await Promise.allSettled(uris.map((uri) => uploadImage(uri)));
  const failed = results.filter((r) => r.status === 'rejected');

  if (failed.length > 0) {
    const uploaded = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);
    if (uploaded.length > 0) {
      // 부분 성공분 정리 (실패해도 원 에러를 우선 보고)
      try { await deleteMultipleImages(uploaded); } catch (e) { logger.error('부분 업로드 정리 실패:', e); }
    }
    logger.error('Error uploading multiple images:', failed[0].reason);
    throw failed[0].reason;
  }

  return results.map((r) => r.value);
};

/**
 * 공개 URL로 이미지 삭제
 * 참고: 클라이언트 삭제는 Storage RLS 정책이 허용해야 동작(현재 정책상 실패 가능)
 * — 정리 작업은 서버(Edge Function)에서 수행하는 것이 정석.
 */
export const deleteImage = async (imageUrl) => {
  try {
    const path = pathFromPublicUrl(imageUrl);
    if (!path) { return { success: false }; }
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) { throw error; }
    return { success: true };
  } catch (error) {
    logger.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * 다중 삭제 — 개별 실패는 무시하고 계속(allSettled)
 */
export const deleteMultipleImages = async (imageUrls) => {
  const results = await Promise.allSettled(imageUrls.map((url) => deleteImage(url)));
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    logger.error(`이미지 ${failed.length}건 삭제 실패(무시하고 진행)`);
  }
  return { success: failed.length === 0 };
};

/**
 * 경로의 공개 URL
 */
export const getImageDownloadURL = async (path) => {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Compress and upload image
 * Note: Actual compression would require additional library like react-native-image-resizer
 */
export const compressAndUploadImage = async (uri) => {
  // TODO: react-native-image-resizer 도입 시 압축 추가
  return uploadImage(uri);
};

export default {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  getImageDownloadURL,
  compressAndUploadImage,
};
