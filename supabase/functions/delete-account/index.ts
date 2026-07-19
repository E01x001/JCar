// 계정 즉시 삭제 (관리자 페이지의 단순 탈퇴 경로 — accountService.deleteUserAccount)
// cascade-delete-user(30일 유예)와 달리 auth 계정까지 즉시 제거한다.
// profiles는 FK on delete cascade로 함께 삭제된다.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ success: false, message: "로그인이 필요합니다." }, 401);
    }
    const uid = userData.user.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 소유 차량/상담 정리 (즉시 삭제 경로 — FK 제약상 참조 행 먼저 제거)
    await admin.from("consultation_requests").delete().eq("user_id", uid);
    await admin.from("vehicles").delete()
      .or(`seller_id.eq.${uid},current_owner_id.eq.${uid}`);

    // auth 계정 삭제 → profiles는 on delete cascade
    const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
    if (deleteError) { throw deleteError; }

    return json({ success: true });
  } catch (error) {
    console.error("delete-account failed:", error);
    return json(
      { success: false, message: "계정 삭제 중 오류가 발생했습니다." },
      500,
    );
  }
});
