// __tests__/constants/consultation.test.js
//
// 상담 상태 규칙은 앱과 DB 양쪽에 존재한다. 둘이 어긋나면 사용자가 원인 불명 실패를 겪는다.
// 실제로 그런 일이 있었다: 화면이 approved 상담에 "상담 취소" 버튼을 노출했지만
// DB 가드가 거부했고, confirmed/on-hold는 DB가 허용하는데 버튼이 없었다.
// 여기서 앱 쪽 정의를 고정한다. DB 쪽은 20260818140000 마이그레이션이 짝을 이룬다.

import {
  CONSULTATION_STATUS,
  CONSULTATION_STATUS_LABELS,
  USER_CANCELLABLE_STATUSES,
  canUserCancel,
  isValidStatusTransition,
  VALID_STATUS_TRANSITIONS,
  shouldShowAlternativeSlots,
  canAcceptAlternativeSlot,
  getAlternativeSlots,
} from '../../src/constants/consultation';

describe('USER_CANCELLABLE_STATUSES — DB 가드와 짝을 이루는 목록', () => {
  it('DB가 허용하는 네 상태와 정확히 일치한다', () => {
    // app_private.guard_consultation_user_update의 허용 목록과 동일해야 한다.
    // 실측(롤백 트랜잭션): pending OK / approved OK(수정 후) / confirmed OK / on-hold OK
    expect([...USER_CANCELLABLE_STATUSES].sort()).toEqual(
      ['approved', 'confirmed', 'on-hold', 'pending'],
    );
  });

  it('종료 상태에서는 취소할 수 없다', () => {
    expect(canUserCancel(CONSULTATION_STATUS.COMPLETED)).toBe(false);
    expect(canUserCancel(CONSULTATION_STATUS.CANCELLED)).toBe(false);
    expect(canUserCancel(CONSULTATION_STATUS.ARCHIVED)).toBe(false);
  });

  it('거절된 상담은 취소가 아니라 재신청 대상이다', () => {
    expect(canUserCancel(CONSULTATION_STATUS.REJECTED)).toBe(false);
    expect(isValidStatusTransition(CONSULTATION_STATUS.REJECTED, CONSULTATION_STATUS.PENDING)).toBe(true);
  });

  it("존재하지 않는 상태('meeting' 등)는 취소 불가", () => {
    // 화면 조건에 실제로 섞여 있던 값이다 — 어떤 정의에도 없다
    expect(canUserCancel('meeting')).toBe(false);
    expect(Object.values(CONSULTATION_STATUS)).not.toContain('meeting');
  });

  it('알 수 없는 값은 fail-closed', () => {
    expect(canUserCancel(undefined)).toBe(false);
    expect(canUserCancel(null)).toBe(false);
    expect(canUserCancel('')).toBe(false);
  });
});

