# 비밀번호 찾기

로그인하지 못하는 사람이 다시 들어오는 경로. 계정 종류에 따라 **다른 메일**이 나가고,
그 차이는 **요청자에게 보이지 않는다.**

```
ForgotPasswordScreen
  └─ supabase.functions.invoke('forgot-password')   ← verify_jwt 꺼짐
       ├─ lookup_recovery_target(email)             ← service_role 전용 RPC
       ├─ 비밀번호 있음  → resetPasswordForEmail    → 재설정 링크 메일
       ├─ 구글 전용      → claim_recovery_notice
       │                   → Resend API             → "구글로 로그인" 안내 메일
       └─ 계정 없음      → 아무것도 하지 않음
```

세 갈래 모두 `{ ok: true }`를 같은 시간에 돌려준다.

---

## 왜 이렇게 나눴나

**구글 전용 계정에 재설정 링크를 보내면 안 된다.** 그 사람이 링크를 눌러 비밀번호를
정하면, 구글 계정에 더 약한 자격증명이 하나 붙는다. 구글 쪽 2단계 인증은 이 비밀번호에
적용되지 않으므로, 받은편지함에 잠깐 접근한 사람이 비밀번호를 심어두고 메일 접근이
차단된 뒤에도 계속 들어올 수 있다.

2026-08-31 실계정으로 확인한 것: 구글 계정에 재설정으로 비밀번호를 만들어도
`auth.identities`는 `["google"]` 그대로이고 `app_metadata.providers`도 바뀌지 않는다.
**즉 클라이언트는 비밀번호 유무를 알 수 없다.** `has_password()` RPC가 그래서 있다.

## 왜 요청 화면에서 알려주지 않나

"이 계정은 구글로 가입했습니다"를 **재설정 요청 화면에** 띄우면, 로그인하지 않은
아무나가 임의의 이메일을 넣어 두 가지를 알아낸다:

1. 그 이메일로 가입한 계정이 존재한다
2. 그 계정의 로그인 수단이 무엇인가

2번이 특히 나쁘다 — "이 사람은 비밀번호가 없으니 구글을 노려라"를 알려주는 셈이다.
그래서 **같은 말을 메일로 한다.** 메일을 읽는 사람은 이미 받은편지함을 통제하는
사람이라 열거가 성립하지 않는다.

같은 이유로 지키는 것들:

- 화면 토스트는 **항상** "등록된 이메일인 경우 재설정 링크가 발송되었습니다"
- Edge Function 응답은 세 경우 모두 `{ ok: true }`
- **응답 시간도 맞춘다**(`MIN_RESPONSE_MS = 700`). 메일 발송은 수백 ms가 걸리고
  "계정 없음"은 조회 한 번으로 끝나므로, 시간 차이만으로 존재 여부가 새어 나간다.
- 오류가 나도 응답은 같다. 로그에만 남긴다.

형식 오류(`not-an-email`)만 400으로 즉시 거른다 — 계정 정보를 흘리지 않는다.

## redirectTo는 클라이언트를 믿지 않는다

요청 본문의 `redirectTo`를 그대로 넘기면 오픈 리다이렉트가 된다. 남의 이메일로
재설정을 요청하면서 자기 서버를 넣으면 복구 토큰이 그리로 간다.
`safeRedirect()`가 허용목록으로 거르고, 벗어나면 `SITE_URL`로 되돌린다.

```
https://jcar-platform.vercel.app
http://localhost[:포트]            ← 로컬 개발
```

---

## 필요한 시크릿

| 이름 | 쓰임 | 없으면 |
|---|---|---|
| `RESEND_API_KEY` | 안내 메일 직접 발송 | 구글 계정 안내 메일이 **안 나간다**(로그에만 남음) |
| `MAIL_FROM` | 발신자 | `JCar <onboarding@resend.dev>` |
| `SITE_URL` | 링크 기본 주소 | `https://jcar-platform.vercel.app` |

`SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY`는 Edge Function 런타임이 자동으로 넣는다.

```
https://supabase.com/dashboard/project/<ref>/settings/functions
```

재설정 링크 메일은 Supabase가 보내므로 `RESEND_API_KEY` 없이도 동작한다.
**안내 메일만 이 키에 의존한다.**

## 배포

`verify_jwt`를 반드시 꺼야 한다 — 로그인하지 못하는 사람이 부르는 기능이다.

```bash
npx supabase functions deploy forgot-password \
  --project-ref <ref> --no-verify-jwt
```

끄는 대신 잃는 보호가 있으므로(아무나 호출할 수 있다) 그 자리를 두 가지가 메운다:
`claim_recovery_notice`의 60초 간격 제한, 그리고 재설정 경로에 걸리는 Supabase 자체
메일 레이트리밋.

## 발송 한도

커스텀 SMTP(Resend)를 붙인 뒤 프로젝트 메일 한도는 시간당 **30통**이다(내장은 2통).
안내 메일은 Resend API로 직접 나가므로 이 한도 밖이고, 대신
`recovery_notice_log`가 같은 주소로 60초 안에 두 번 나가지 않게 막는다.

## 남은 제약

발신 주소가 `onboarding@resend.dev`(Resend 샌드박스)라 **Resend 계정 소유자에게만**
배달된다. 실사용자에게 보내려면 도메인을 등록하고 SPF·DKIM·DMARC를 세운 뒤
`MAIL_FROM`과 Auth의 Sender를 그 도메인으로 바꿔야 한다(ISSUE-01).
