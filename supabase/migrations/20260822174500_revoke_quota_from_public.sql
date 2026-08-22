-- consultation_quota()의 익명 실행 권한 제거 — 앞선 마이그레이션의 미완 처리
--
-- 20260822170000에서 `revoke ... from anon`만 했는데 효과가 없었다.
-- 함수는 생성 시 PUBLIC에 EXECUTE가 기본 부여되고, anon은 그 PUBLIC 권한으로
-- 실행하고 있었다. 역할에서 회수해도 PUBLIC이 남아 있으면 그대로 통과한다.
revoke execute on function public.consultation_quota() from public, anon;
grant execute on function public.consultation_quota() to authenticated;
