-- 대체 일정 수락 — 사용자가 관리자가 제안한 시간 중 하나를 고를 수 있게 한다.
--
-- 왜 필요했나: 관리자의 "일정 제안"은 alternative_slots를 쓰고 상태를 'on-hold'로
-- 바꾸는데, 사용자에게는 그것을 수락할 경로가 **아예 없었다**. 세 군데가 막혀 있었다.
--   1) 사용자 화면이 'rejected'일 때만 슬롯을 그렸다(쓰는 쪽은 'on-hold') → 표시조차 안 됨
--   2) 수락용 서비스/RPC가 없었다
--   3) 이 가드가 비관리자의 일정 변경을 'pending'에서만 허용해 'on-hold'에서 차단했다
--
-- 왜 가드를 그냥 풀지 않았나: 'on-hold'에서 사용자 UPDATE를 열어주면 **임의의**
-- preferred_date/time을 써넣을 수 있다. 그러면 "관리자가 제안한 시간 중에서만
-- 고른다"는 규칙이 무의미해진다. 그래서 테이블을 직접 열지 않고, 슬롯을
-- **인덱스로만** 받는 RPC를 통해서만 수락이 가능하게 한다.

-- ============================================================
-- 1. 레거시 데이터 정규화
-- ============================================================
-- 쓰는 쪽이 Date 객체를 그대로 넘겨 ISO 문자열("2026-09-25T05:30:00.000Z")로
-- 저장된 행이 있다. 읽는 쪽(사용자 화면·모달 재편집)은 모두 {date,time}을
-- 기대하므로 화면에 빈 줄로 보였다. 앱도 {date,time}으로 쓰도록 함께 고친다.
--
-- ISO 문자열은 UTC라 그대로 date/time을 뽑으면 한국 시간이 9시간 밀린다.
-- Asia/Seoul로 변환해 벽시계 값으로 남긴다. 형식이 다른 값은 건드리지 않는다
-- (파싱 실패로 마이그레이션이 깨지지 않게) — RPC가 명확한 메시지로 거부한다.
update public.consultation_requests c
set alternative_slots = (
  select jsonb_agg(
           case
             when jsonb_typeof(t.e) = 'string'
              and (t.e #>> '{}') ~ '^\d{4}-\d{2}-\d{2}T'
             then jsonb_build_object(
                    'date', to_char(((t.e #>> '{}')::timestamptz at time zone 'Asia/Seoul')::date, 'YYYY-MM-DD'),
                    'time', to_char(((t.e #>> '{}')::timestamptz at time zone 'Asia/Seoul')::time, 'HH24:MI')
                  )
             else t.e
           end
           order by t.ord
         )
  from jsonb_array_elements(c.alternative_slots) with ordinality as t(e, ord)
)
where c.alternative_slots is not null
  and jsonb_typeof(c.alternative_slots) = 'array'
  and jsonb_array_length(c.alternative_slots) > 0
  and exists (
    select 1
    from jsonb_array_elements(c.alternative_slots) as x(e)
    where jsonb_typeof(x.e) = 'string'
      and (x.e #>> '{}') ~ '^\d{4}-\d{2}-\d{2}T'
  );

-- ============================================================
-- 2. 가드에 "RPC가 수행하는 수락" 통로 추가
-- ============================================================
-- 트랜잭션 로컬 설정(app.slot_accept)이 켜져 있을 때만 통과시킨다.
-- 이 설정은 accept_alternative_slot() 안에서 set_config(..., is_local => true)로
-- 세우므로 그 트랜잭션에서만 유효하다. PostgREST는 pg_catalog의 set_config을
-- 노출하지 않고 요청마다 트랜잭션이 분리되므로, 클라이언트가 스스로 이 플래그를
-- 세운 뒤 테이블을 직접 UPDATE하는 경로는 만들 수 없다.
--
-- 주의: create or replace이므로 관리자 전용 컬럼 목록을 원본
-- (20260718224647 / 20260818140000)과 **정확히** 동일하게 유지한다.
-- 빠뜨리면 그 컬럼이 조용히 사용자에게 열리고, 없는 컬럼을 적으면 모든
-- 사용자 update가 실패한다.
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

  -- 허용 0: accept_alternative_slot() RPC가 검증을 마친 수락
  if coalesce(pg_catalog.current_setting('app.slot_accept', true), '') = '1' then
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

  -- 허용 1: 취소 (approved 포함 — 승인된 예약도 사용자가 취소할 수 있어야 한다)
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

-- ============================================================
-- 3. 수락 RPC
-- ============================================================
-- 슬롯을 **인덱스로만** 받는다. 날짜·시간을 클라이언트에서 받지 않으므로
-- "관리자가 제안한 시간 중 하나"라는 규칙을 우회할 수 없다.
--
-- SECURITY DEFINER는 RLS를 우회하므로 소유자 확인을 함수 안에서 직접 한다.
-- 반환값은 확정된 일정만 담는다 — 행 전체를 돌려주면 admin_memo·deal_amount 같은
-- 관리자 전용 컬럼이 사용자에게 새어나간다.
create or replace function public.accept_alternative_slot(
  p_consultation_id uuid,
  p_slot_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_row   public.consultation_requests;
  v_slot  jsonb;
  v_date  date;
  v_time  time;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다';
  end if;

  -- 동시 수락·동시 재제안을 막기 위해 행을 잠근다
  select * into v_row
  from public.consultation_requests
  where id = p_consultation_id
  for update;

  if not found then
    raise exception '상담을 찾을 수 없습니다';
  end if;

  -- 소유자만 수락할 수 있다 (SECURITY DEFINER라 RLS가 걸러주지 않는다)
  if v_row.user_id is distinct from v_uid then
    raise exception '권한이 없습니다';
  end if;

  if v_row.consultation_status <> 'on-hold' then
    raise exception '대체 일정을 수락할 수 있는 상태가 아닙니다';
  end if;

  if v_row.alternative_slots is null
     or jsonb_typeof(v_row.alternative_slots) <> 'array'
     or jsonb_array_length(v_row.alternative_slots) = 0 then
    raise exception '제안된 대체 일정이 없습니다';
  end if;

  if p_slot_index is null
     or p_slot_index < 0
     or p_slot_index >= jsonb_array_length(v_row.alternative_slots) then
    raise exception '선택한 일정이 제안 목록에 없습니다';
  end if;

  v_slot := v_row.alternative_slots -> p_slot_index;

  if jsonb_typeof(v_slot) <> 'object'
     or v_slot ->> 'date' is null
     or v_slot ->> 'time' is null then
    raise exception '제안된 일정 형식이 올바르지 않습니다. 관리자에게 다시 제안을 요청해 주세요.';
  end if;

  v_date := (v_slot ->> 'date')::date;
  v_time := (v_slot ->> 'time')::time;

  -- 가드 통과 플래그 — 이 트랜잭션에서만 유효하다
  perform pg_catalog.set_config('app.slot_accept', '1', true);

  update public.consultation_requests
  set preferred_date      = v_date,
      preferred_time      = v_time,
      consultation_status = 'confirmed',
      -- 수락하면 제안은 역할을 끝낸다. 남겨두면 "제안됨" 표시가 계속 뜨고
      -- 같은 슬롯을 두 번 수락할 여지가 생긴다.
      alternative_slots   = null
  where id = p_consultation_id;

  perform pg_catalog.set_config('app.slot_accept', '0', true);

  return jsonb_build_object(
    'preferredDate', to_char(v_date, 'YYYY-MM-DD'),
    'preferredTime', to_char(v_time, 'HH24:MI'),
    'consultationStatus', 'confirmed'
  );
exception
  -- (차량, 날짜, 시간) 활성 상담 1건 제약 — 제안 후 그 시간이 먼저 채워질 수 있다
  when unique_violation then
    raise exception '그 시간에 이미 다른 상담이 있습니다. 다른 시간을 선택해 주세요.';
end;
$$;

revoke all on function public.accept_alternative_slot(uuid, integer) from public;
grant execute on function public.accept_alternative_slot(uuid, integer) to authenticated;

comment on function public.accept_alternative_slot(uuid, integer) is
  '상담 신청자가 관리자가 제안한 대체 일정 중 하나를 인덱스로 선택해 확정한다. '
  '날짜·시간을 인자로 받지 않으므로 제안되지 않은 시간을 넣을 수 없다.';
