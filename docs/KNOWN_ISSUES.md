# 알려진 미해결 이슈

> 발견됐으나 아직 처리하지 않은 항목. 처리되면 취소선 + ✅로 표시하고 커밋 해시를 남긴다.
> 형제 프로젝트(Taxitogether)의 `docs/KNOWN_ISSUES.md` 운영 방식을 따른다.

---

## ~~[ISSUE-01] 비밀번호 재설정 웹 페이지에서 `setSession` 실패~~ ✅

**발견**: 2026-08-15 · **해결**: 2026-09-06 (`04fc507`) · **남은 것**: 발신 도메인

### 무엇이었나

`web/auth/reset-password.html`이 유효한 복구 토큰을 받고도 세션을 잡지 못했다.
원인은 `setSession`이 아니었다 — `detectSessionInUrl: true`가 프래그먼트를 먼저
소비하고 `PASSWORD_RECOVERY`를 쏘므로 수동 호출이 애초에 필요 없었다.

진짜 문제는 그 링크가 **정식 세션을 만든다**는 것이었다. 재설정 링크가 사실상
로그인 링크였고, 메일함을 잠깐 본 사람이 비밀번호를 모른 채 앱에 들어올 수 있었다.

### 어떻게 해결했나

처음에는 그 세션을 화면 단에서 가두는 게이트를 만들었다(`8ae9395` → `91bb788`
→ `8836346`). URL 프래그먼트 · `PASSWORD_RECOVERY` 이벤트 · AsyncStorage 표시를
짜맞춰 "복구 세션인가"를 추론하는 방식이었고, **세 신호 모두에서 버그가 났다**:
구독보다 먼저 지나가는 이벤트, 새로고침에 열리는 게이트, 만료가 없어 재설정을
포기한 기기가 영구히 갇히는 표시.

무엇보다 그 게이트는 **화면만 가릴 뿐 API 호출은 막지 못했다.** RLS는 복구
세션을 일반 세션과 구분하지 않으므로 콘솔에서 데이터를 그냥 읽을 수 있었다.
가격을 RLS로 지킨다는 이 프로젝트의 원칙이 여기에만 적용되지 않고 있었다.

그래서 **세션을 아예 만들지 않는 구조**로 다시 짰다. 메일 링크가
`{{ .TokenHash }}`를 쿼리로 실어 우리 페이지로 오고(`detectSessionInUrl`은
프래그먼트만 본다), 검증·비밀번호 변경·전 세션 해제가 Edge Function 안에서
한 번에 끝난다. 브라우저는 토큰을 쥐지 않는다.

게이트 코드는 전부 삭제됐다 — `recoveryMode` · `exitRecoveryMode` ·
AsyncStorage 표시 · `hadRecoveryLinkOnLoad`. 자세한 내용은 `docs/PASSWORD_RECOVERY.md`.

### 아직 실사용 검증이 안 됐다

서버 종단 시험(정상·만료·재사용·약한 비밀번호·형태 오류)은 전부 통과했지만,
**사람이 실제 메일 링크로 통과해본 적은 없다.** 다음에 손댈 때 먼저 확인할 것.

### 남은 것 — 발신 도메인

발신 주소가 `onboarding@resend.dev`(Resend 샌드박스)라 **Resend 계정 소유자에게만**
배달된다. 실사용자는 비밀번호를 잃어버리면 여전히 복구 수단이 없다.

→ 도메인을 등록하고 DNS에 SPF·DKIM·DMARC를 넣은 뒤 발신 주소를
`support@<도메인>`으로 바꾼다. Gmail 주소는 발신자로 쓸 수 없고
(남의 도메인이라 SPF/DKIM을 세울 수 없다), `jcar-platform.vercel.app`도
Vercel 소유라 같은 이유로 불가능하다. **공개 출시 전 필수 항목이다.**

---

## [ISSUE-02] 이메일 인증이 비활성 상태 🟡

**상태**: 의도적 비활성 · **영향**: 아무 이메일로나 가입 가능

`mailer_autoconfirm=true`로 꺼둔 상태다. SMTP 미설정 + `site_url`이 `localhost:3000`이라
인증을 켜면 아무도 로그인할 수 없어 부득이하게 껐다(2026-08-15).

**해제 조건**: ~~Vercel 배포 후 → `site_url`을 실제 도메인으로 변경~~ → 인증 재활성화.
SMTP는 초기엔 기본 메일러로도 가능(시간당 제한 있음).

2026-08-16 갱신: 배포와 `site_url` 설정은 끝났다(`https://jcar-platform.vercel.app`).

2026-09-06 갱신: 커스텀 SMTP(Resend)를 붙였고 확인 메일 템플릿도 한글로 바꿔뒀다.
인프라 조건은 갖춰졌지만 **지금 켜는 것은 권하지 않는다**:

- JCar는 이미 **가입 승인제**다. 관리자가 사람 눈으로 거르는 관문이 있는데
  그 앞에 자동 관문을 하나 더 세우면, 얻는 건 "이메일이 실재한다" 하나이고
  잃는 건 가입 이탈이다.
- 켜는 순간 **가입 1건이 메일 1통을 먹는다.** 시간당 30통 한도를 재설정 메일과
  나눠 쓰게 된다.
- 발신 주소가 아직 Resend 샌드박스라 실사용자에게 배달되지 않는다(ISSUE-01).

**해제 조건**: 발신 도메인 확보 → 운영 안정화 → 그다음. 되돌리기 전에 실제
계정으로 가입 → 메일 수신 → 링크 클릭까지 한 번 통과시킬 것. 이전에 인프라
없이 켰다가 전원 로그인 불가 상태를 만든 적이 있다.

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

---

## [ISSUE-08] 복구 세션을 RLS가 구분하지 못한다 🟢

**발견**: 2026-09-01 · **상태**: 현재 구조에서는 발생하지 않음 · **영향**: 향후 회귀 방지

ISSUE-01을 재설계하며 드러난 사실을 기록해 둔다.

**RLS 정책 어디에도 "이 세션이 어떻게 만들어졌는가"를 보는 곳이 없다.** 토큰의
`amr` 클레임(`[{method:'otp',...}]` — 2026-09-01 실측)이 메일 링크로 만들어진
세션임을 알려주지만, 정책은 `auth.uid()`만 본다.

지금은 재설정 과정에서 세션을 만들지 않으므로 문제가 되지 않는다. 다만
**앞으로 메일 링크로 세션을 만드는 기능을 추가한다면**(매직링크 로그인 등)
이 구멍이 되살아난다. 그때는 화면에서 가리지 말고 RLS가
`auth.jwt()->>'amr'`을 보게 해야 한다.

`amr`로 복구 세션을 판별하려는 시도는 접었다. `otp`가 복구를 뜻하는 것은
JCar에 다른 OTP 경로가 없기 때문이고, 매직링크나 전화 인증을 붙이는 순간
그 가정이 조용히 깨진다.

---
