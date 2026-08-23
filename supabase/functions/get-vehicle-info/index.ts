// 차량정보 조회 프록시.
//
// API 키는 Supabase Secrets에 보관하고 클라이언트에 노출하지 않는다.
// verify_jwt 활성(기본값) — 인증된 사용자만 호출할 수 있다.
//
// 조회처(provider)는 환경변수 VEHICLE_INFO_PROVIDER로 고른다. 국토교통부 API로
// 옮길 때 여기 값만 바꾸면 되고, 문제가 생기면 즉시 되돌릴 수 있다.
// 클라이언트는 어느 조회처인지 몰라야 한다 — 그래서 응답을 정규화해서 준다.
//
//   VEHICLE_INFO_PROVIDER=carzen  (기본값, 유료)
//   VEHICLE_INFO_PROVIDER=molit   (국토교통부, 미구현)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { CarzenProvider } from "./providers/carzen.ts";
import type { VehicleProvider } from "./types.ts";
import { VehicleNotFoundError } from "./types.ts";

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

const REGI_NUMBER = /^([가-힣]{0,2})?(\d{2,3})([가-힣A-Z외임])\s?(\d{3,4})$/;

/** 설정에 따라 조회처를 고른다. 설정이 잘못되면 조용히 넘어가지 않는다. */
const resolveProvider = (): VehicleProvider => {
  const name = (Deno.env.get("VEHICLE_INFO_PROVIDER") ?? "carzen").toLowerCase();

  if (name === "carzen") {
    const apiKey = Deno.env.get("CARZEN_API_KEY");
    if (!apiKey) { throw new Error("CARZEN_API_KEY secret not set"); }
    return new CarzenProvider(apiKey);
  }

  // molit은 공공데이터포털 인증키 발급 후 추가한다(providers/molit.ts).
  throw new Error(`unknown VEHICLE_INFO_PROVIDER: ${name}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { regiNumber, ownerName } = await req.json();

    if (!regiNumber || !ownerName) {
      return json({
        success: false,
        message: "차량번호와 소유자명은 필수 입력값입니다.",
      });
    }

    if (!REGI_NUMBER.test(String(regiNumber).replace(/\s+/g, ""))) {
      return json({ success: false, message: "올바른 차량번호 형식이 아닙니다." });
    }

    let provider: VehicleProvider;
    try {
      provider = resolveProvider();
    } catch (configError) {
      console.error("provider config error:", configError);
      return json({
        success: false,
        message: "서버 설정 오류입니다. 관리자에게 문의하세요.",
      });
    }

    const { vehicle, provider: providerName, raw } = await provider.lookup(
      String(regiNumber),
      String(ownerName),
    );

    return json({
      success: true,
      provider: providerName,
      vehicle,
      // data — 하위호환. 정규화 이전 앱(≤1.0.14)이 원본 키를 직접 읽는다.
      // 모든 클라이언트가 vehicle을 쓰게 되면 뺀다.
      data: raw,
    });
  } catch (error) {
    if (error instanceof VehicleNotFoundError) {
      return json({ success: false, message: error.message });
    }
    console.error("vehicle lookup failed:", error);
    return json({
      success: false,
      message: "차량 정보를 조회하는 중 오류가 발생했습니다.",
    });
  }
});
