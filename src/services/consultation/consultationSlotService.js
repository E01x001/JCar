/**
 * Consultation Slot Service
 *
 * 이중예약(동일 차량·날짜·시간에 서로 다른 사용자의 상담) 방지.
 *
 * 원리: consultation_slots/{vehicleId_date_time} 슬롯 문서를 상담 생성과
 * 같은 배치(batch)로 create 한다. Firestore 규칙이 슬롯 문서의 update를
 * 금지하므로, 이미 존재하는 슬롯에 대한 set은 permission-denied로 배치 전체가
 * 실패한다 → 동시 제출 경쟁에서도 한 명만 성공(원자적 선점).
 *
 * 참고: consultation_requests는 본인 문서만 읽을 수 있어(rules) 타인 상담을
 * 조회하는 클라이언트 충돌검사가 불가능하다. 슬롯 문서는 PII 없이
 * (vehicleId/날짜/시간/점유자 uid)만 담아 인증 사용자 전체 읽기를 허용한다.
 */

import {
  getFirestore,
  doc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { logger } from '../../utils/logger';

/**
 * 슬롯 문서 ID 생성. 시간의 ':'는 문서 ID에 안전하도록 '-'로 치환.
 * @example slotIdFor('12가3456', '2026-07-10', '14:30') → '12가3456_2026-07-10_14-30'
 */
export const slotIdFor = (vehicleId, preferredDate, preferredTime) =>
  `${vehicleId}_${preferredDate}_${String(preferredTime).replace(/:/g, '-')}`;

/**
 * 슬롯 문서 참조.
 */
export const slotRefFor = (db, vehicleId, preferredDate, preferredTime) =>
  doc(db, 'consultation_slots', slotIdFor(vehicleId, preferredDate, preferredTime));

/**
 * 해당 차량·날짜·시간 슬롯이 이미 점유됐는지 사전 확인(UX용 빠른 피드백).
 * 최종 방어는 배치 create가 담당하므로 여기 결과는 레이스에 안전하지 않아도 된다.
 * @returns {Promise<boolean>} 점유 중이면 true
 */
export const isSlotTaken = async (vehicleId, preferredDate, preferredTime) => {
  try {
    const db = getFirestore();
    const snapshot = await getDoc(slotRefFor(db, vehicleId, preferredDate, preferredTime));
    return snapshot.exists();
  } catch (error) {
    // 조회 실패 시 제출을 막지 않는다(최종 방어는 배치 create).
    logger.error('슬롯 조회 오류:', error);
    return false;
  }
};

/**
 * 배치에 "슬롯 선점(create)" 쓰기를 추가한다.
 * 이미 존재하는 슬롯이면 규칙(update 금지)에 의해 커밋이 permission-denied로 실패한다.
 */
export const addSlotClaimToBatch = (batch, db, { vehicleId, preferredDate, preferredTime, userId, consultationId }) => {
  const ref = slotRefFor(db, vehicleId, preferredDate, preferredTime);
  batch.set(ref, {
    vehicleId,
    preferredDate,
    preferredTime,
    userId,
    consultationId,
    createdAt: serverTimestamp(),
  });
  return ref;
};

/**
 * 슬롯 해제(취소/거절/일정변경 시). 슬롯이 없거나(과거 데이터) 소유자가 다르면 건너뛴다.
 * 실패해도 호출측 흐름을 막지 않는 best-effort.
 */
export const releaseSlot = async (vehicleId, preferredDate, preferredTime, { requesterId = null } = {}) => {
  try {
    if (!vehicleId || !preferredDate || !preferredTime) { return; }
    const db = getFirestore();
    const ref = slotRefFor(db, vehicleId, preferredDate, preferredTime);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) { return; } // 슬롯 도입 이전 상담 등
    // 소유자 지정 시 본인 슬롯만 해제(규칙상 어차피 타인 슬롯 삭제는 거부됨)
    if (requesterId && snapshot.data().userId !== requesterId) { return; }
    await deleteDoc(ref);
  } catch (error) {
    logger.error('슬롯 해제 오류:', error);
  }
};

/**
 * 배치 커밋의 permission-denied가 "슬롯 선점 실패(이미 예약됨)"인지 판별할 때 사용.
 */
export const isSlotConflictError = (error) =>
  error?.code === 'firestore/permission-denied' || error?.code === 'permission-denied';
