/**
 * 앱 설치 출처 기록 (기록 전용 — 아무것도 차단하지 않는다).
 *
 * 배경: 2026-08-20에 자동 가입 9건이 들어왔는데 유입 경로를 특정하지 못했다.
 * 옵트인 링크는 테스터 목록으로 이미 제한되므로, 남은 유력 경로는 설치된 APK를
 * 추출해 다른 기기에 sideload 하는 것이다. 이를 확인할 신호를 남긴다.
 *
 * 신호: Google Play install referrer
 *   Play 설치 → referrer 문자열 존재 (예: 'utm_source=google-play&...')
 *   sideload  → 빈 문자열 또는 조회 실패
 *
 * **위변조 방지 수단이 아니다.** 앱을 수정하면 거짓 값을 보낼 수 있다.
 * 지금 목적은 차단이 아니라 가설 확인이므로 충분하다. 차단이 필요해지면
 * Play Integrity API로 올려야 한다.
 *
 * 실패는 전부 삼킨다 — 텔레메트리 때문에 로그인이 막히면 본말전도다.
 */
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

/** Play referrer 판정 — 값이 있으면 Play 경유로 본다 */
const looksLikePlayInstall = (referrer) =>
  typeof referrer === 'string' && referrer.trim().length > 0;

/**
 * 설치 신호를 1회 기록한다(사용자·앱버전당 유니크).
 *
 * 이미 기록된 조합이면 UNIQUE 위반이 나는데, 그건 정상 경로이므로 조용히 넘어간다.
 *
 * @param {string} userId
 */
export const recordInstallSignal = async (userId) => {
  if (!userId || Platform.OS !== 'android') { return; }

  try {
    let referrer = null;
    try {
      referrer = await Application.getInstallReferrerAsync();
    } catch (e) {
      // sideload·구버전 Play 스토어 등에서 조회 자체가 실패할 수 있다.
      // 실패도 신호다 — null로 남긴다.
      logger.debug('install referrer 조회 실패:', e?.message);
    }

    let installedAt = null;
    try {
      installedAt = (await Application.getInstallationTimeAsync())?.toISOString?.() ?? null;
    } catch { /* 선택 정보 */ }

    const row = {
      user_id: userId,
      install_referrer: referrer,
      from_play: looksLikePlayInstall(referrer),
      installed_at: installedAt,
      app_version: Application.nativeApplicationVersion ?? null,
      device_brand: Device.brand ?? null,
      device_model: Device.modelName ?? null,
      is_physical_device: Device.isDevice ?? null,
    };

    const { error } = await supabase.from('app_install_signals').insert(row);

    // 23505 = 이미 기록됨. 사용자·버전당 1행이면 충분하므로 정상이다.
    if (error && error.code !== '23505') { throw error; }
  } catch (error) {
    logger.debug('설치 신호 기록 실패(무시):', error?.message);
  }
};

export default { recordInstallSignal };
