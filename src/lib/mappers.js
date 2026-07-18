/**
 * DB(snake_case) ↔ 앱(camelCase) 경계 매핑 (Phase 2b)
 *
 * 원칙: 화면/스토어는 기존 Firestore 시절 필드명(camelCase)을 그대로 쓴다.
 * 변환은 서비스 레이어의 이 매퍼 한 곳에서만 일어난다.
 * 스키마 정본: supabase/migrations/20260708161043_initial_schema.sql
 */

const snakeToCamelKey = (k) => k.replace(/_([a-z0-9])/g, (m, c) => c.toUpperCase());
const camelToSnakeKey = (k) => k.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`);

/** timestamptz(ISO 문자열) → epoch ms 숫자 (기존 createdSeconds 헬퍼가 숫자를 처리함) */
const toEpochMs = (v) => {
  if (v == null) { return v; }
  const t = Date.parse(v);
  return Number.isNaN(t) ? v : t;
};

const TIMESTAMP_KEYS = new Set([
  'createdAt', 'updatedAt', 'completedAt', 'cancelledAt', 'rejectedAt',
  'resubmittedAt', 'memoUpdatedAt', 'transferredAt', 'acquiredAt', 'soldAt',
  'statusUpdatedAt', 'deletedAt', 'permanentDeleteDate',
]);

/** 단일 행: snake_case → camelCase (+타임스탬프를 epoch ms로) */
export const rowToApp = (row) => {
  if (!row || typeof row !== 'object') { return row; }
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const ck = snakeToCamelKey(k);
    out[ck] = TIMESTAMP_KEYS.has(ck) ? toEpochMs(v) : v;
  }
  return out;
};

/** 앱 객체 → DB 컬럼 (undefined 필드는 제외) */
export const appToRow = (obj) => {
  if (!obj || typeof obj !== 'object') { return obj; }
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) { continue; }
    out[camelToSnakeKey(k)] = v;
  }
  return out;
};

/**
 * 차량 행 → 앱 차량 객체.
 * 기존 화면 호환 별칭:
 *  - vehicleId: 화면들이 차량 식별에 쓰는 값. Firestore 시절엔 차량번호가 문서 필드
 *    vehicleId였음 → DB의 vehicle_no를 vehicleId로 노출하고, PK(uuid)는 id로 유지.
 *  - imageUrl: 레거시 단일 이미지 접근(imageUrls[0]).
 */
export const vehicleRowToApp = (row) => {
  if (!row) { return row; }
  const v = rowToApp(row);
  return {
    ...v,
    vehicleId: v.vehicleNo,
    imageUrl: Array.isArray(v.imageUrls) ? (v.imageUrls[0] ?? null) : v.imageUrls ?? null,
  };
};

export const consultationRowToApp = (row) => {
  if (!row) { return row; }
  const c = rowToApp(row);
  return {
    ...c,
    // 기존 화면은 preferredTime을 'HH:MM' 문자열로 기대 — time 타입은 'HH:MM:SS'로 옴
    preferredTime: typeof c.preferredTime === 'string' ? c.preferredTime.slice(0, 5) : c.preferredTime,
  };
};
