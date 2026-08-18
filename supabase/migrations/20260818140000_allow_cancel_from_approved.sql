-- 사용자 취소 허용 상태에 'approved' 추가
--
-- 발견 경위: 앱은 approved 상담에 "상담 취소" 버튼을 노출하는데 DB 가드가 거부해
-- 사용자가 원인 불명 실패를 겪었다. 실제로 재현해 확인했다:
--   pending→cancelled OK / approved→cancelled REJECTED / confirmed→cancelled OK / on-hold→cancelled OK
--
-- 'confirmed'와 'on-hold'는 있는데 'approved'만 빠져 있었다. 앱이 문서화한 생명주기
-- (VALID_STATUS_TRANSITIONS)에도 APPROVED → CANCELLED가 유효한 전이로 적혀 있다.
-- 즉 가드 쪽 누락으로 판단해 DB를 앱 정의에 맞춘다 — 예약을 잡아둔 사용자가
-- 취소하지 못할 이유가 없다.
--
-- 주의: create or replace이므로 관리자 전용 컬럼 목록을 원본과 **정확히** 유지해야 한다.
-- 목록을 다시 적다가 컬럼을 빠뜨리면 그 컬럼이 조용히 사용자에게 열리고,
-- 없는 컬럼을 적으면 모든 사용자 update가 실패한다(실제로 한 번 겪었다).

create or replace function app_private.guard_consultation_user_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if app_private.is_admin() or (select auth.uid()) is null then
    return new;
  end if;

  -- 비관리자는 관리자 전용 컬럼 변경 불가 (원본 20260718224647과 동일 목록)
  if new.admin_memo    is distinct from old.admin_memo
  or new.admin_notes   is distinct from old.admin_notes
  or new.deal_amount   is distinct from old.deal_amount
  or new.completed_by  is distinct from old.completed_by
  or new.completed_at  is distinct from old.completed_at
  or new.is_ownership_transferred is distinct from old.is_ownership_transferred
  or new.transfer_id   is distinct from old.transfer_id
  or new.user_id       is distinct from old.user_id
  or new.vehicle_id    is distinct from old.vehicle_id
  or new.type          is distinct from old.type then
    raise exception '권한이 없는 상담 필드 변경입니다';
  end if;

  -- 허용 1: 취소 (approved 추가 — 승인된 예약도 사용자가 취소할 수 있어야 한다)
  if new.consultation_status = 'cancelled'
     and old.consultation_status in ('pending', 'approved', 'confirmed', 'on-hold') then
    return new;
  end if;

  -- 허용 2: 거절된 상담 재신청 (새 일정으로)
  if old.consultation_status = 'rejected'
     and new.consultation_status = 'pending' then
    return new;
  end if;

  -- 상태 미변경(일정만 수정 등)은 pending에서만 허용
  if new.consultation_status = old.consultation_status
     and old.consultation_status = 'pending' then
    return new;
  end if;

  raise exception '허용되지 않은 상담 상태 변경입니다 (% → %)',
    old.consultation_status, new.consultation_status;
end;
$$;
