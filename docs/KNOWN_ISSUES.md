# 알려진 미해결 이슈

> 발견됐으나 아직 처리하지 않은 항목. 처리되면 취소선 + ✅로 표시하고 커밋 해시를 남긴다.
> 형제 프로젝트(Taxitogether)의 `docs/KNOWN_ISSUES.md` 운영 방식을 따른다.

---

## [ISSUE-01] 비밀번호 재설정 웹 페이지에서 `setSession` 실패 🟡

**발견**: 2026-08-15 · **상태**: 코드 해결 · 발신 도메인 대기 · **영향**: 비밀번호 재설정 플로우 전체

### 증상
`web/auth/reset-password.html`에 **유효한 복구 토큰을 실어 접속해도** 세션 확보에 실패하고
"세션을 확인하지 못했습니다"가 표시된다. 비밀번호 변경 폼까지 도달하지 못한다.

### 재현 방법
```bash
# 1. 복구 링크 발급 (redirect_to는 반드시 최상위 — options 안에 넣으면 무시됨)
curl -X POST "https://<ref>.supabase.co/auth/v1/admin/generate_link" \
  -H "apikey: $SERVICE_ROLE" -H "Authorization: Bearer $SERVICE_ROLE" \
  -d '{"type":"recovery","email":"<test>","redirect_to":"http://localhost:4321/auth/reset-password.html"}'

# 2. 정적 서버 기동
cd web && python -m http.server 4321

# 3. 발급된 action_link를 curl로 따라가 Location 헤더의 토큰을 얻어
#    브라우저로 http://localhost:4321/auth/reset-password.html#access_token=...&refresh_token=... 접속
```

### 확인된 사실
- 리디렉트는 **정상 도달**하며 `#access_token`·`refresh_token`·`type=recovery`가 모두 실려 온다
  (브라우저에서 해시 파싱 결과로 확인: `hasAccess: true`, `hasRefresh: true`)
- 페이지의 분기 로직은 정상 — 토큰이 없을 때/오류일 때 각각 올바른 안내를 낸다
- 콘솔 에러는 잡히지 않았다(브라우저 도구에서 로그 0건)
- 즉 **`supabase.auth.setSession()` 호출 자체가 error를 반환**하는 것으로 보이나 원인 미확인

### 의심 지점 (미검증)
1. 복구 링크는 **일회용**이라, 토큰 획득을 위해 `curl`로 먼저 따라간 시점에 소비됐을 가능성
   → 브라우저에서 **직접** 링크를 클릭하는 방식으로 재현해야 정확함
2. 클라이언트 옵션 `persistSession: false` + `detectSessionInUrl: false` 조합의 영향
3. `refresh_token`이 짧은 형식(`5l2jkjfnq4mx`)인데 이것이 정상인지 확인 필요

### 다음 단계
- `setSession` 반환 `error` 객체를 화면/콘솔에 그대로 출력하도록 임시 계측 후 재현
- 브라우저에서 링크를 직접 클릭하는 경로로 재현(일회용 토큰 소비 문제 배제)
- 그래도 실패하면 `detectSessionInUrl: true`로 두고 supabase-js가 자체 처리하도록 변경 검토

### 참고
- **Supabase 리디렉트 허용목록**: `uri_allow_list`에 없는 주소는 조용히 `site_url`로 대체된다.
  현재 등록: `https://jcar-platform.vercel.app/**`, preview 와일드카드,
  `jcar://**`, `http://localhost:8081/**`, `http://localhost:4173/**`.

### 2026-08-16 갱신 — 전제가 바뀌었다
Expo 이전 + 웹앱 전환으로 **정적 사이트 `web/`을 삭제**했다.
따라서 위 재현 절차의 `web/auth/reset-password.html`은 더 이상 존재하지 않으며,
이 이슈는 "그 파일을 고치는 문제"가 아니라 **재설정 화면을 앱 안에 다시 만드는 문제**가 됐다.

