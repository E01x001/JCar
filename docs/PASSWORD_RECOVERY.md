# 비밀번호 찾기·재설정

로그인하지 못하는 사람이 다시 들어오는 경로.

**두 가지 원칙이 이 설계의 전부다.**

1. **요청자에게는 계정에 대해 아무것도 알려주지 않는다** — 계정 열거 방지
2. **재설정 과정에서 브라우저에 세션을 주지 않는다** — 재설정 링크는 로그인 링크가 아니다

```
① 요청
ForgotPasswordScreen
  └─ functions/forgot-password            ← verify_jwt 꺼짐
       ├─ lookup_recovery_target(email)   ← service_role 전용 RPC
       ├─ 비밀번호 있음 → resetPasswordForEmail  → 재설정 링크 메일
       ├─ 구글 전용    → Resend API             → "구글로 로그인" 안내 메일
       └─ 계정 없음    → 아무것도 하지 않음
     세 갈래 모두 { ok: true }를 같은 시간에 돌려준다

② 재설정
메일 링크 → {SiteURL}/reset?token_hash=...&type=recovery
  └─ ResetPasswordScreen                  ← 세션 없음. 토큰만 쥔다
       └─ functions/reset-password        ← verify_jwt 꺼짐
            ├─ /auth/v1/verify            토큰 검증 (세션은 함수 안에만)
            ├─ PUT /auth/v1/user          비밀번호 변경
            └─ /auth/v1/logout?scope=global   전 세션 해제
```

---

## 왜 세션을 만들지 않나

Supabase 기본 복구 링크(`{{ .ConfirmationURL }}`)는 GoTrue의 `/auth/v1/verify`를
거치며 **브라우저에 정식 세션을 넘긴다.** 그러면 재설정 링크가 사실상 로그인
링크가 된다 — 메일함을 잠깐 본 사람이 비밀번호를 모른 채 앱에 들어온다.

처음에는 그 세션을 화면 단에서 가두는 게이트를 만들었다. URL 프래그먼트 ·
`PASSWORD_RECOVERY` 이벤트 · AsyncStorage 표시를 짜맞춰 "이 세션이 복구
세션인가"를 추론하는 방식이었고, **셋 다에서 버그가 났다**:

| 신호 | 무엇이 샜나 |
|---|---|
| URL 프래그먼트 | supabase-js가 `_initialize()`에서 소비하고 지운다 |
| `PASSWORD_RECOVERY` | React가 구독을 붙이기 전에 지나갈 수 있다 |
| AsyncStorage 표시 | 만료가 없어 재설정을 포기한 기기가 영구히 갇혔다 |

그리고 더 근본적인 문제가 있었다. **게이트는 화면만 가릴 뿐 API 호출은 막지
못한다.** 그 세션은 완전한 JWT를 쥐고 있고 RLS는 복구 세션을 일반 세션과
구분하지 않으므로, 콘솔에서 `supabase.from('vehicles').select()`는 그냥 된다.

그래서 세션을 아예 만들지 않는 쪽으로 갔다. 링크가 `{{ .TokenHash }}`를
**쿼리로** 실어 우리 페이지로 오고(`detectSessionInUrl`은 프래그먼트만 본다),
검증·변경·세션 정리가 전부 서버에서 끝난다. 가둘 세션이 없으니 게이트도 없다.

### service_role을 쓰지 않는다

`/auth/v1/verify`가 돌려주는 세션 토큰만으로 비밀번호 변경과 전 세션 해제가
전부 된다(2026-09-01 측정). 그래서 `reset-password`는 관리자 키를 쥐지 않는다 —
`verify_jwt`가 꺼진 공개 엔드포인트이므로 이게 중요하다. 뚫려도 그 계정 하나를
넘지 못한다.

### 측정으로 확인한 것 (2026-09-01)

```
POST /auth/v1/verify {type:'recovery', token_hash}  →  200, access+refresh 반환
같은 토큰 재사용                                     →  403 otp_expired  (1회용)
PUT  /auth/v1/user   {password}                     →  200
POST /auth/v1/logout?scope=global                   →  204
이후 그 토큰으로 GET /user                           →  403  (완전히 죽음)
```

**토큰이 1회용이라 검증과 비밀번호 설정이 한 요청에 있어야 한다.** 화면 진입
시점에 링크 유효성을 미리 확인할 수 없다는 뜻이고, 그래서 만료된 링크는
비밀번호를 다 입력한 뒤에야 드러난다. 그 자리에서 폼을 접고 재요청을 안내한다.

성공해도 **로그인되지 않는다.** `scope=global`이 임시 세션까지 정리하기
때문이고, 그게 맞다 — 남는 토큰이 없다.

---

## 왜 요청 화면에서 계정 종류를 알려주지 않나

구글로만 가입한 사람에게 재설정 링크를 보내면, 그 사람은 구글 계정에 **더 약한
자격증명**을 하나 붙이게 된다. 구글 쪽 2단계 인증은 그 비밀번호에 적용되지
않으므로, 받은편지함에 잠깐 접근한 사람이 비밀번호를 심어두고 메일 접근이
차단된 뒤에도 계속 들어올 수 있다. 그래서 그런 계정에는 안내만 한다.

