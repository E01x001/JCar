// 계정 즉시 삭제 (accountService.deleteUserAccount)
// cascade-delete-user(30일 유예)와 달리 auth 계정까지 즉시 제거한다.
// FK 의존 순서대로 정리한다(리뷰 반영): 내 차량을 참조하는 타인 상담 →
// 내 상담 → 소유권이전/매입기록 참조 해제 → PII/가격 → 차량 → auth 사용자.
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
    const must = (label: string) => (res: { error: unknown }) => {
      if (res.error) {
        throw new Error(`${label}: ${JSON.stringify(res.error)}`);
      }
      return res;
    };

    // 0. 내 차량 목록 확보
    const { data: myVehicles, error: vehListError } = await admin
      .from("vehicles")
      .select("id")
      .or(`seller_id.eq.${uid},current_owner_id.eq.${uid}`);
    if (vehListError) { throw vehListError; }
    const vehicleIds = (myVehicles ?? []).map((v) => v.id);

    if (vehicleIds.length > 0) {
      // 1. 내 차량을 참조하는 모든 상담(타인 포함) 삭제
      must("consultations(by vehicle)")(
        await admin.from("consultation_requests").delete()
          .in("vehicle_id", vehicleIds),
      );
      // 2. 이전기록/매입기록/감사로그의 차량 참조 정리
      must("transfers(by vehicle)")(
        await admin.from("ownership_transfers").delete()
          .in("vehicle_id", vehicleIds),
      );
      must("owned(by vehicle)")(
        await admin.from("admin_owned_vehicles").delete()
          .in("vehicle_id", vehicleIds),
      );
    }

    // 3. 내 명의 상담 삭제 (차량이 타인 소유인 경우)
    must("consultations(by user)")(
      await admin.from("consultation_requests").delete().eq("user_id", uid),
    );

    // 4. 차량 삭제 (private_contact/pricing은 on delete cascade)
    if (vehicleIds.length > 0) {
      must("vehicles")(
        await admin.from("vehicles").delete().in("id", vehicleIds),
      );
    }

    // 5. auth 계정 삭제 → profiles는 on delete cascade
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