한편 원인 후보 2번(`detectSessionInUrl: false`)은 웹에서 이미 `true`로 바뀌었다
(`src/lib/supabase.js`, 구글 OAuth 복귀 처리를 위해). 인증 콜백은 이 경로로
SPA 루트에서 자동 처리되므로, 재설정도 같은 방식으로 세션을 회수한 뒤
새 비밀번호 입력 화면만 띄우면 될 가능성이 높다. 즉 `setSession` 수동 호출 자체가
불필요해질 수 있어, 재구현 시 원래 증상이 재현되지 않을 수도 있다.

### 2026-08-31 갱신 — 재설정 화면 구현 (코드 완료, SMTP 대기)

추측이 맞았다. `detectSessionInUrl: true`가 프래그먼트를 소비하며
`PASSWORD_RECOVERY`를 쏘므로 `setSession` 수동 호출은 필요 없었다. 다만 그
이벤트가 **정식 세션을 만든다**는 점이 진짜 문제였다 — 재설정 링크가 사실상
로그인 링크였고, 링크를 눌러도 비밀번호를 바꿀 화면이 없었다.

구현한 것:

- `ResetPasswordScreen` — 게이트가 띄운다. `recoveryMode`인 동안 AppNavigator는
  이 화면 하나만 렌더한다(프로필 완성 게이트보다 **앞**). 나가는 길은 비밀번호를
  바꾸거나 로그아웃하거나 둘뿐이다.
- `ChangePasswordScreen` — 마이페이지. **현재 비밀번호 재인증 필수**(열린 기기를
  주운 사람이 계정을 가져가지 못하게). 구글 전용 계정에는 항목이 보이지 않는다.
- 변경 성공 시 **다른 기기 세션 전부 해제**(`signOut({scope:'others'})`).
- `redirectTo`를 웹 주소로 고정 — 폰에서 요청하고 PC에서 메일을 여는 경우를
  깨뜨리지 않는다. 앱으로 되돌리려면 App Links(assetlinks.json)가 필요하고
  그건 네이티브 작업이다.
- 비밀번호 규칙을 `src/utils/password.js` 한 곳으로 모았다(가입 화면에 인라인으로
  있던 정규식이 세 벌이 될 참이었다).

**경쟁 조건 주의**: `PASSWORD_RECOVERY`는 supabase-js `_initialize()` 안에서
발생하고 그 직후 프래그먼트가 지워진다. React가 구독을 붙이기 전에 지나갈 수
있어서, 이벤트에만 기대면 게이트가 조용히 열리지 않는다. 그래서
`hadRecoveryLinkOnLoad()`가 모듈 로드 시점에 URL을 동기로 한 번 더 본다.

### 2026-08-31 갱신 — SMTP 연결, 샌드박스 주소 한계만 남음

`smtp.resend.com:465`을 Auth 설정에 붙였다. 붙이는 즉시 **시간당 발송 한도가
2 → 30으로 올랐다**(내장 메일에서 벗어났다는 신호다).

같이 처리한 것:

- 인증 메일 5종을 한글 템플릿으로 교체(재설정 · 비밀번호 변경 알림 ·
  가입 확인 · 이메일 변경 · 이메일 변경 알림). 그전까지 한국어 앱이
  "Reset your password"라는 영문 기본 템플릿을 보내고 있었다.
- **비밀번호 변경 알림을 켰다**(`mailer_notifications_password_changed_enabled`).
  변경 성공 시 우리가 다른 기기 세션을 전부 끊기 때문에, 계정을 빼앗긴 사람
  입장에서는 아무 설명 없이 로그아웃당한다. 그 사실을 알리는 유일한 채널이다.
- 서버 `password_min_length`를 6 → 8로 올려 앱 규칙과 맞췄다.

**남은 한계: 발신 주소가 `onboarding@resend.dev`(Resend 샌드박스)다.**
이 주소는 **Resend 계정 소유자 본인에게만** 배달된다. 즉 재설정 흐름을 실제
메일로 검증할 수는 있지만, 다른 사용자에게는 여전히 도달하지 않는다.

→ 풀려면 **소유한 도메인**이 필요하다. Resend에 도메인을 등록하고 DNS에
SPF · DKIM · DMARC를 넣은 뒤 발신 주소를 `support@<도메인>`으로 바꾼다.
Gmail 주소는 발신자로 쓸 수 없다(남의 도메인이라 SPF/DKIM을 세울 수 없고,
수신 측이 스푸핑으로 판단한다). `jcar-platform.vercel.app`도 Vercel 소유라
DNS 레코드를 넣을 수 없어 같은 이유로 불가능하다.

