// CarZen 차량정보 프록시 (Firebase getVehicleInfo Callable 대체 — Phase 2b)
// API 키는 Supabase Secrets(CARZEN_API_KEY)에 보관, 클라이언트에 노출되지 않는다.
// verify_jwt 활성(기본값) — 인증된 사용자만 호출 가능.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CARZEN_URL =
  "https://datahub-dev.scraping.co.kr/assist/common/carzen/CarAllInfoInquiry";

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
    const { regiNumber, ownerName } = await req.json();

    if (!regiNumber || !ownerName) {
      return json(
        { success: false, message: "차량번호와 소유자명은 필수 입력값입니다." });
    }

    const regiNumberRegex =
      /^([가-힣]{0,2})?(\d{2,3})([가-힣A-Z외임])\s?(\d{3,4})$/;
    if (!regiNumberRegex.test(String(regiNumber).replace(/\s+/g, ""))) {
      return json(
        { success: false, message: "올바른 차량번호 형식이 아닙니다." });
    }

    const apiKey = Deno.env.get("CARZEN_API_KEY");
    if (!apiKey) {
      console.error("CARZEN_API_KEY secret not set");
      return json(
        { success: false, message: "서버 설정 오류입니다. 관리자에게 문의하세요." });
    }

    const response = await fetch(CARZEN_URL, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({ REGINUMBER: regiNumber, OWNERNAME: ownerName }),
    });

    const jsonResponse = await response.json();

    console.log(
      "CarZen response meta:",
      JSON.stringify({
        errCode: jsonResponse.errCode,
        errMsg: jsonResponse.errMsg,
        result: jsonResponse.result,
        status: jsonResponse.data?.STATUS,
      }),
    );

    if (
      jsonResponse.errCode !== "0000" ||
      jsonResponse.result !== "SUCCESS" ||
      String(jsonResponse.data?.STATUS) !== "200"
    ) {
      return json(
        {
          success: false,
          message: jsonResponse.errMsg || "차량 정보를 찾을 수 없습니다.",
        });
    }

    return json({ success: true, data: jsonResponse.data });
  } catch (error) {
    console.error("CarZen API request failed:", error);
    return json(
      { success: false, message: "차량 정보를 조회하는 중 오류가 발생했습니다." });
  }
});
