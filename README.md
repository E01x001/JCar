# JCar

중고차 거래·상담 플랫폼. **Expo(SDK 57)** 한 코드베이스로 **Android와 웹**을 함께 낸다.

- 운영 웹: <https://jcar-platform.vercel.app>
- Android 패키지: `com.jcarnew` (Play 내부 테스트)

## 구성

| | |
|---|---|
| 앱 | Expo SDK 57 · React Native 0.86 · React 19 |
| 백엔드 | Supabase — Postgres/RLS · Auth · Storage · Edge Functions · Realtime |
| 푸시·텔레메트리 | Firebase — FCM · Crashlytics · Analytics **만** (의도된 하이브리드) |
| 상태 | Context(Auth·Loading·Theme) + zustand(vehicle·consultation) |

네이티브 프로젝트(`android/`)는 `app.config.js`로부터 **생성된다**(CNG).
직접 고치면 다음 `expo prebuild`에서 사라진다.

## 시작하기

```bash
npm install
npm start          # Expo 개발 서버
npm run web        # 웹으로 실행
npm run android    # 네이티브 개발 빌드 (Android Studio 필요)
```

Node 18 이상, Java 17 이상이 필요하다.

**자격증명은 저장소에 없다.** `google-services.json`, `.native-secrets/`,
`.supabase-access-token`, `play-service-account.json` 등은 전부 gitignore 대상이다.
외부 API 키(CarZen 등)는 클라이언트가 아니라 **Supabase Edge Function의 시크릿**에 있다 —
앱 번들에 키가 들어가지 않는다.

## 검사

```bash
npm test           # Jest (jest-expo)
npm run lint       # ESLint
```

husky pre-commit이 `eslint --fix`와 관련 테스트를 돌린다.

## 배포

**변경이 JS뿐인지 네이티브까지인지 먼저 판단한다.** 틀리면 조용히 실패한다.

```bash
# JS만 바뀐 경우 — 스토어 심사 없이 즉시
npm run update:preview -- --message "무엇을 고쳤는지"

# 네이티브가 바뀐 경우 — version/versionCode를 올린 뒤
npm run build:preview
node scripts/publish-internal.mjs --notes "..."
```

자세한 건 [docs/OTA_UPDATES.md](docs/OTA_UPDATES.md)와
[docs/ANDROID_RELEASE.md](docs/ANDROID_RELEASE.md).

웹은 `main`에 푸시하면 Vercel이 자동 배포한다.

## 지켜야 하는 것

**차량 가격은 관리자에게만 보인다.** 가격은 `vehicle_pricing` 테이블에 있고 RLS가
관리자에게만 연다. 일반 사용자 화면에는 어떤 경로로도 가격을 렌더링하지 않고
"상담 후 안내"를 보여준다. 이건 컴포넌트가 아니라 **DB가 강제한다.**

**실사진 1장 이상이 없으면 매물이 노출되지 않는다.** 이것도 RLS 조건이다.

**차량·거래 기록은 삭제하지 않는다.** 회원 탈퇴 시 사람은 지우되 기록은 남긴다
([docs/ACCOUNT_DELETION.md](docs/ACCOUNT_DELETION.md)).

## 문서

| | |
|---|---|
| [CLAUDE.md](CLAUDE.md) | 아키텍처·규약·작업 지침 (에이전트 자동 로드) |
| [docs/OTA_UPDATES.md](docs/OTA_UPDATES.md) | OTA vs 스토어 빌드, 채널, 롤백 |
| [docs/ANDROID_RELEASE.md](docs/ANDROID_RELEASE.md) | 릴리스 빌드·서명·Play 업로드 |
| [docs/DEAL_LIFECYCLE.md](docs/DEAL_LIFECYCLE.md) | 등록 → 상담 → 체결 → 명의이전 |
| [docs/VEHICLE_LOOKUP.md](docs/VEHICLE_LOOKUP.md) | 차량 조회 API — 필드 대응, 조회처 교체 |
| [docs/ACCOUNT_DELETION.md](docs/ACCOUNT_DELETION.md) | 탈퇴·익명화 정책 |
| [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) | 미해결 이슈 — **작업 전 확인** |
