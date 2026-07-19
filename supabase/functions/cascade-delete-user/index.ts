// 계정 소프트삭제 (Firebase cascadeDeleteUser 대체 — Phase 2c)
// 본인 계정만 삭제 가능. 30일 유예 후 영구삭제 대상이 되며, 그동안:
//  - profiles.account_status = 'pending_deletion' (RLS is_active_user가 활동 차단)
//  - 소유 차량 hidden 처리 (목록에서 숨김)
//  - 활성 상담 취소
// service_role로 실행되어 RLS를 우회한다(가드 트리거도 auth.uid()=null이라 통과).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GRACE_DAYS = 30;

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
    // 호출자 JWT 검증 (verify_jwt로 1차 검증되지만 uid 추출 겸 재확인)
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

    const now = new Date();
    const permanentDeleteDate = new Date(
      now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    // 1. 프로필 소프트삭제 표시
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        account_status: "pending_deletion",
        deleted_at: now.toISOString(),
        permanent_delete_date: permanentDeleteDate,
        fcm_token: null, // 탈퇴 계정에 푸시 중단
      })
      .eq("id", uid);
    if (profileError) { throw profileError; }

    // 2. 소유 차량 숨김 (판매자 또는 현소유자 기준 — 배포점검 'currentOwnerId 누락' 반영)
    const { error: vehicleError } = await admin
      .from("vehicles")
      .update({ hidden: true, updated_at: now.toISOString() })
      .or(`seller_id.eq.${uid},current_owner_id.eq.${uid}`);
    if (vehicleError) { throw vehicleError; }

    // 3. 활성 상담 취소
    const { error: consultError } = await admin
      .from("consultation_requests")
      .update({
        consultation_status: "cancelled",
        cancelled_at: now.toISOString(),
      })
      .eq("user_id", uid)
      .in("consultation_status", ["pending", "approved", "confirmed", "on-hold"]);
    if (consultError) { throw consultError; }

    return json({ success: true, permanentDeleteDate });
  } catch (error) {
    console.error("cascade-delete-user failed:", error);
    return json(
      { success: false, message: "계정 삭제 처리 중 오류가 발생했습니다." },
      500,
    );
  }
});
