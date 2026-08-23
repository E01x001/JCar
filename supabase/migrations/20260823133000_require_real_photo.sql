-- 실사진이 없는 차량은 다른 사용자에게 노출하지 않는다
--
-- 등록 화면에서 "사진 1장 필수"를 막는 것만으로는 경계가 아니다. 조작된 요청은
-- 그대로 통과하고, 업로드가 부분 실패하거나 관리자가 부적절한 사진을 지운 뒤에도
-- 사진 0장인 차량이 목록에 남는다. 이 프로젝트가 지켜온 대로 DB가 경계여야 한다.
--
-- hidden을 트리거로 자동 조작하지 않는 이유:
--   hidden은 관리자의 사후 조치(post-moderation) 수단이다. "사진이 없어서"와
--   "관리자가 내려서"는 사유가 다른데, 트리거로 hidden을 켜고 끄면 사진을
--   올리는 순간 관리자 판단까지 덮어써 버린다.
--   노출 조건에 사진 유무를 **더하기만** 하면 새 상태도 새 컬럼도 필요 없고,
--   두 사유가 서로 간섭하지 않는다.
--
-- catalog_image_url(모델 참고 이미지)은 판단에 넣지 않는다. 참고 이미지로
-- 노출이 열리면 이 규칙을 만든 이유가 사라진다.

drop policy if exists "vehicles_select" on public.vehicles;

create policy "vehicles_select" on public.vehicles
  for select to authenticated
  using (
    (
      status = 'approved'
      and hidden = false
      -- 실사진 1장 이상. image_urls는 NOT NULL이므로 빈 배열이 "없음"이고,
      -- array_length는 빈 배열에 NULL을 돌려주므로 coalesce가 필요하다.
      and coalesce(array_length(image_urls, 1), 0) >= 1
    )
    or (select auth.uid()) = coalesce(current_owner_id, seller_id)
    or app_private.is_admin()
  );

comment on policy "vehicles_select" on public.vehicles is
  '노출 조건: 승인 + 미숨김 + 실사진 1장 이상. 소유자와 관리자는 항상 볼 수 있다.';
