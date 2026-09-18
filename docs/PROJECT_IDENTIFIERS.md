# 프로젝트 식별자 정리 (혼동 방지)

> JCar는 패키지 이름 · Firebase 프로젝트 · 옛 프로젝트 · Supabase · Expo · Vercel이
> 이름이 비슷하거나 여러 개라 어느 것이 진짜인지 헷갈리기 쉽다. 아래는 **실제 코드/설정
> 파일에서 검증한 값만** 정리한 것이다. (근거 파일 명시)

## 한눈에

| 항목 | 값 | 근거 |
|---|---|---|
| 앱 패키지 (Android, 운영) | `com.jcarnew` | `app.config.js` |
| 앱 패키지 (Android, dev) | `com.jcarnew.dev` | `app.config.js` (APP_VARIANT=development) |
| iOS bundle id | `com.jcarnew` | `app.config.js` |
| 앱 이름 / slug | `J-Car` / `jcar` | `app.config.js` |
| **Firebase/GCP 프로젝트 (현재)** | **`jcar-3e090`** (프로젝트 번호 `135120379076`) | `google-services.json`, 서비스계정 |
| Firebase Storage 버킷 | `jcar-3e090.firebasestorage.app` | `google-services.json` |
| **Supabase 프로젝트 (DB/Auth/Storage/Edge)** | `thorgkxpbhsttgskhepu` | `…thorgkxpbhsttgskhepu.supabase.co` |
| Expo/EAS 프로젝트 id | `de9da75a-473d-4d05-9108-42a36bc8221d` | `app.config.js` extra.eas / updates.url |
| OTA update URL | `https://u.expo.dev/de9da75a-…` | `app.config.js` |
| 웹 배포 (Vercel) | `jcar-platform.vercel.app` | CLAUDE.md |
| **옛(레거시) Firebase — 사용 안 함** | `jcarnew-696b6` | `docs/KNOWN_ISSUES.md` (2025 레거시 데이터) |

## 역할 분담 (하이브리드 구조)

- **Supabase** (`thorgkxpbhsttgskhepu`) = 실제 백엔드 — Postgres/RLS, Auth, Storage, Edge Functions.
- **Firebase** (`jcar-3e090`) = **FCM · Crashlytics · Analytics 만**. 추가로 **구글 로그인용 OAuth 클라이언트**가 이 프로젝트에 있다.
- **Vercel** = 웹(Expo web export) 호스팅.
- **Play Console** 업로드 = 서비스계정 `play-publisher@jcar-3e090.iam.gserviceaccount.com`.

## 구글 로그인 OAuth 클라이언트 (프로젝트 jcar-3e090)

`google-services.json`의 `oauth_client`로 검증됨:

- **Android 클라이언트 4개** (`client_type: 1`) — 서명 인증서(SHA-1)별로 하나씩. `135120379076-5hc1…` / `-krvf…` / `-l391…` / `-oisf…`
- **웹 클라이언트 1개** (`client_type: 3`, 유형 "웹 애플리케이션") =
  `135120379076-e5bqh6jab60hrriviusduk66m8iq76u5.apps.googleusercontent.com`
  - 코드: [`src/services/auth/googleAuth.js`](../src/services/auth/googleAuth.js)가 이 **웹 클라이언트 ID**를 serverClientId로 사용 (Google Sign-In 표준: 네이티브 ID토큰 교환과 웹 OAuth가 같은 웹 클라이언트를 공유).
  - **웹 구글 로그인**은 이 웹 클라이언트의 **secret**이 Supabase Google provider에 등록돼야 동작한다 → 절차는 `docs/KNOWN_ISSUES.md` **ISSUE-04**.

## 흔한 혼동 포인트 (읽고 넘어갈 것)

- **패키지 이름 `com.jcarnew` ≠ 프로젝트.** 옛 Firebase 프로젝트 `jcarnew-696b6`과 철자가 비슷하지만 **완전히 무관**하다. (이름이 닮아 헷갈리는 대표 함정.)
- `jcar-3e090`은 "패키지"가 아니라 **프로젝트 ID**다.
- OAuth 클라이언트 ID 앞자리 `135120379076` = **프로젝트 번호**(= jcar-3e090). 어떤 OAuth 클라이언트가 어느 프로젝트 소속인지는 **이 번호로 판별**한다. (`google-services.json`의 `project_number`와 일치.)
- **DB/Auth는 Supabase지만, 구글 로그인 OAuth 클라이언트는 Firebase(jcar-3e090) 것을 재사용**하는 게 정상 구성이다. Supabase 프로젝트 안에 OAuth 클라이언트가 따로 있는 게 아니다.
- `jcarnew-696b6`은 현재 `google-services.json`·`app.config.js` **어디에도 없다** → 지금 빌드/런타임에 쓰이지 않는다.

## 관련 문서
- 웹 구글 로그인 secret 등록 절차 → `docs/KNOWN_ISSUES.md` (ISSUE-04)
- 안드로이드 릴리스/서명 → `docs/ANDROID_RELEASE.md`
- OTA vs 스토어 빌드 → `docs/OTA_UPDATES.md`

---
_검증 근거: `app.config.js`, `google-services.json`(project_number 135120379076 / project_id jcar-3e090 / 웹 클라이언트 type 3), Google Cloud Console 사용자 인증 정보 화면(서비스계정 @jcar-3e090), `src/services/auth/googleAuth.js`. 2026-09._
