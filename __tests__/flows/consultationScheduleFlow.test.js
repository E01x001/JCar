// __tests__/flows/consultationScheduleFlow.test.js
//
// 흐름(계약) 테스트 — 이 디렉터리의 첫 번째 파일이자 앞으로의 본보기다.
//
// 왜 만들었나. "일정 제안 → 사용자 수락" 기능이 **서로 독립된 네 가지 이유로
// 동시에 죽은 채** 배포돼 있었고 아무도 몰랐다.
//   1) 쓰는 쪽은 상태를 'on-hold'로 바꾸는데 읽는 쪽 세 군데가 'rejected'만 검사
//   2) 쓰는 쪽이 Date 객체를 그대로 넘겨 UTC ISO 문자열로 저장 — 읽는 쪽은
//      {date,time}을 기대해 화면에 빈 값이 나왔다(한국 시간이 밀릴 위험도 있었다)
//   3) 수락용 서비스/RPC가 아예 없었다
//   4) DB 가드가 'on-hold'에서 사용자 쓰기를 막고 있었다
//
// 넷 중 어느 것도 기존 테스트로는 잡히지 않는다. 컴포넌트가 "정의되어 있는지",
// PropTypes가 맞는지를 보는 테스트는 **레이어 사이의 계약**을 보지 않기 때문이다.
//
// 그래서 이 테스트는 한 레이어를 격리해 보지 않는다. 네트워크 경계(supabase)만
// 막고 **실제 코드**를 흐름대로 통과시킨 뒤, 한 단계의 출력이 다음 단계의 입력으로
// 실제로 맞는지 확인한다. 새 기능을 붙일 때 이 패턴을 따를 것.

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'android', Version: 33 },
  PermissionsAndroid: {
    PERMISSIONS: { POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS' },
    RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
    request: jest.fn(),
  },
}));

import {
  updateSuggestedSlots,
  acceptAlternativeSlot,
} from '../../src/services/consultation/consultationService';
import {
  CONSULTATION_STATUS,
  shouldShowAlternativeSlots,
  canAcceptAlternativeSlot,
  getAlternativeSlots,
} from '../../src/constants/consultation';

const { supabase } = require('../../__mocks__/supabaseClientMock');

const CONSULTATION_ID = 'consult-1';

/** update()에 실제로 실린 payload를 잡아내는 스텁 */
const captureUpdate = () => {
  const captured = {};
  supabase.from.mockImplementation(() => ({
    update: jest.fn((payload) => {
      captured.payload = payload;
      return { eq: jest.fn(() => Promise.resolve({ data: null, error: null })) };
    }),
  }));
  return captured;
};