**공개 출시 전 필수 항목이다.** 도메인이 없으면 실사용자는 비밀번호를 잃어버린
순간 복구 수단이 없다.

---

## [ISSUE-02] 이메일 인증이 비활성 상태 🟡

**상태**: 의도적 비활성 · **영향**: 아무 이메일로나 가입 가능

`mailer_autoconfirm=true`로 꺼둔 상태다. SMTP 미설정 + `site_url`이 `localhost:3000`이라
인증을 켜면 아무도 로그인할 수 없어 부득이하게 껐다(2026-08-15).

**해제 조건**: ~~Vercel 배포 후 → `site_url`을 실제 도메인으로 변경~~ → 인증 재활성화.
SMTP는 초기엔 기본 메일러로도 가능(시간당 제한 있음).

2026-08-16 갱신: 배포와 `site_url` 설정은 끝났다(`https://jcar-platform.vercel.app`).
남은 건 `mailer_autoconfirm=false`로 되돌리는 것뿐이다. 되돌리기 전에 실제 계정으로
가입 → 메일 수신 → 링크 클릭까지 한 번 통과시켜야 한다. 이전에 인프라 없이 켰다가
전원 로그인 불가 상태를 만든 적이 있다.

---

## [ISSUE-03] 전화번호 인증 미구현 🟢

형식 검증(`^01[0-9]{8,9}$`)과 중복 방지(UNIQUE)만 있고 **실제 소유 인증은 없다.**
CLAUDE.md에 "Firebase Phone Auth" 서술이 남아 있으나 사실과 다르다 — 문서 정정 필요.

선택지: (A) 현행 유지 (B) SMS OTP(건당 과금) (C) 카카오싱크로 검증된 번호 수신(사업자등록 보유).
형제 프로젝트도 OTP 화면까지 만들어두고 **비용 때문에 비활성**한 상태다.

---

## [ISSUE-04] 웹 구글 로그인 — OAuth secret 미설정 🟡

**발견**: 2026-08-16 · **상태**: 보류(사용자 조치 대기) · **영향**: 웹에서 구글 로그인 불가

### 증상
배포된 웹에서 "Google로 계속하기"를 누르면 Supabase authorize 엔드포인트가 400을 반환한다.

```json
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: missing OAuth secret"}
```

### 원인
네이티브는 Play 서비스 SDK가 받은 ID 토큰을 교환하므로(`signInWithIdToken`)
**client ID만** 있으면 된다. 웹은 리다이렉트 기반 OAuth(`signInWithOAuth`)라
Supabase가 구글과 직접 토큰 교환을 하며 **client secret이 필수**다.
현재 Supabase Google provider에는 client ID만 등록돼 있다.

### 확인된 사실
- 리다이렉트 자체는 정상 — `redirect_to=https://jcar-platform.vercel.app`가 그대로 전달된다
  (allow list 등록이 유효하다는 뜻)
- 플랫폼 분리(`googleAuth.js` / `.web.js`)는 정상 동작 — 웹이 네이티브 SDK 경로를 타지 않는다
- **네이티브 구글 로그인은 이 이슈와 무관하다**

### 해제 절차
1. Google Cloud Console → API 및 서비스 → 사용자 인증 정보
2. 웹 애플리케이션 클라이언트(`135120379076-e5bqh6...`)의 **클라이언트 보안 비밀번호** 확인
   (없으면 생성)
3. 같은 클라이언트의 **승인된 리디렉션 URI**에 추가:
   `https://thorgkxpbhsttgskhepu.supabase.co/auth/v1/callback`
4. Supabase 대시보드 → Authentication → Providers → Google에 secret 입력

secret은 자격증명이므로 저장소·마이그레이션·클라이언트 코드에 두지 않는다. 대시보드에서만 입력한다.

---

## [ISSUE-05] 가입 승인 시 사용자에게 알릴 방법이 없다 🟢