그런데 **"이 계정은 구글로 가입했습니다"를 요청 화면에 띄우면 안 된다.**
로그인하지 않은 아무나가 임의의 이메일로 두 가지를 알아낸다:

1. 그 이메일로 가입한 계정이 존재한다
2. 그 계정의 로그인 수단이 무엇인가

2번이 특히 나쁘다 — "이 사람은 비밀번호가 없으니 구글을 노려라"를 알려주는
셈이다. 그래서 같은 말을 **메일로** 한다. 메일을 읽는 사람은 이미 받은편지함을
통제하는 사람이라 열거가 성립하지 않는다.

같은 이유로 지키는 것들:

- 화면 토스트는 **항상** "등록된 이메일인 경우 재설정 링크가 발송되었습니다"
- `forgot-password` 응답은 세 경우 모두 `{ ok: true }`
- **응답 시간도 맞춘다**(`MIN_RESPONSE_MS = 700`). 메일 발송은 수백 ms가 걸리고
  "계정 없음"은 조회 한 번으로 끝나므로, 시간 차이만으로 존재 여부가 샌다.
- 오류가 나도 응답은 같다. 로그에만 남긴다.

형식 오류(`not-an-email`)만 400으로 즉시 거른다 — 계정 정보를 흘리지 않는다.

### 비밀번호 유무는 클라이언트가 알 수 없다

구글 계정에 재설정으로 비밀번호를 만들어도 `auth.identities`는 `["google"]`
그대로고 `app_metadata.providers`도 바뀌지 않는다(2026-08-31 실계정 확인).
그래서 `has_password()` RPC가 있다 — 불리언 하나만 돌려주는 SECURITY DEFINER
함수이며, 마이페이지의 "비밀번호 변경" 노출 여부를 이걸로 정한다.

---

## 기록과 시도 제한

`verify_jwt`를 끄면 Supabase의 인증 기반 레이트리밋 밖으로 나간다. 그 자리를
두 가지가 메운다.

| 대상 | 수단 | 한도 |
|---|---|---|
| `reset-password` | `claim_auth_attempt` | IP당 시간당 10회 |
| 구글 안내 메일 | `claim_recovery_notice` | 같은 주소로 60초에 한 번 |

**`auth_events`는 덧붙이기 전용이다.** 관리자만 읽고, 수정·삭제 권한은 아무에게도
없다 — 사건이 난 뒤 고쳐 쓸 수 있는 로그는 로그가 아니다. Edge Function 로그는
무료 플랜에서 하루면 사라지므로 근거가 되지 못한다.

기록되는 사건: `reset_succeeded` · `reset_failed`(stage 포함) · `reset_rate_limited`.

---

## 필요한 시크릿

| 이름 | 쓰임 | 없으면 |
|---|---|---|
| `RESEND_API_KEY` | 구글 계정 안내 메일 | 그 메일만 **안 나간다**(로그에만 남음) |
| `MAIL_FROM` | 발신자 | `JCar <onboarding@resend.dev>` |
| `SITE_URL` | 기본 주소 | `https://jcar-platform.vercel.app` |

`SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`는 런타임이 넣는다.
재설정 링크 메일은 Supabase가 보내므로 `RESEND_API_KEY` 없이도 동작한다.

```
https://supabase.com/dashboard/project/<ref>/settings/functions
```

## 배포

둘 다 `verify_jwt`를 꺼야 한다 — 로그인하지 못하는 사람이 부르는 기능이다.

```bash
npx supabase functions deploy forgot-password --project-ref <ref> --no-verify-jwt
npx supabase functions deploy reset-password  --project-ref <ref> --no-verify-jwt
```

**메일 템플릿과 화면은 함께 움직인다.** 템플릿이 `{{ .TokenHash }}`를 우리
페이지로 보내므로, 그 페이지가 없는 빌드가 운영에 있으면 링크가 갈 곳을 잃는다.
템플릿을 바꾸기 전에 웹을 먼저 배포할 것.

복구 템플릿의 링크:

```
{{ .SiteURL }}/reset?token_hash={{ .TokenHash }}&type=recovery
```

## 발송 한도

커스텀 SMTP(Resend) 연결 후 프로젝트 메일 한도는 시간당 **30통**이다(내장은 2통).
안내 메일은 Resend API로 직접 나가므로 이 한도 밖이다.

## 남은 제약

**발신 주소가 `onboarding@resend.dev`(Resend 샌드박스)라 계정 소유자에게만
배달된다.** 실사용자에게 보내려면 도메인을 등록하고 SPF·DKIM·DMARC를 세운 뒤
`MAIL_FROM`과 Auth의 Sender를 그 도메인으로 바꿔야 한다(ISSUE-01).

**앱에서는 링크가 웹으로 열린다.** App Links(`assetlinks.json` + 인텐트 필터)를
붙이면 앱으로 열 수 있지만 네이티브 변경이라 스토어 빌드가 필요하고, 앱 쪽
딥링크 처리도 따로 짜야 한다(`lib/resetLink.js`는 웹에서만 동작한다).
