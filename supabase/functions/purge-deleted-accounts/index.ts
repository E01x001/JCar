// 탈퇴 유예(30일) 만료 계정 익명화
//
// pg_cron이 매일 app_private.dispatch_account_purge()를 돌리고, 처리 대상이 있을 때만
// pg_net으로 이 함수를 service_role 토큰과 함께 호출한다.
//
// 정책: 기록은 남기고 사람은 지운다.
//   - public 스키마의 개인정보 파기는 SQL 함수 app_private.anonymize_account()가 담당
//   - auth.users의 이메일/전화는 admin API로만 지울 수 있어 여기서 처리한다
//   - 차량·상담·소유권 이전 기록 자체는 건드리지 않는다(회사 보존 자산)
//
// 호출자 검증: service_role 토큰만 허용한다. verify_jwt는 "로그인한 누군가"만 증명하므로
// 그것만 믿으면 일반 사용자가 타인의 계정 파기를 호출할 수 있다.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { isServiceRole } from "../_shared/serviceRole.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isServiceRole(req.headers.get("Authorization") ?? "")) {
    console.warn("purge-deleted-accounts: 비인가 호출 차단");
    return json({ success: false, message: "Forbidden" }, 403);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: due, error: dueError } = await admin.rpc("due_for_anonymization");
    if (dueError) { throw dueError; }

    const targets: string[] = (due ?? []).map((r: { id: string }) => r.id);
    if (targets.length === 0) {
      return json({ success: true, processed: 0 });
    }

    const failed: string[] = [];

    for (const uid of targets) {
      try {
        // 1) public 스키마 개인정보 파기 (차량·거래 기록은 유지)
        const { error: rpcError } = await admin.rpc("anonymize_account", { p_uid: uid });
        if (rpcError) { throw rpcError; }

        // 2) auth.users의 식별정보 제거 + 로그인 영구 차단.
        //    계정 자체를 지우면 profiles가 cascade로 삭제되고, 이는 vehicles 등의
        //    FK(RESTRICT)에 걸려 실패한다. 그래서 지우지 않고 비운다.
        const { error: authError } = await admin.auth.admin.updateUserById(uid, {
          email: `deleted-${uid}@invalid.local`,
          phone: undefined,
          user_metadata: {},
          ban_duration: "876000h", // 100년 — 사실상 영구
        });
        if (authError) { throw authError; }

        console.log("anonymized", { uid });
      } catch (e) {
        failed.push(uid);
        console.error("anonymize failed", { uid, error: String(e) });
      }
    }

    return json({
      success: failed.length === 0,
      processed: targets.length - failed.length,
      failed: failed.length,
    });
  } catch (error) {
    console.error("purge-deleted-accounts failed:", error);
    return json({ success: false, message: "익명화 처리 중 오류" }, 500);
  }
});