**발견**: 2026-08-23 · **상태**: 보류(테스터 수 증가 시 처리) · **영향**: 승인 대기자의 재로그인 시점

### 증상
관리자가 사용자 관리 화면에서 `pending` 계정을 승인해도 **당사자에게 아무 통지가 가지 않는다.**
사용자는 직접 다시 로그인해봐야 승인된 것을 안다.

### 원인
`AuthContext.applySession`이 차단 상태를 감지하면 **FCM 토큰을 저장하기 전에** 로그아웃시킨다.

```js
const isBlocked = profile?.status === 'suspended'
  || profile?.status === 'pending'
  || profile?.account_status === 'pending_deletion';
if (isBlocked) { await signOutUser(); ... return; }   // ← 여기서 반환
...
saveFcmToken(authUser.id).catch(() => {});             // ← 여기까지 오지 못한다
```

즉 `pending` 계정에는 **저장된 FCM 토큰이 존재하지 않아** 승인 푸시를 보낼 대상이 없다.

### 현재 완화
로그아웃 시 안내를 정지와 구분해 띄운다 — "관리자 승인 후 이용할 수 있습니다.
승인되면 다시 로그인해주세요." 테스터가 소수인 단계에서는 별도 연락으로 대체 가능하다.

### 해제 절차 (미결정 사항 포함)
1. `pending`에 한해 로그아웃 **직전에** 토큰을 저장한다.
   - 판단 필요: 정지(`suspended`)·삭제대기와 같은 취급을 할 것인가?
     정지 계정에 토큰을 남기는 것은 바람직하지 않으므로 `pending`만 예외로 두는 편이 맞다.
2. `profiles.status`가 `pending → active`로 바뀔 때 `notifications`에 행을 넣는 트리거 추가.
   (알림 허브에 넣으면 푸시 디스패치는 기존 경로가 처리한다)
3. 알림 종류 `signup_approved`를 `src/constants/notification.js`에 등록.

### 관련
- 가입 승인제 도입: `supabase/migrations/20260822140000_signup_approval_gate.sql`
- 승인 UI: `src/screens/AdminUserManagementScreen.js`

---

## [ISSUE-06] 관리자가 앱에 들어가지 못하면 승인 경로가 통째로 막힌다 🟡

**발견**: 2026-08-23 · **상태**: 운영 절차로 완화(코드 변경 없음) · **영향**: 가입 승인 전체

### 무슨 일이 있었나
가입 승인제 도입 직후 "관리자 계정이 하나도 없다"는 상황이 발생했다.
실제로는 `jinyong04@naver.com`이 `role=admin`·`status=active`로 멀쩡히 존재했으나
**`profile_completed = false`** 라 로그인하면 `AppNavigator`가 관리자 탭 대신
프로필 완성 화면으로 보낸다. 관리자에게도 예외를 두지 않기 때문이다.

```js
if (user && !profileCompleted) {          // ← 관리자도 여기서 걸린다
  return <Stack.Screen name="ProfileCompletion" ... />;
}
```

승인은 관리자 화면에서만 할 수 있으므로 **관리자가 앱에 못 들어가면 아무도
승인할 수 없다.** 승인제 도입으로 이 의존이 처음으로 치명적이 됐다.

### SQL 편집기에서 RPC가 막히는 것은 정상이다
```
ERROR: P0001: forbidden
HINT: 관리자만 사용할 수 있습니다.
CONTEXT: PL/pgSQL function public.allow_signup_email(text,text)
```
`allow_signup_email`은 `app_private.is_admin()`으로 호출자를 확인하는데,
SQL 편집기에는 `auth.uid()`가 없어 **판정 대상 자체가 없다.** 이 RPC는
앱의 관리자 세션 전용이다. 편집기용으로 완화해서는 안 된다.

### 비상 경로 (break-glass)
편집기는 이미 DB 전권을 가지므로 RPC를 거칠 이유가 없다.
`guard_profile_update`도 `auth.uid()`가 null이면 그대로 통과시킨다.

