-- Realtime 구독 대상 테이블 등록 (차량 목록/상담 실시간 갱신용)
-- RLS가 그대로 적용되므로 구독자도 자신이 볼 수 있는 행의 변경만 수신한다.
alter publication supabase_realtime add table public.vehicles;
alter publication supabase_realtime add table public.consultation_requests;
