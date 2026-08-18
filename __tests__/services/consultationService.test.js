// __tests__/services/consultationService.test.js
//
// 이 테스트들은 원래 firebaseService.test.js에 있었다. 대상 코드는 Supabase로
// 이전되면서 갱신됐지만 import만 죽은 재수출 배럴(src/services/firebaseService.js)을
// 경유하고 있었다. 배럴을 제거하면서 실제 모듈을 직접 가리키도록 옮겼다.

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'android', Version: 33 },
  PermissionsAndroid: {
    PERMISSIONS: { POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS' },
    RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
    request: jest.fn(),
  },
}));

import { saveConsultationRequest } from '../../src/services/consultation/consultationService';

describe('consultationService', () => {
  describe('saveConsultationRequest', () => {
    // Phase 2c: Supabase insert + (구매 상담 시) mark_vehicle_acquiring RPC
    const { supabase } = require('../../__mocks__/supabaseClientMock');

    // resetMocks/restoreMocks 설정이 목 구현을 초기화하므로 매 테스트 재설정
    beforeEach(() => {
      supabase.from.mockImplementation(() => ({
        insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      }));
      supabase.rpc.mockImplementation(() => Promise.resolve({ data: null, error: null }));
    });

    it('should successfully save consultation request', async () => {
      const consultationData = {
        userId: 'user-123',
        userName: 'Test User',
        userPhone: '01012345678',
        vehicleId: 'vehicle-123',
        vehicleName: 'Test Car',
        preferredDate: '2025-12-01',
        preferredTime: '14:00',
        status: 'pending',
        type: 'buy',
      };

      const result = await saveConsultationRequest(consultationData);

      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('consultation_requests');
      // 구매 상담이므로 차량 acquiring 전환 RPC 호출
      expect(supabase.rpc).toHaveBeenCalledWith('mark_vehicle_acquiring', {
        p_vehicle_id: 'vehicle-123',
      });
    });

    it('should handle missing fields with defaults', async () => {
      const result = await saveConsultationRequest({});

      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('consultation_requests');
      // vehicleId 없으면 RPC 미호출
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('레이트리밋 거부를 rateLimited로 구분해 돌려준다', async () => {
      // DB 트리거(app_private.consultation_rate_limit)가 올리는 예외
      supabase.from.mockImplementation(() => ({
        insert: jest.fn(() =>
          Promise.resolve({ data: null, error: { message: 'rate_limit_hour' } }),
        ),
      }));

      const result = await saveConsultationRequest({ userId: 'u', vehicleId: 'v' });

      expect(result.success).toBe(false);
      expect(result.rateLimited).toBe(true);
      expect(result.slotConflict).toBe(false);
    });

    it('슬롯 충돌은 slotConflict로 구분한다', async () => {
      supabase.from.mockImplementation(() => ({
        insert: jest.fn(() =>
          Promise.resolve({
            data: null,
            error: { code: '23505', message: 'duplicate key value violates unique constraint "consultation_active_slot_uniq"' },
          }),
        ),
      }));

      const result = await saveConsultationRequest({ userId: 'u', vehicleId: 'v' });

      expect(result.success).toBe(false);
      expect(result.slotConflict).toBe(true);
      expect(result.rateLimited).toBe(false);
    });
  });
});
