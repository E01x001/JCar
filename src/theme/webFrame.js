/**
 * 웹 폰 프레임 폭 — 한 곳에서만 정의한다.
 *
 * 웹(데스크톱)에서는 App.js의 AppFrame이 앱 전체를 가운데 480px 컬럼으로 모은다.
 * 그런데 RN Web의 Modal은 document.body로 포털되어 **이 프레임 밖에서** 그려지므로,
 * 모달·오버레이가 같은 폭을 쓰지 않으면 앱은 480인데 모달만 창 전체 폭으로 떠서
 * 어긋난다(실제로 그렇게 보였다). 그래서 프레임과 모달이 같은 상수를 공유한다.
 *
 * 네이티브에는 프레임이 없으므로 webFrameColumn은 빈 객체다 — 무영향.
 */
import { Platform } from 'react-native';

/** 폰 폭 컬럼의 최대 너비(px). AppFrame과 모달이 함께 쓴다. */
export const WEB_FRAME_MAX_WIDTH = 480;

/**
 * 웹에서만 프레임 폭으로 가운데 정렬하는 스타일 조각.
 * 화면이 480보다 좁으면(모바일 웹) maxWidth가 걸리지 않아 그대로 꽉 찬다.
 */
export const webFrameColumn = Platform.select({
  web: { maxWidth: WEB_FRAME_MAX_WIDTH, alignSelf: 'center' },
  default: {},
});
