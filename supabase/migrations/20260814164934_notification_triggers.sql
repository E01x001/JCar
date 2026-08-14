-- 상태 전이 → 알림 생성 (푸시 재구축 ④)
--
-- 문구·딥링크 페이로드는 기존 Firebase 트리거(functions/triggers/*.js)에서 그대로 이관했다.
--
-- RPC 본문이 아니라 테이블 트리거에 둔 이유(docs/taxitogether-reference.md 설계):
--   JCar의 알림 이벤트는 거의 전부 "상태 컬럼 전이"다. 트리거로 잡으면 어떤 경로로
--   상태가 바뀌든(RPC·관리자 콘솔·보정 SQL) 누락이 없고, 문구 매핑도 한 곳에 모인다.
--   대량 보정 시 알림을 막으려면 세션에서 `set session_replication_role = replica`.
--
-- 알림 INSERT는 상태변경과 같은 트랜잭션이다. 따라서 이 함수는 절대 예외를 던지면 안 된다
-- (푸시 발송 실패는 ③에서 이미 격리됨).

comment on column public.notifications.type is
  '알림 종류: consultation_approved / consultation_rejected / consultation_completed / '
  'alternative_slots_suggested / vehicle_approved / vehicle_rejected';

-- ============================================================
-- 1. 상담 상태 전이
-- ============================================================
create or replace function app_private.notify_consultation_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type_label   text;
  v_vehicle_info text;
  v_title        text;
  v_body         text;
  v_type         text;
begin
  -- 신청자 본인이 상태를 바꾼 경우(관리자가 자기 상담을 처리)는 알리지 않는다
  if new.user_id = (select auth.uid()) then
    return new;
  end if;

  v_type_label := case when new.type = 'sell' then '판매' else '구매' end;
  v_vehicle_info := case
    when new.vehicle_name is not null and new.vehicle_name <> ''
      then ' (' || new.vehicle_name || ')'
    else ''
  end;

  -- ── 대체 시간 제안 (상태가 아니라 alternative_slots 변경이 트리거) ──
  if new.alternative_slots is distinct from old.alternative_slots
     and new.alternative_slots is not null then
    v_type  := 'alternative_slots_suggested';
    v_title := '대체 시간 제안';
    v_body  := format(
      '관리자가 %s 상담 대체 시간을 제안했습니다. 확인해주세요.%s',
      v_type_label, v_vehicle_info
    );

  -- ── 상태 전이 ──
  elsif new.consultation_status is distinct from old.consultation_status then
    case new.consultation_status
      when 'approved' then
        v_type  := 'consultation_approved';
        v_title := '상담 승인';
        v_body  := format(
          '%s %s %s 상담이 승인되었습니다.%s',
          new.preferred_date::text,
          to_char(new.preferred_time, 'HH24:MI'),
          v_type_label, v_vehicle_info
        );

      when 'rejected' then
        v_type  := 'consultation_rejected';
        v_title := '상담 거절';
        v_body  := format(
          '%s 상담 요청이 거절되었습니다.%s%s',
          v_type_label,
          case when new.rejection_reason is not null and new.rejection_reason <> ''
               then ' 사유: ' || new.rejection_reason else '' end,
          v_vehicle_info
        );

      when 'completed' then
        v_type  := 'consultation_completed';
        v_title := '상담 완료';
        v_body  := format(
          '%s 상담이 완료되었습니다.%s%s',
          v_type_label,
          case when new.deal_amount is not null
               then ' 거래 금액: ' || to_char(new.deal_amount, 'FM999,999,999,999') || '원'
               else '' end,
          v_vehicle_info
        );

      else
        -- 나머지 상태(confirmed/on-hold/cancelled/archived)는 알림 없음 — 기존 동작과 동일
        return new;
    end case;

  else
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    new.user_id, v_type, v_title, v_body,
    jsonb_build_object(
      'type', v_type,
      'consultationId', new.id,
      'screen', 'UserConsultationDetail'
    )
  );

  return new;
exception when others then
  -- 알림 실패가 상담 상태 변경을 되돌려선 안 된다
  raise warning 'notify_consultation_change 실패 — %', sqlerrm;
  return new;
end;
$$;

create trigger on_consultation_status_changed
  after update on public.consultation_requests
  for each row
  when (
    old.consultation_status is distinct from new.consultation_status
    or old.alternative_slots is distinct from new.alternative_slots
  )
  execute function app_private.notify_consultation_change();

-- 관리자 메모 수정 알림은 의도적으로 만들지 않는다.
-- 사용자 가치가 낮아 알림 피로만 유발한다는 판단(docs/taxitogether-reference.md §1.4④,
-- 형제 프로젝트가 채팅 알림에서 겪은 배지 인플레이션 사례). 재도입은 별도 논의.

-- ============================================================
-- 2. 차량 승인/거절
-- ============================================================
create or replace function app_private.notify_vehicle_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner  uuid;
  v_name   text;
  v_title  text;
  v_body   text;
  v_type   text;
  v_screen text;
begin
  v_owner := coalesce(new.current_owner_id, new.seller_id);
  if v_owner is null or v_owner = (select auth.uid()) then
    return new;
  end if;

  v_name := coalesce(nullif(new.vehicle_name, ''), '등록하신 차량');

  if new.status = 'approved' then
    v_type   := 'vehicle_approved';
    v_title  := '차량 등록 승인';
    v_body   := format('%s이 승인되어 판매 가능합니다.', v_name);
    v_screen := 'VehicleDetail';
  elsif new.status = 'rejected' then
    v_type   := 'vehicle_rejected';
    v_title  := '차량 등록 거절';
    v_body   := format('%s 등록이 거절되었습니다.', v_name);
    -- 기존엔 'MyPage'였으나 탭 내부 라우트라 루트 스택 navigate가 불안정하다.
    -- 'MyVehicles'는 루트 스택에 있고 "거절된 내 차량을 본다"는 맥락에도 맞다.
    v_screen := 'MyVehicles';
  else
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_owner, v_type, v_title, v_body,
    jsonb_build_object('type', v_type, 'vehicleId', new.id, 'screen', v_screen)
  );

  return new;
exception when others then
  raise warning 'notify_vehicle_status_change 실패 — %', sqlerrm;
  return new;
end;
$$;

create trigger on_vehicle_status_changed
  after update on public.vehicles
  for each row
  when (old.status is distinct from new.status)
  execute function app_private.notify_vehicle_status_change();
