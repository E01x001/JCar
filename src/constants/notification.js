/**
 * 알림 종류별 표시 규칙.
 *
 * DB의 notifications.type에는 **일부러 CHECK 제약이 없다** — 알림 INSERT는 상태변경과
 * 같은 트랜잭션에서 일어나므로, 제약 위반이 나면 상담 승인 자체가 롤백되기 때문이다
 * (20260814164533_notifications.sql 주석 참고).
 *
 * 그래서 화면은 **모르는 타입이 올 수 있다고 가정하고** 동작해야 한다.
 * iconFor/toneFor는 알 수 없는 값에 대해 항상 기본값을 돌려준다.
 *
 * @module constants/notification
 */

export const NOTIFICATION_TYPE = {
  CONSULTATION_APPROVED: 'consultation_approved',
  CONSULTATION_REJECTED: 'consultation_rejected',
  CONSULTATION_COMPLETED: 'consultation_completed',
  ALTERNATIVE_SLOTS_SUGGESTED: 'alternative_slots_suggested',
  VEHICLE_APPROVED: 'vehicle_approved',
  VEHICLE_REJECTED: 'vehicle_rejected',
};

/** MaterialIcons 이름 */
const ICONS = {
  [NOTIFICATION_TYPE.CONSULTATION_APPROVED]: 'event-available',
  [NOTIFICATION_TYPE.CONSULTATION_REJECTED]: 'event-busy',
  [NOTIFICATION_TYPE.CONSULTATION_COMPLETED]: 'task-alt',
  [NOTIFICATION_TYPE.ALTERNATIVE_SLOTS_SUGGESTED]: 'schedule',
  [NOTIFICATION_TYPE.VEHICLE_APPROVED]: 'directions-car',
  [NOTIFICATION_TYPE.VEHICLE_REJECTED]: 'no-crash',
};

/** 색 톤 — theme.colors의 어떤 갈래를 쓸지 */
const TONES = {
  [NOTIFICATION_TYPE.CONSULTATION_APPROVED]: 'success',
  [NOTIFICATION_TYPE.CONSULTATION_REJECTED]: 'error',
  [NOTIFICATION_TYPE.CONSULTATION_COMPLETED]: 'info',
  [NOTIFICATION_TYPE.ALTERNATIVE_SLOTS_SUGGESTED]: 'warning',
  [NOTIFICATION_TYPE.VEHICLE_APPROVED]: 'success',
  [NOTIFICATION_TYPE.VEHICLE_REJECTED]: 'error',
};

export const DEFAULT_ICON = 'notifications';
export const DEFAULT_TONE = 'info';

/** 알림 종류 → 아이콘 (모르는 종류는 기본 종 아이콘) */
export const iconFor = (type) => ICONS[type] ?? DEFAULT_ICON;

/** 알림 종류 → 색 톤 (모르는 종류는 info) */
export const toneFor = (type) => TONES[type] ?? DEFAULT_TONE;

/**
 * 알림을 탭했을 때 이동할 경로.
 *
 * 트리거가 data에 screen과 대상 id를 실어 보낸다(푸시 딥링크와 동일한 규약).
 * 화면 이름을 여기서 다시 추측하지 않고 페이로드를 그대로 신뢰한다 —
 * 규약이 바뀌면 트리거 한 곳만 고치면 되게 하기 위해서다.
 *
 * @returns {{ screen: string, params: Object }|null} 이동할 수 없으면 null
 */
export const routeFor = (notification) => {
  const data = notification?.data;
  if (!data || typeof data !== 'object' || !data.screen) { return null; }

  const params = {};
  if (data.consultationId) { params.consultationId = data.consultationId; }
  if (data.vehicleId) { params.vehicleId = data.vehicleId; }

  return { screen: data.screen, params };
};
