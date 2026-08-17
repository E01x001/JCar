/**
 * service_role 호출자 검증.
 *
 * 플랫폼의 verify_jwt는 "서명이 유효한 토큰을 가진 누군가"만 증명한다.
 * 앱에 로그인한 모든 사용자가 여기에 해당하므로, DB 트리거만 호출해야 하는
 * 함수에서는 그것만으로 부족하다. 역할까지 확인해야 한다.
 *
 * 검증 순서:
 *   1) service_role 키를 그대로 보낸 경우 — 상수 시간 비교
 *   2) JWT인 경우 — payload.role 확인
 *      (서명 검증은 플랫폼이 이미 수행했으므로 여기서는 역할만 본다)
 */
export const isServiceRole = (authHeader: string): boolean => {
  const token = (authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) { return false; }

  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (expected && token.length === expected.length) {
    let diff = 0;
    for (let i = 0; i < token.length; i++) {
      diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    if (diff === 0) { return true; }
  }

  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload?.role === "service_role";
  } catch {
    return false;
  }
};