describe('상담 일정 제안 → 수락 흐름', () => {
  // 관리자가 모달에서 고르는 값은 Date 객체다(SuggestAlternativeTimesModal)
  const pickedByAdmin = [
    new Date(2026, 9, 1, 14, 30),  // 2026-10-01 14:30 (로컬)
    new Date(2026, 9, 2, 10, 0),   // 2026-10-02 10:00 (로컬)
  ];

  describe('1단계 — 관리자가 제안을 저장한다', () => {
    it('Date를 {date,time} 벽시계 값으로 정규화해 저장한다 (ISO 문자열로 저장하지 않는다)', async () => {
      const captured = captureUpdate();

      await updateSuggestedSlots(CONSULTATION_ID, pickedByAdmin);

      const slots = captured.payload.alternative_slots;
      expect(Array.isArray(slots)).toBe(true);

      // 객체여야 한다. 문자열이면 Date가 그대로 직렬화된 것(=예전 버그)이고,
      // 읽는 쪽이 전부 빈 값을 그린다. 시간대와 무관하게 이 단언이 잡아준다.
      slots.forEach((s) => {
        expect(typeof s).toBe('object');
        expect(Object.keys(s).sort()).toEqual(['date', 'time']);
      });

      expect(slots).toEqual([
        { date: '2026-10-01', time: '14:30' },
        { date: '2026-10-02', time: '10:00' },
      ]);
    });

    it('상태를 on-hold로 바꾼다 — 부수효과가 아니라 "사용자 응답 대기"라는 의미다', async () => {
      const captured = captureUpdate();

      await updateSuggestedSlots(CONSULTATION_ID, pickedByAdmin);

      expect(captured.payload.consultation_status).toBe(CONSULTATION_STATUS.ON_HOLD);
    });

    it('빈 목록은 저장하지 않는다 (상태만 on-hold로 바뀌어 수락할 것이 없어지는 상황 방지)', async () => {
      captureUpdate();
      await expect(updateSuggestedSlots(CONSULTATION_ID, [])).rejects.toThrow();
    });
  });

  describe('2단계 — 저장된 그대로를 사용자 화면이 읽는다 (여기가 끊겨 있었다)', () => {
    /** 1단계가 실제로 저장한 값을 그대로 2단계 입력으로 쓴다 */
    const storedThenRead = async () => {
      const captured = captureUpdate();
      await updateSuggestedSlots(CONSULTATION_ID, pickedByAdmin);
      return {
        id: CONSULTATION_ID,
        consultationStatus: captured.payload.consultation_status,
        alternativeSlots: captured.payload.alternative_slots,
      };
    };

    it('관리자가 저장한 상담은 사용자에게 표시된다', async () => {
      const consultation = await storedThenRead();
      // 예전에는 여기가 false였다 — 저장은 on-hold인데 화면은 rejected만 봤다
      expect(shouldShowAlternativeSlots(consultation)).toBe(true);
    });

    it('저장된 슬롯이 읽는 쪽에서 하나도 버려지지 않는다', async () => {
      const consultation = await storedThenRead();
      expect(getAlternativeSlots(consultation)).toHaveLength(pickedByAdmin.length);
    });

    it('사용자가 수락할 수 있는 상태로 읽힌다', async () => {
      const consultation = await storedThenRead();
      expect(canAcceptAlternativeSlot(consultation)).toBe(true);
    });
  });

  describe('3단계 — 사용자가 수락한다', () => {
    it('RPC를 인덱스로만 호출한다 — 날짜·시간을 클라이언트가 보내지 않는다', async () => {
      supabase.rpc.mockImplementation(() => Promise.resolve({
        data: { preferredDate: '2026-10-02', preferredTime: '10:00', consultationStatus: 'confirmed' },
        error: null,
      }));

      await acceptAlternativeSlot(CONSULTATION_ID, 1);

      expect(supabase.rpc).toHaveBeenCalledWith('accept_alternative_slot', {
        p_consultation_id: CONSULTATION_ID,
        p_slot_index: 1,
      });

      // 보안 핵심: 제안되지 않은 시간을 밀어넣을 수 없어야 한다.
      // 인자에 날짜/시간이 섞이는 순간 그 성질이 깨진다.
      const args = supabase.rpc.mock.calls[0][1];
      expect(Object.keys(args).sort()).toEqual(['p_consultation_id', 'p_slot_index']);
    });

    it('테이블 직접 UPDATE로 수락하지 않는다 (가드가 막는 경로를 쓰지 않는다)', async () => {
      supabase.rpc.mockImplementation(() => Promise.resolve({ data: {}, error: null }));

      await acceptAlternativeSlot(CONSULTATION_ID, 0);

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('서버 오류는 삼키지 않고 올린다 (이중예약 등은 사용자에게 사유를 보여야 한다)', async () => {
      supabase.rpc.mockImplementation(() => Promise.resolve({
        data: null,
        error: { message: '그 시간에 이미 다른 상담이 있습니다. 다른 시간을 선택해 주세요.' },
      }));

      await expect(acceptAlternativeSlot(CONSULTATION_ID, 0)).rejects.toMatchObject({
        message: expect.stringContaining('이미 다른 상담'),
      });
    });
  });

  describe('앱과 서버의 계약 일치', () => {
    // 마이그레이션 20260923090000의 accept_alternative_slot은 'on-hold'에서만
    // 동작한다. 앱이 그보다 넓게 버튼을 노출하면 눌러도 서버가 거부한다.
    it('수락 버튼은 on-hold에서만 노출된다 — RPC가 허용하는 상태와 정확히 같다', () => {
      const withSlots = (status) => ({
        consultationStatus: status,
        alternativeSlots: [{ date: '2026-10-01', time: '14:30' }],
      });

      for (const status of Object.values(CONSULTATION_STATUS)) {
        expect(canAcceptAlternativeSlot(withSlots(status)))
          .toBe(status === CONSULTATION_STATUS.ON_HOLD);
      }
    });
  });

  describe('레거시 데이터 방어', () => {
    it('예전에 ISO 문자열로 저장된 슬롯은 걸러내고 화면을 깨뜨리지 않는다', () => {
      const legacy = {
        consultationStatus: CONSULTATION_STATUS.ON_HOLD,
        alternativeSlots: ['2026-10-01T05:30:00.000Z'],
      };
      expect(getAlternativeSlots(legacy)).toEqual([]);
      expect(shouldShowAlternativeSlots(legacy)).toBe(false);
      expect(canAcceptAlternativeSlot(legacy)).toBe(false);
    });
  });
});
