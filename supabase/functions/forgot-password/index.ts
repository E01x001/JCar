// 비밀번호 찾기 — 계정 종류에 따라 다른 메일을 보낸다.
//
// 왜 Edge Function인가:
//
//   구글로만 가입한 사람에게 재설정 링크를 보내면, 그 사람은 구글 계정에
//   비밀번호를 하나 더 붙이게 된다. 구글 쪽에 2단계 인증이 걸려 있어도 이
//   비밀번호에는 없으므로, 받은편지함에 잠깐 접근한 사람이 비밀번호를 심어두고
//   나중까지 들어올 수 있다. 그래서 그런 계정에는 "구글로 로그인하세요"라고
//   안내만 한다.
//
//   그런데 이 분기를 클라이언트가 알면 안 된다. 로그인하지 않은 사람이 임의의
//   이메일을 넣어 계정 존재 여부와 로그인 수단을 알아내는 창구가 되기 때문이다
//   (계정 열거). 그래서 판단을 서버 안에 가두고, **요청자에게는 세 경우 모두
//   똑같은 응답을 준다** — 계정 없음 / 비밀번호 있음 / 구글 전용.
//
// verify_jwt는 꺼야 한다(로그인 못 하는 사람이 부르는 기능이다):
//   supabase functions deploy forgot-password --no-verify-jwt
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

/** 모든 경우에 돌려주는 같은 응답. 여기서 갈라지면 열거가 가능해진다. */
const UNIFORM_OK = { ok: true } as const;

/**
 * 응답 시간도 신호가 된다.
 *
 * "계정 없음"은 조회 한 번으로 끝나고 메일 발송은 수백 ms가 걸린다. 그 차이를
 * 재면 계정 존재 여부를 알 수 있다. 그래서 어떤 경로든 최소 이 시간을 채운다.
 */
const MIN_RESPONSE_MS = 700;

const settle = async (startedAt: number) => {
  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_RESPONSE_MS) {
    await new Promise((r) => setTimeout(r, MIN_RESPONSE_MS - elapsed));
  }
  return json(UNIFORM_OK);
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 구글 전용 계정에 보내는 안내 메일. 재설정 링크를 담지 않는다. */
const noticeHtml = (signInUrl: string) => `
<h2 style="font-size:20px;margin:0 0 16px">구글로 로그인해주세요</h2>
<p style="line-height:1.7">
  비밀번호 재설정 요청을 받았습니다. 다만 이 계정은 <strong>구글로 가입</strong>하셨고
  비밀번호가 설정돼 있지 않습니다.
</p>
<p style="line-height:1.7">아래 버튼을 눌러 구글 계정으로 로그인해주세요.</p>
<p style="margin:24px 0">
  <a href="${signInUrl}" style="display:inline-block;background:#111;color:#fff;
     text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700">로그인하기</a>
</p>
<p style="line-height:1.7">
  본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다. 계정은 그대로입니다.
</p>
<hr style="border:none;border-top:1px solid #ECEEF1;margin:24px 0">
<p style="color:#8A9099;font-size:12px">JCar &middot; 이 메일은 발신 전용입니다.</p>
`;

const sendNotice = async (email: string, siteUrl: string) => {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("MAIL_FROM") ?? "JCar <onboarding@resend.dev>";
  if (!apiKey) {
    // 조용히 성공한 척하지 않는다 — 안내 메일이 안 나가면 사용자는 영문도
    // 모른 채 기다린다. 로그에는 남기되 응답은 동일하게 유지한다.
    console.error("RESEND_API_KEY secret not set — 안내 메일을 보내지 못했다");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "[JCar] 로그인 방법 안내",
      html: noticeHtml(siteUrl),
    }),
  });

  if (!res.ok) {
    console.error("안내 메일 발송 실패:", res.status, await res.text());
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();

  let email = "";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
  } catch {
    return settle(startedAt);
  }

  // 형식이 틀린 것만 즉시 거른다. 형식 오류는 계정 정보를 흘리지 않는다.
  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: "이메일 형식이 올바르지 않습니다." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://jcar-platform.vercel.app";

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const { data, error } = await admin.rpc("lookup_recovery_target", {
      p_email: email,
    });
    if (error) { throw error; }

    const target = Array.isArray(data) ? data[0] : data;

    if (!target) {
      // 계정 없음 — 아무것도 하지 않는다.
      return settle(startedAt);
    }

    if (target.has_password) {
      // 평범한 재설정. Supabase가 우리 한글 템플릿으로 메일을 보낸다.
      //
      // redirectTo를 넘기지 않는다. 템플릿이 {{ .ConfirmationURL }} 대신
      // {{ .SiteURL }}/reset?token_hash=...를 쓰므로 그 값은 링크에 반영되지
      // 않는다. 넘기면 효과 없는 값을 검증하는 코드만 남는다.
      const { error: resetError } = await admin.auth.resetPasswordForEmail(email);
      if (resetError) { console.error("재설정 메일 발송 실패:", resetError); }
      return settle(startedAt);
    }

    // 구글 전용 계정 — 안내만 한다. 우리가 직접 보내는 메일이라
    // Supabase의 레이트리밋 밖에 있으므로 발송 간격을 직접 지킨다.
    const { data: claimed, error: claimError } = await admin.rpc(
      "claim_recovery_notice",
      { p_email: email },
    );
    if (claimError) { console.error("발송 기록 실패:", claimError); }
    if (claimed) { await sendNotice(email, siteUrl); }

    return settle(startedAt);
  } catch (err) {
    // 실패해도 응답은 같다. 오류 내용으로 계정 상태를 추측하지 못하게 한다.
    console.error("forgot-password 처리 실패:", err);
    return settle(startedAt);
  }
});
