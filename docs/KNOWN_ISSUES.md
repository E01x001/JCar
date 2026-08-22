# 알려진 미해결 이슈

> 발견됐으나 아직 처리하지 않은 항목. 처리되면 취소선 + ✅로 표시하고 커밋 해시를 남긴다.
> 형제 프로젝트(Taxitogether)의 `docs/KNOWN_ISSUES.md` 운영 방식을 따른다.

---

## [ISSUE-01] 비밀번호 재설정 웹 페이지에서 `setSession` 실패 🟡

**발견**: 2026-08-15 · **상태**: 미해결(보류) · **영향**: 비밀번호 재설정 플로우 전체

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
