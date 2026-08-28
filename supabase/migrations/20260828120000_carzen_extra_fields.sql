-- CarZen 응답에서 버리고 있던 항목을 받는다
--
-- 명세(CarAllInfoInquiry)와 대조해 보니 우리가 읽는 키 이름은 전부 맞았고,
-- 대신 **아예 읽지 않는 항목이 셋** 있었다.
--
--   PRICE        신차가격. 매입가 판단의 근거인데 한 번도 저장한 적이 없다.
--   UID          차량 전산코드. 모델을 가리키는 안정적인 식별자다.
--   BATTERYLIST  호환 배터리 **목록**. 우리는 [0].MODEL 하나만 남기고
--                BRAND·TYPE과 나머지 항목을 통째로 버리고 있었다.
--
-- 신차가격을 vehicles가 아니라 vehicle_pricing에 두는 이유:
-- 가격은 관리자에게만 보인다는 규칙이 이 프로젝트의 경계이고, 그 경계는
-- 컴포넌트가 아니라 RLS가 지킨다. 신차가격은 공시가라 매입가만큼 민감하진
-- 않지만, 가격이라는 이름이 붙은 값을 일반 사용자가 읽을 수 있는 테이블에
-- 두는 순간 그 경계가 흐려진다. 예외를 만들지 않는다.

-- ============================================================
-- 1. vehicles — 전산코드와 배터리 목록
-- ============================================================

alter table public.vehicles
  add column if not exists catalog_uid text,
  add column if not exists batteries jsonb;

comment on column public.vehicles.catalog_uid is
  'CarZen UID(차량 전산코드). 모델 식별자 — 국토부 API 이관 시 대조 기준.';

comment on column public.vehicles.batteries is
  '호환 배터리 목록 [{brand, model, type}]. battery 컬럼은 이 목록의 첫 모델명(하위호환).';

-- 컬럼 단위 그랜트 체계를 따른다(20260708161043 참고).
-- 등록 시 판매자가 써야 하고, 권한을 결정하는 컬럼이 아니다.
grant insert (catalog_uid, batteries) on public.vehicles to authenticated;
grant update (catalog_uid, batteries) on public.vehicles to authenticated;

-- ============================================================
-- 2. vehicle_pricing — 신차가격 (관리자 전용 테이블)
-- ============================================================

alter table public.vehicle_pricing
  add column if not exists new_car_price numeric check (new_car_price >= 0);

comment on column public.vehicle_pricing.new_car_price is
  '조회처가 준 신차가격(CarZen PRICE). 참고값 — 관리자만 본다.';

-- ============================================================
-- 3. 등록 시 신차가격을 남기는 경로
-- ============================================================
--
-- 문제: vehicle_pricing은 관리자 전용이라 등록하는 일반 사용자가 쓸 수 없다.
-- 그렇다고 조회 단계(Edge Function)에서 쓸 수도 없다 — 그 시점엔 차량 행이
-- 아직 없어서 붙일 vehicle_id가 없다.
--
-- 그래서 좁은 통로를 하나 낸다: **그 차량의 판매자가, 값이 아직 없을 때만,
-- 신차가격 한 칸만** 쓸 수 있다. 관리자가 고쳐 둔 값은 덮지 않는다.
--
-- 한계를 분명히 해둔다: 값은 클라이언트를 거쳐 온다. 위조된 신차가격이
-- 들어올 수 있다는 뜻이다. 조회가 차량 행 생성보다 먼저 일어나는 한 이건
-- 구조적으로 남고, 그래서 이 값은 **참고값이지 판단의 최종 근거가 아니다.**
-- 관리자가 언제든 직접 고칠 수 있다.

create or replace function public.record_new_car_price(
  p_vehicle_id uuid,
  p_price numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- 값이 없으면 조용히 넘어간다 — 조회처가 안 준 경우가 정상적으로 있다.
  if p_price is null or p_price <= 0 then
    return;
  end if;

  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id
      and v.seller_id = auth.uid()
  ) then
    raise exception '본인이 등록한 차량이 아닙니다.' using errcode = '42501';
  end if;

  insert into public.vehicle_pricing (vehicle_id, new_car_price)
  values (p_vehicle_id, p_price)
  on conflict (vehicle_id) do update
    set new_car_price = excluded.new_car_price,
        updated_at = now()
    -- 이미 값이 있으면 덮지 않는다. 관리자가 손댄 값을 재등록이 지우면 안 된다.
    where public.vehicle_pricing.new_car_price is null;
end;
$$;

-- Supabase 기본 default privileges가 새 함수에 anon 실행권한을 붙인다.
-- 미인증 호출은 auth.uid()가 NULL이라 어차피 판매자 검사에서 막히지만,
-- 로그인한 사람만 쓰는 통로라는 것을 권한으로도 못박는다.
revoke all on function public.record_new_car_price(uuid, numeric) from public;
revoke all on function public.record_new_car_price(uuid, numeric) from anon;
grant execute on function public.record_new_car_price(uuid, numeric) to authenticated;

comment on function public.record_new_car_price(uuid, numeric) is
  '등록 직후 판매자가 신차가격만 기록한다. 기존 값은 덮지 않는다.';
