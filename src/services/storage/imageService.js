/**
 * Image Service (Phase 2b — Firebase Storage → Supabase Storage 'vehicles' 버킷)
 *
 * 개선(배포점검 반영):
 *  - 파일명은 타임스탬프+난수로 생성 → 동일 원본명 충돌/덮어쓰기 방지
 *  - 다중 업로드 부분 실패 시 이미 올라간 파일 정리(고아 파일 방지)
 *  - 경로를 {uid}/ 아래로 묶는다. 스토리지 정책이 본인 폴더만 쓰기/삭제를 허용하므로
 *    이 접두사가 없으면 업로드 자체가 거부된다.
 */
import { File } from 'expo-file-system';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

const BUCKET = 'vehicles';

const extFromUri = (uri) => {
  const m = /\.(\w{2,5})(?:\?|$)/.exec(uri || '');
  return (m ? m[1] : 'jpg').toLowerCase();
};

const randomName = (uri) =>
  `vehicle_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${extFromUri(uri)}`;

/**
 * 업로드할 Content-Type을 **우리가 정한다.**
 *
 * 버킷이 image/jpeg·png·webp만 받는데(20260818113000), RN의 fetch(file://)가
 * 돌려주는 blob.type은 환경에 따라 'application/octet-stream'이거나 빈 문자열이다.
 * 그 값을 그대로 넘기면 스토리지가 415 invalid_mime_type으로 거부한다 —
 * 실제로 사진 업로드가 이 경로로 실패했다.
 *
 * blob.type은 image/*일 때만 신뢰하고, 아니면 확장자에서 정한다.
 */
const MIME_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const resolveContentType = (uri) => MIME_BY_EXT[extFromUri(uri)] ?? 'image/jpeg';

/**
 * 파일 바이트를 읽는다. **Blob으로 넘기면 안 된다.**
 *
 * supabase-js storage는 body가 Blob이면 FormData로 감싸는데, 그 경로에서는
 * 우리가 지정한 contentType을 헤더에 싣지 않는다:
 *
 *   if (fileBody instanceof Blob) { body = new FormData(); ... }   // content-type 없음
 *   else { headers['content-type'] = options.contentType; }        // 여기서만 실린다
 *
 * 그래서 서버는 기본값 text/plain으로 받고, 버킷이 image/*만 허용하므로
 * 415 invalid_mime_type으로 거부한다. 실제로 사진 업로드가 이 경로로 실패했다.
 *
 * RN의 Blob에는 arrayBuffer()가 없어 예전 폴백이 Blob을 그대로 넘기고 있었다.
 * (웹 Blob에는 있어서 웹에서만 통했다 — 그래서 못 잡았다.)
 * expo-file-system의 File.arrayBuffer()가 바이트를 직접 준다.
 */
const readBytes = async (uri) => {
  try {
    return await new File(uri).arrayBuffer();
  } catch {
    // 웹 등 File을 못 쓰는 환경. 여기서는 Blob에 arrayBuffer()가 있다.
    const response = await fetch(uri);
    const blob = await response.blob();
    if (typeof blob.arrayBuffer !== 'function') {
      throw new Error('이미지를 읽지 못했습니다. 다시 선택해주세요.');
    }
    return blob.arrayBuffer();
  }
};

/** 업로드 경로 — 스토리지 정책이 요구하는 {uid}/ 접두사를 붙인다 */
const buildPath = async (uri) => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) { throw new Error('로그인이 필요합니다.'); }
  return `${data.user.id}/${randomName(uri)}`;
};

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
    const body = await readBytes(uri);

    // 0바이트가 올라가면 스토리지는 성공으로 답하고 깨진 이미지만 남는다.
    // 여기서 끊어야 원인이 드러난다.
    if (!body?.byteLength) { throw new Error('이미지를 읽지 못했습니다. 다시 선택해주세요.'); }

    const path = await buildPath(uri);
    const contentType = resolveContentType(uri);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, body, { contentType, upsert: false });
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
