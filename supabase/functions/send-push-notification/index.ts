// 푸시 발송 (Firebase Firestore 트리거 6종 대체 — 알림 재구축 ①)
//
// 호출 계약: { userId, title, body, data? } → 해당 사용자의 profiles.fcm_token으로 FCM 발송.
// 평상시에는 notifications 테이블의 AFTER INSERT 트리거가 pg_net으로 호출하지만,
// 계약이 단순해 CLI(supabase functions invoke)로 단독 검증할 수 있다.
//
// FCM HTTP v1은 레거시 서버키와 달리 OAuth2 액세스 토큰을 요구한다:
//   서비스 계정으로 JWT(RS256) 서명 → 구글 토큰 엔드포인트에서 교환 → Bearer로 사용.
// 토큰 수명은 1시간이며 인스턴스 메모리에 캐싱한다(§설계: DB 공유 캐시는 경합 대비 이득 없음).
//
// 필요 시크릿: FCM_SERVICE_ACCOUNT = 서비스 계정 JSON 전체
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
// 만료 직전 재사용으로 401을 맞지 않도록 60초 여유를 둔다
const TOKEN_SKEW_SECONDS = 60;

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

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

const loadServiceAccount = (): ServiceAccount => {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (!raw) {
    throw new Error("FCM_SERVICE_ACCOUNT secret이 설정되지 않았습니다");
  }
  const sa = JSON.parse(raw) as ServiceAccount;
  if (!sa.client_email || !sa.private_key || !sa.project_id) {
    throw new Error("FCM_SERVICE_ACCOUNT JSON에 필수 필드가 없습니다");
  }
  return sa;
};

/** base64url — JWT는 표준 base64가 아니라 URL-safe·패딩 없는 형식을 쓴다 */
const base64url = (input: ArrayBuffer | string): string => {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** PEM(PKCS#8) → Web Crypto가 받는 ArrayBuffer */
const pemToArrayBuffer = (pem: string): ArrayBuffer => {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// 인스턴스 메모리 캐시 (콜드스타트마다 초기화됨 — 의도된 트레이드오프)
let cachedToken: { value: string; expiresAt: number } | null = null;

const getAccessToken = async (sa: ServiceAccount): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - TOKEN_SKEW_SECONDS > now) {
    return cachedToken.value;
  }

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: FCM_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const assertion = `${unsigned}.${base64url(signature)}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    throw new Error(`OAuth 토큰 교환 실패: ${JSON.stringify(result)}`);
  }

  cachedToken = {
    value: result.access_token,
    expiresAt: now + (result.expires_in ?? 3600),
  };
  return cachedToken.value;
};

/** FCM data 페이로드는 모든 값이 문자열이어야 한다 (기존 functions/utils/fcm.js와 동일 규칙) */
const stringifyData = (data: Record<string, unknown> | null | undefined) => {
  const out: Record<string, string> = {};
  Object.entries(data ?? {}).forEach(([k, v]) => {
    if (v !== null && v !== undefined) { out[k] = String(v); }
  });
  return out;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // token은 진단용 직접 지정 경로(기기 없이 발송 경로를 점검할 때).
    // 평상시 트리거는 항상 userId를 보낸다.
    const { userId, token, title, body, data } = await req.json();

    if ((!userId && !token) || !title || !body) {
      return json(
        { success: false, message: "userId(또는 token), title, body는 필수입니다." },
        400,
      );
    }

    let fcmToken: string | null = token ?? null;

    if (!fcmToken) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("fcm_token")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) { throw profileError; }
      fcmToken = profile?.fcm_token ?? null;
    }

    // 토큰 없음은 실패가 아니다 — 알림 미허용/로그아웃 상태의 정상 경로
    if (!fcmToken) {
      console.log("push skipped: no fcm_token", { userId });
      return json({ success: true, status: "skipped", reason: "no_token" });
    }

    const sa = loadServiceAccount();
    const accessToken = await getAccessToken(sa);

    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: { title, body },
            data: stringifyData(data),
          },
        }),
      },
    );

    const fcmResult = await fcmResponse.json();

    if (!fcmResponse.ok) {
      // 무효 토큰(앱 삭제·재설치)은 정상적으로 발생한다 — 실패로 취급하지 않는다.
      // 토큰 정리는 ⑤단계에서 추가한다.
      const status = fcmResult?.error?.status;
      if (status === "UNREGISTERED" || status === "INVALID_ARGUMENT") {
        console.log("push skipped: stale token", { userId, status });
        return json({ success: true, status: "skipped", reason: status });
      }
      throw new Error(`FCM 발송 실패: ${JSON.stringify(fcmResult)}`);
    }

    console.log("push sent", { userId, name: fcmResult.name });
    return json({ success: true, status: "sent" });
  } catch (error) {
    console.error("send-push-notification failed:", error);
    return json(
      { success: false, message: "푸시 발송 중 오류가 발생했습니다." },
      500,
    );
  }
});
