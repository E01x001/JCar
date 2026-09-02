// 비밀번호 재설정 — 브라우저에 세션을 주지 않고 처리한다.
//
// 왜 이렇게 하나:
//
//   Supabase의 기본 복구 링크는 GoTrue의 /auth/v1/verify를 거치며 **브라우저에
//   정식 세션을 넘긴다.** 그러면 재설정 링크가 사실상 로그인 링크가 되고, 우리는
//   그 세션을 화면 단에서 가두는 게이트를 만들어야 했다. 그 게이트는 URL 조각과
//   이벤트와 로컬 저장소를 짜맞춘 추론이라 셋 다에서 버그가 났고, 무엇보다
//   **화면만 가릴 뿐 API 호출은 막지 못했다**(RLS는 복구 세션을 구분하지 않는다).
//
//   그래서 세션을 아예 만들지 않는다. 메일 링크는 우리 페이지로 오고
//   (템플릿의 {{ .TokenHash }}), 페이지는 토큰과 새 비밀번호를 여기로 보낸다.
//   검증·변경·세션 정리가 전부 서버에서 한 번에 끝나고, 브라우저는 토큰을
//   구경도 하지 못한다.
//
// **service_role을 쓰지 않는다.** 2026-09-01 측정으로 확인한 대로, 검증이
// 돌려주는 세션 토큰만으로 비밀번호 변경과 전 세션 해제가 전부 된다. 공개
// 엔드포인트가 관리자 키를 들고 있지 않다는 뜻이고, 뚫려도 그 계정 하나를
// 넘어서지 못한다.
//
// 배포 (로그인 못 하는 사람이 부른다):
//   supabase functions deploy reset-password --no-verify-jwt
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * 비밀번호 규칙은 **서버에서도** 본다.
 *
 * 클라이언트 검증은 사용자를 돕는 것이지 우리를 지키는 것이 아니다. 이 함수는
 * 공개 엔드포인트라 화면을 거치지 않고도 호출된다.
 *
 * src/utils/password.js와 같은 규칙이다. 둘이 갈라지면 앱에서는 막히는 값이
 * API로는 통과한다.
 */
const PASSWORD_RE = /^(?=.*[a-z])(?=.*\d).{8,}$/;

/** 토큰 해시의 형태. 56자 16진수(2026-09-01 측정). */
const TOKEN_HASH_RE = /^[a-f0-9]{40,128}$/i;

const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  req.headers.get("cf-connecting-ip") ??
  "unknown";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "";

  // 기록·제한용 클라이언트. anon 권한이며, 여기서 부르는 두 함수는
  // 덧붙이기와 카운터 증가만 한다.
  const log = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });

  const record = (
    event: string,
    email: string | null = null,
    detail: Record<string, unknown> = {},
  ) =>
    log.rpc("record_auth_event", {
      p_event: event,
      p_email: email,
      p_ip: ip,
      p_user_agent: userAgent,
      p_detail: detail,
    }).then(({ error }) => {
      if (error) { console.error("이벤트 기록 실패:", error.message); }
    });

  let tokenHash = "";
  let password = "";
  try {
    const body = await req.json();
    tokenHash = String(body?.token_hash ?? "").trim();
    password = String(body?.password ?? "");
  } catch {
    return json({ ok: false, error: "요청을 읽지 못했습니다." }, 400);
  }

  // 형태부터 본다. 엉뚱한 값으로 시도 횟수를 소모시키지 않는다.
  if (!TOKEN_HASH_RE.test(tokenHash)) {
    return json({
      ok: false,
      code: "invalid_link",
      error: "링크가 올바르지 않습니다. 비밀번호 찾기를 다시 요청해주세요.",
    }, 400);
  }

  if (!PASSWORD_RE.test(password)) {
    return json({
      ok: false,
      code: "weak_password",
      error: "8자 이상, 영문 소문자와 숫자를 포함해야 합니다.",
    }, 400);
  }

  // 같은 IP에서 시간당 10번. 토큰이 56자라 추측은 불가능하지만, 이 함수는
  // verify_jwt가 꺼져 있어 Supabase의 인증 기반 제한 밖에 있다.
  const { data: allowed, error: limitError } = await log.rpc(
    "claim_auth_attempt",
    { p_key: `reset:${ip}`, p_limit: 10, p_window: "01:00:00" },
  );
  if (limitError) {
    // 제한을 못 세면 통과시킨다. 여기서 막으면 DB 장애가 곧 재설정 불능이 된다.
    console.error("시도 제한 확인 실패:", limitError.message);
  } else if (allowed === false) {
    await record("reset_rate_limited");
    return json({
      ok: false,
      code: "rate_limited",
      error: "시도가 너무 많습니다. 잠시 후 다시 시도해주세요.",
    }, 429);
  }

  // ── 1. 토큰 검증 ────────────────────────────────────────────────────
  // 세션이 여기서 만들어지지만 **이 함수 안에만 머문다.**
  const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "recovery", token_hash: tokenHash }),
  });

  if (!verifyRes.ok) {
    await record("reset_failed", null, { stage: "verify", status: verifyRes.status });
    return json({
      ok: false,
      code: "invalid_link",
      error: "링크가 만료되었거나 이미 사용되었습니다. 비밀번호 찾기를 다시 요청해주세요.",
    }, 400);
  }

  const session = await verifyRes.json();
  const accessToken: string | undefined = session?.access_token;
  const email: string | undefined = session?.user?.email;

  if (!accessToken) {
    await record("reset_failed", null, { stage: "no_token" });
    return json({
      ok: false,
      code: "invalid_link",
      error: "링크가 올바르지 않습니다. 비밀번호 찾기를 다시 요청해주세요.",
    }, 400);
  }

  // ── 2. 비밀번호 변경 ────────────────────────────────────────────────
  // 토큰은 1회용이라 이 시점에 이미 소모됐다. 여기서 실패하면 사용자는 링크를
  // 다시 받아야 하므로, 그 사실을 문구로 분명히 알린다.
  const updateRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  if (!updateRes.ok) {
    const detail = await updateRes.text();
    console.error("비밀번호 변경 실패:", updateRes.status, detail);
    await record("reset_failed", email ?? null, {
      stage: "update",
      status: updateRes.status,
    });
    return json({
      ok: false,
      code: "update_failed",
      error: "비밀번호를 변경하지 못했습니다. 비밀번호 찾기를 다시 요청해주세요.",
    }, 400);
  }

  // ── 3. 모든 세션 해제 ───────────────────────────────────────────────
  // 비밀번호를 바꾸는 이유는 계정을 남이 쥐고 있어서인 경우가 많다. 그 세션이
  // 살아 있으면 바꾼 의미가 없다. scope=global이라 방금 만든 임시 세션도 함께
  // 정리된다 — 남는 토큰이 없다.
  let sessionsRevoked = true;
  const logoutRes = await fetch(`${supabaseUrl}/auth/v1/logout?scope=global`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });
  if (!logoutRes.ok) {
    sessionsRevoked = false;
    console.error("세션 해제 실패:", logoutRes.status);
  }

  await record("reset_succeeded", email ?? null, { sessions_revoked: sessionsRevoked });

  return json({ ok: true, sessionsRevoked });
});