```sql
-- 대기 계정 승인
update public.profiles
   set status = 'active', status_updated_at = now()
 where email = '<주소>';

-- 봇 차단 (되돌릴 수 있다)
update public.profiles
   set status = 'suspended', status_updated_at = now()
 where email = '<주소>';

-- 관리자 지정
update public.profiles
   set role = 'admin', status_updated_at = now()
 where email = '<주소>';

-- 가입 전에 미리 허용 (가입 즉시 active로 들어온다)
insert into app_private.signup_allowlist (email, note)
values (lower('<주소>'), '<메모>')
on conflict (email) do nothing;
```

> 관리자로 지정해도 `profile_completed`가 false면 여전히 프로필 완성 화면에
> 걸린다. 앱에서 이름·전화번호를 입력해야 관리자 탭이 열린다.
> 전화번호는 UNIQUE라 DB에서 임의 값으로 채우면 나중에 실제 번호와 충돌한다.

### 근본 해결 (미결정)
관리자를 프로필 완성 게이팅에서 제외할지 여부. 현재는 "관리자도 연락처는
동일하게 필요하다"는 판단으로 예외를 두지 않았다(`AppNavigator` 주석 참고).
그 판단을 유지한다면 최소한 **관리자 최초 생성 시 프로필을 함께 채우는 절차**가
있어야 같은 일이 반복되지 않는다.

### 관련
- 가입 승인제: `supabase/migrations/20260822140000_signup_approval_gate.sql`
- 승인 UI: `src/screens/AdminUserManagementScreen.js`
- 승인 통지 부재: ISSUE-05

---

## [ISSUE-07] 차량 조회가 상위 조회처 오류로 실패한다 🔴

**발견**: 2026-08-28 · **상태**: 미해결 · **영향**: 차량 등록 전체(1단계에서 막힌다)

### 증상
`get-vehicle-info` 호출이 저장된 두 차량 모두에 대해 같은 응답을 준다.

```
자동차등록원부 발급 중 오류가 발생하였습니다.
```

### 확인된 사실
- **우리 쪽 검증은 통과한다.** 차량번호 형식 검사를 지나 CarZen까지 도달했고,
  CarZen이 자기 `errMsg`로 답한 것이다.
- **소유자명 불일치가 아니다.** 명세상 그 경우는 `errCode 6112 "소유자 정보가
  맞지 않습니다"`가 온다. `vehicle_private_contact.owner_name`에 저장된 실제
  소유자명으로 다시 조회해도 같은 오류가 났다.
- CarZen은 스크래핑 기반이고, 명세 7항이 "외부 시스템 기반이라 간헐적인 지연이나
  실패가 발생할 수 있다"고 적고 있다.

### 의심 지점 (미검증)
1. 상위(자동차민원 대국민포털) 일시 장애 — 그렇다면 시간이 해결한다
2. **개발계(Dev) 주소를 쓰고 있다.** 운영계는 `api.mydatahub.co.kr`이며,
   개발계가 제한적으로 동작할 가능성이 있다 (`docs/VEHICLE_LOOKUP.md` 참고)
3. 인증 토큰 만료 — 다만 그 경우 `STATUS 403`이 와야 한다

### 다음 단계
- 실제 차량으로 앱에서 등록을 시도해 재현 여부 확인
- 지속되면 운영계 주소로 전환하고 재시도
- 그래도 실패하면 기술지원 접수: <https://dataapi.co.kr/company/techqna/write.do>

### 곁가지 — 확인이 남은 것
저장된 두 차량은 `fuel_eco` · `fuel_tank` · `seats` · `battery` · `wiper_info`가
모두 비어 있다. 명세와 대조한 결과 **우리가 읽는 키 이름은 전부 맞다.** 따라서
조회처가 그 차량들에 대해 값을 안 준 것으로 보이지만, 두 차량 다 정규화 계층
이전(2026-08-23 `de2413c`)에 등록된 것이라 **현재 코드로 성공한 등록이 아직
한 건도 없다.** 조회가 되는 순간 등록 한 번이면 Edge Function 로그에 실제 키
목록이 찍히고 확정된다.

### 관련
- `docs/VEHICLE_LOOKUP.md` — 필드 대응표, 오류 구분, 운영 전환
- `supabase/functions/get-vehicle-info/providers/carzen.ts`