describe('상태 정의 일관성', () => {
  it('모든 상태에 한글 라벨이 있다', () => {
    for (const status of Object.values(CONSULTATION_STATUS)) {
      expect(CONSULTATION_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it('전이 맵의 모든 키와 값이 실제 상태값이다', () => {
    const valid = Object.values(CONSULTATION_STATUS);
    for (const [from, tos] of Object.entries(VALID_STATUS_TRANSITIONS)) {
      expect(valid).toContain(from);
      for (const to of tos) {
        expect(valid).toContain(to);
      }
    }
  });

  it('모든 상태가 전이 맵에 등장한다 (빠진 상태 없음)', () => {
    for (const status of Object.values(CONSULTATION_STATUS)) {
      expect(VALID_STATUS_TRANSITIONS).toHaveProperty(status);
    }
  });

  it('취소 가능 상태는 전이 맵에서도 cancelled로 갈 수 있어야 한다', () => {
    for (const status of USER_CANCELLABLE_STATUSES) {
      expect(isValidStatusTransition(status, CONSULTATION_STATUS.CANCELLED)).toBe(true);
    }
  });

  it('종료 상태(cancelled/archived)에서 나가는 전이는 없다', () => {
    expect(VALID_STATUS_TRANSITIONS[CONSULTATION_STATUS.CANCELLED]).toEqual([]);
    expect(VALID_STATUS_TRANSITIONS[CONSULTATION_STATUS.ARCHIVED]).toEqual([]);
  });
});

// ── 대체 일정(alternative_slots) 규칙 ────────────────────────────────
//
// 이 기능은 통째로 죽어 있었다: 관리자가 제안하면 상태가 'on-hold'가 되는데
// 읽는 쪽 세 군데가 모두 'rejected'만 검사해 제안이 사용자에게 **한 번도**
// 표시되지 않았다. 아래 테스트가 그 회귀를 막는다.
describe('대체 일정 표시·수락 규칙', () => {
  const slot = { date: '2026-10-01', time: '14:30' };
  const make = (status, slots) => ({ consultationStatus: status, alternativeSlots: slots });

  it('on-hold + 슬롯이 있으면 표시한다 (예전에 빠졌던 바로 그 경우)', () => {
    expect(shouldShowAlternativeSlots(make(CONSULTATION_STATUS.ON_HOLD, [slot]))).toBe(true);
  });

  it('rejected + 슬롯이 있으면 표시한다', () => {
    expect(shouldShowAlternativeSlots(make(CONSULTATION_STATUS.REJECTED, [slot]))).toBe(true);
  });

  it('슬롯이 없으면 표시하지 않는다', () => {
    expect(shouldShowAlternativeSlots(make(CONSULTATION_STATUS.ON_HOLD, []))).toBe(false);
    expect(shouldShowAlternativeSlots(make(CONSULTATION_STATUS.ON_HOLD, null))).toBe(false);
  });

  it('종료된 상담에는 표시하지 않는다', () => {
    for (const status of [
      CONSULTATION_STATUS.COMPLETED,
      CONSULTATION_STATUS.CANCELLED,
      CONSULTATION_STATUS.ARCHIVED,
    ]) {
      expect(shouldShowAlternativeSlots(make(status, [slot]))).toBe(false);
    }
  });

  it('수락은 on-hold에서만 가능하다 — 수락 RPC가 허용하는 상태와 정확히 같아야 한다', () => {
    expect(canAcceptAlternativeSlot(make(CONSULTATION_STATUS.ON_HOLD, [slot]))).toBe(true);
    // rejected는 표시는 되지만 수락은 서버가 거부한다 → 버튼을 내보내면 안 된다
    expect(canAcceptAlternativeSlot(make(CONSULTATION_STATUS.REJECTED, [slot]))).toBe(false);
  });

  it('수락 가능한 상담은 항상 표시 대상이기도 하다 (버튼만 있고 목록이 안 보이는 일 없게)', () => {
    const c = make(CONSULTATION_STATUS.ON_HOLD, [slot]);
    expect(canAcceptAlternativeSlot(c)).toBe(true);
    expect(shouldShowAlternativeSlots(c)).toBe(true);
  });

  it('형식이 깨진 슬롯은 걸러낸다 (Date가 ISO 문자열로 저장됐던 레거시)', () => {
    const c = make(CONSULTATION_STATUS.ON_HOLD, ['2026-10-01T05:30:00.000Z', slot, { date: 'x' }]);
    expect(getAlternativeSlots(c)).toEqual([slot]);
  });

  it('슬롯이 전부 깨진 값이면 표시하지 않는다', () => {
    expect(shouldShowAlternativeSlots(make(CONSULTATION_STATUS.ON_HOLD, ['2026-10-01T05:30:00.000Z']))).toBe(false);
  });

  it('null/undefined 상담에도 터지지 않는다', () => {
    expect(shouldShowAlternativeSlots(null)).toBe(false);
    expect(canAcceptAlternativeSlot(undefined)).toBe(false);
    expect(getAlternativeSlots(null)).toEqual([]);
  });
});
