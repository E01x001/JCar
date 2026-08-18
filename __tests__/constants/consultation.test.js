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
