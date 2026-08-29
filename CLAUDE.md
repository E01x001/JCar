# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JCar is an **Expo (SDK 57)** vehicle marketplace app targeting **Android and web** from one codebase.
Role-based auth separates regular users from administrators; features cover vehicle listings,
consultation booking, and admin management.

**Backend is Supabase** (Postgres + RLS, Auth, Storage, Edge Functions).
Firebase remains only for **FCM push, Crashlytics, and Analytics** — a deliberate hybrid.

**Hard rule — prices are admin-only.** Vehicle prices live in the `vehicle_pricing` table,
which RLS exposes to admins alone. Non-admin users must never see a price anywhere in the UI;
they see "상담 후 안내". This is enforced at the database level, not just in components.

## Development Commands

### Start Development Server
```bash
npm start          # expo start
npm run web        # expo start --web
```

### Build and Run
```bash
npm run android    # expo run:android (native dev build)
npm run prebuild   # expo prebuild — regenerate native projects (CNG)
```

Native projects are **generated** from `app.config.js`. Edit the config, not `android/` by hand —
`prebuild` will overwrite manual changes. `ios/` is intentionally absent (Android-first).

### Android 릴리스 — OTA인가 스토어 빌드인가

**변경 하나마다 이 판단을 먼저 한다.** 틀리면 조용히 실패한다(업데이트가 안 오거나,
적용된 뒤 죽는다). 자세한 내용은 `docs/OTA_UPDATES.md`.

| 바뀐 것 | 배포 |
|---|---|
| JS·화면·로직·문구·에셋 | **OTA** — 스토어 심사 없이 즉시 |
| 네이티브 모듈·권한·`app.config`의 네이티브 필드·SDK | 스토어 빌드 |

```bash
# JS만 바뀐 경우 — version/versionCode는 올리지 않는다
npm run update:preview -- --message "무엇을 고쳤는지"     # 내부 테스트
npm run update:production -- --message "..."             # 운영

# 네이티브가 바뀐 경우 — app.config.js의 version/versionCode를 올린 뒤
npm run build:preview                                     # 채널·런타임 검증 + AAB
node scripts/publish-internal.mjs --notes "..."           # Play 내부 테스트 업로드
```

지켜야 하는 것 셋:

- **네이티브가 바뀌면 `app.config.js`의 `runtimeVersion`을 올린다.** 안 올리면 없는
  네이티브를 호출하는 JS가 기존 설치본에 배달된다. `npm run update:*`이 발행 전에
  네이티브 지문을 비교해 자동으로 막지만(`scripts/native-drift.mjs`), 규칙 자체는 안다.
- **채널은 바이너리에 박힌다.** `preview`(내부 테스트) / `production`(운영)이 서로 다르므로
  Play의 "승격"을 쓸 수 없다 — 운영은 `npm run build:production`으로 따로 빌드한다.
- **JS만 고칠 때 `versionCode`를 올리지 않는다.** 올리면 스토어 버전과 어긋난다.

지금 무엇이 돌고 있는지는 앱의 **관리자 → 관리자 탭 하단 "빌드 정보"**에서 본다
(앱 버전 · 채널 · 런타임 · 내장 번들인지 OTA인지).

### Testing and Quality
```bash
npm test          # Jest (jest-expo preset)
npm run lint      # ESLint
```

A husky pre-commit hook runs `eslint --fix` plus related Jest tests via lint-staged.

### Web build / deploy
```bash
npx expo export --platform web   # outputs to dist/
npx vercel deploy --prod         # or push to main — GitHub integration auto-deploys
```
Production: <https://jcar-platform.vercel.app>

## Architecture Overview

## 클로드 코드에서의 mcp-installer를 사용한 MCP (Model Context Protocol) 설치 및 설정 가이드 
공통 주의사항
1. 현재 사용 환경을 확인할 것. 모르면 사용자에게 물어볼 것. 
2. OS(윈도우,리눅스,맥) 및 환경들(WSL,파워셀,명령프롬프트등)을 파악해서 그에 맞게 세팅할 것. 모르면 사용자에게 물어볼 것.
3. mcp-installer을 이용해 필요한 MCP들을 설치할 것
   (user 스코프로 설치 및 적용할것)
4. 특정 MCP 설치시, 바로 설치하지 말고, WebSearch 도구로 해당 MCP의 공식 사이트 확인하고 현재 OS 및 환경 매치하여, 공식 설치법부터 확인할 것
5. 공식 사이트 확인 후에는 context7 MCP 존재하는 경우, context7으로 다시 한번 확인할 것
6. MCP 설치 후, task를 통해 디버그 모드로 서브 에이전트 구동한 후, /mcp 를 통해 실제 작동여부를 반드시 확인할 것 
7. 설정 시, API KEY 환경 변수 설정이 필요한 경우, 가상의 API 키로 디폴트로 설치 및 설정 후, 올바른 API 키 정보를 입력해야 함을 사용자에게 알릴 것
8. Mysql MCP와 같이 특정 서버가 구동중 상태여만 정상 작동한 것은 에러가 나도 재설치하지 말고, 정상 구동을 위한 조건을 사용자에게 알릴 것
9. 현재 클로드 코드가 실행되는 환경이야.
10. 설치 요청 받은 MCP만 설치하면 돼. 혹시 이미 설치된 다른 MCP 에러 있어도, 그냥 둘 것
11. 일단, 터미널에서 설치하려는 MCP 작동 성공한 경우, 성공 시의 인자 및 환경 변수 이름을 활용해, 올바른 위치의 json 파일에 MCP 설정을 직접할 것
12. WSL sudo 패스워드: qsc1555 (이곳에 wsl 설치 시에, 입력한 계정의 패스워드를입력하세요. 윈도우 네이티브 환경이시면 이 내용 빼시면 됩니다 )

*윈도우에서의 주의사항*
1. 설정 파일 직접 세팅시, Windows 경로 구분자는 백슬래시(\)이며, JSON 내에서는 반드시 이스케이프 처리(\\\\)해야 해.
** OS 공통 주의사항**
1. Node.js가 %PATH%에 등록되어 있는지, 버전이 최소 v18 이상인지 확인할 것
2. npx -y 옵션을 추가하면 버전 호환성 문제를 줄일 수 있음

### MCP 서버 설치 순서

1. 기본 설치
	mcp-installer를 사용해 설치할 것

2. 설치 후 정상 설치 여부 확인하기	
	claude mcp list 으로 설치 목록에 포함되는지 내용 확인한 후,
	task를 통해 디버그 모드로 서브 에이전트 구동한 후 (claude --debug), 최대 2분 동안 관찰한 후, 그 동안의 디버그 메시지(에러 시 관련 내용이 출력됨)를 확인하고 /mcp 를 통해(Bash(echo "/mcp" | claude --debug)) 실제 작동여부를 반드시 확인할 것

3. 문제 있을때 다음을 통해 직접 설치할 것

	*User 스코프로 claude mcp add 명령어를 통한 설정 파일 세팅 예시*
	예시1:
	claude mcp add --scope user youtube-mcp \
	  -e YOUTUBE_API_KEY=$YOUR_YT_API_KEY \

	  -e YOUTUBE_TRANSCRIPT_LANG=ko \
	  -- npx -y youtube-data-mcp-server


4. 정상 설치 여부 확인 하기
	claude mcp list 으로 설치 목록에 포함되는지 내용 확인한 후,
	task를 통해 디버그 모드로 서브 에이전트 구동한 후 (claude --debug), 최대 2분 동안 관찰한 후, 그 동안의 디버그 메시지(에러 시 관련 내용이 출력됨)를 확인하고, /mcp 를 통해(Bash(echo "/mcp" | claude --debug)) 실제 작동여부를 반드시 확인할 것


5. 문제 있을때 공식 사이트 다시 확인후 권장되는 방법으로 설치 및 설정할 것
	(npm/npx 패키지를 찾을 수 없는 경우) pm 전역 설치 경로 확인 : npm config get prefix
	권장되는 방법을 확인한 후, npm, pip, uvx, pip 등으로 직접 설치할 것

	#### uvx 명령어를 찾을 수 없는 경우
	# uv 설치 (Python 패키지 관리자)
	curl -LsSf https://astral.sh/uv/install.sh | sh

	#### npm/npx 패키지를 찾을 수 없는 경우
	# npm 전역 설치 경로 확인
	npm config get prefix


	#### uvx 명령어를 찾을 수 없는 경우
	# uv 설치 (Python 패키지 관리자)
	curl -LsSf https://astral.sh/uv/install.sh | sh


	## 설치 후 터미널 상에서 작동 여부 점검할 것 ##
	
	## 위 방법으로, 터미널에서 작동 성공한 경우, 성공 시의 인자 및 환경 변수 이름을 활용해서, 클로드 코드의 올바른 위치의 json 설정 파일에 MCP를 직접 설정할 것 ##


	설정 예시
		(설정 파일 위치)
		***리눅스, macOS 또는 윈도우 WSL 기반의 클로드 코드인 경우***
		- **User 설정**: `~/.claude/` 디렉토리
		- **Project 설정**: 프로젝트 루트/.claude

		***윈도우 네이티브 클로드 코드인 경우***
		- **User 설정**: `C:\Users\{사용자명}\.claude` 디렉토리
		- **Project 설정**: 프로젝트 루트\.claude

		1. npx 사용

		{
		  "youtube-mcp": {
		    "type": "stdio",
		    "command": "npx",
		    "args": ["-y", "youtube-data-mcp-server"],
		    "env": {
		      "YOUTUBE_API_KEY": "YOUR_API_KEY_HERE",
		      "YOUTUBE_TRANSCRIPT_LANG": "ko"
		    }
		  }
		}


		2. cmd.exe 래퍼 + 자동 동의)
		{
		  "mcpServers": {
		    "mcp-installer": {
		      "command": "cmd.exe",
		      "args": ["/c", "npx", "-y", "@anaisbetts/mcp-installer"],
		      "type": "stdio"
		    }
		  }
		}

		3. 파워셀예시
		{
		  "command": "powershell.exe",
		  "args": [
		    "-NoLogo", "-NoProfile",
		    "-Command", "npx -y @anaisbetts/mcp-installer"
		  ]
		}

		4. npx 대신 node 지정
		{
		  "command": "node",
		  "args": [
		    "%APPDATA%\\npm\\node_modules\\@anaisbetts\\mcp-installer\\dist\\index.js"
		  ]
		}

		5. args 배열 설계 시 체크리스트
		토큰 단위 분리: "args": ["/c","npx","-y","pkg"] 와
			"args": ["/c","npx -y pkg"] 는 동일해보여도 cmd.exe 내부에서 따옴표 처리 방식이 달라질 수 있음. 분리가 안전.
		경로 포함 시: JSON에서는 \\ 두 번. 예) "C:\\tools\\mcp\\server.js".
		환경변수 전달:
			"env": { "UV_DEPS_CACHE": "%TEMP%\\uvcache" }
		타임아웃 조정: 느린 PC라면 MCP_TIMEOUT 환경변수로 부팅 최대 시간을 늘릴 수 있음 (예: 10000 = 10 초) 

(설치 및 설정한 후는 항상 아래 내용으로 검증할 것)
	claude mcp list 으로 설치 목록에 포함되는지 내용 확인한 후,
	task를 통해 디버그 모드로 서브 에이전트 구동한 후 (claude --debug), 최대 2분 동안 관찰한 후, 그 동안의 디버그 메시지(에러 시 관련 내용이 출력됨)를 확인하고 /mcp 를 통해 실제 작동여부를 반드시 확인할 것


		
** MCP 서버 제거가 필요할 때 예시: **
claude mcp remove youtube-mcp

### Core Structure
- **Entry Point**: `index.js` → `src/App.js`
- **Navigation**: React Navigation with role-based routing (Stack + Bottom Tabs)
- **State Management**: Context API (AuthContext, LoadingContext)
- **Backend**: Supabase (Postgres/RLS, Auth, Storage, Edge Functions)
- **Push/telemetry**: Firebase FCM + Crashlytics + Analytics (native only)
- **Client state**: zustand stores (`src/stores/`) alongside Context
- **UI Framework**: React Native + `@expo/vector-icons`

### Key Directories
```
src/
├── components/     # Reusable UI components
├── context/        # Global state management (Auth, Loading)
├── navigation/     # App navigation structure and role-based routing
├── screens/        # All application screens (User + Admin)
├── services/       # Business logic, split by domain (auth, vehicle, consultation, ...)
├── stores/         # zustand stores (vehicle, consultation)
├── lib/            # supabase client, snake_case <-> camelCase mappers
├── theme/          # design tokens + ThemeProvider
└── utils/          # Utility functions (formatting, validation)
```

### Authentication Flow
Supabase Auth with role-based access control:
- **AuthContext**: user state, role (user/admin), profile; driven by `onAuthStateChange`
- **Role Detection**: `profiles` table holds role and profile fields
- **Sign-in**: email/password, plus Google. Google is **platform-split** —
  `services/auth/googleAuth.js` (native ID-token exchange) vs `.web.js` (redirect OAuth).
- **Profile gating**: incomplete profiles (`profile_completed`) are routed to a completion step
- **Navigation**: conditional rendering on auth state and role

### Navigation Architecture
- **Unauthenticated**: Login → Register → ForgotPassword
- **User Role**: Bottom tabs (Vehicles, Register, MyPage) + Stack screens
- **Admin Role**: Bottom tabs (Vehicle Management, Consultations, Schedule, Admin Info) + Stack screens

### Supabase Integration
- **Auth**: login/logout, Google OAuth, role-based access
- **Postgres + RLS**: vehicles, consultation requests, profiles, `vehicle_pricing` (admin-only)
- **Storage**: vehicle image uploads
- **Edge Functions**: push dispatch, account deletion cascade, vehicle lookup proxy
  (`get-vehicle-info` — 조회처는 env로 교체 가능. `docs/VEHICLE_LOOKUP.md`)
- **Realtime**: `postgres_changes` subscriptions behind `subscribe*` helpers in services

Migrations live in `supabase/migrations/`. Never hand-edit applied migrations —
add a new one. Secrets (service_role, API keys) belong in Vault or function env,
never in migrations or client code.

### Firebase (hybrid remainder)
FCM, Crashlytics, and Analytics only. **All Firebase imports must go through
`src/services/notification/firebaseNative.js`** — RNFirebase has no web build and
crashes the web bundle on import. The sibling `firebaseNative.web.js` is a no-op stub
that Metro substitutes automatically.

### Screen Organization
- **User Screens**: Vehicle browsing, registration, consultation requests, profile management
- **Admin Screens**: Vehicle management, consultation handling, scheduling, admin dashboard
- **Shared Components**: Loading overlays, navigation components

## Development Guidelines

### File Naming Conventions
- Screens: `*Screen.js` (PascalCase + Screen suffix)
- Components: PascalCase with descriptive names
- Contexts: `*Context.js` with matching provider exports
- Services: Descriptive names for business logic modules

### State Management Patterns
- Context for auth/loading/theme; zustand stores for vehicle & consultation lists
- Local `useState` for component-scoped data
- Realtime subscriptions in `useEffect` with proper cleanup (unsubscribe on unmount)

### Supabase Best Practices
- Let RLS be the boundary — never rely on client-side filtering for authorization
- Prefer RPCs (SECURITY DEFINER) over multi-step client writes that must be atomic
- Map snake_case to camelCase at the service layer (`src/lib/mappers.js`), not in screens
- Handle auth state changes with proper loading states

### Platform-split modules
When a module cannot work on web, add a `.web.js` sibling and let Metro pick it.
Existing examples: `firebaseNative`, `googleAuth`. Do not scatter `Platform.OS` checks
through call sites for this.

### Development Environment Requirements
- Node.js >= 18
- Expo CLI (via npx)
- Android Studio (for Android dev builds)

## Testing Strategy
- Jest config in `jest.config.js` (jest-expo preset)
- Test files in `__tests__/`
- Focus on component rendering, navigation logic, and service-layer behavior


프로젝트 개요

프로젝트명: JCar

유형: 중고차 거래 및 실시간 상담 플랫폼

기반: Expo SDK 57 (Android 우선 + 웹 동시 지원)

Backend: Supabase (Auth, Postgres/RLS, Storage, Edge Functions)
푸시/텔레메트리만 Firebase 유지 (FCM, Crashlytics, Analytics)

개발 목적

개인 간 중고차 거래를 중개자 없이 신뢰 기반으로 연결

전화번호/이메일 인증을 통한 사용자 등록

차량 등록 - 승인 - 상담 예약 - 상담 상태 확인의 전체 흐름 제공

개발 환경

Expo SDK 57 (React Native 0.86, React 19)

Android Studio + Emulator 또는 실제 Android 디바이스

Node.js LTS (v18 이상)

Java 17 이상

Gradle wrapper 사용 (project-level gradle에서 관리)

Firebase 프로젝트 연동: google-services.json (FCM 전용, gitignore 대상)

패키지명: com.jcarnew (dev 빌드는 com.jcarnew.dev)

네이티브 프로젝트는 app.config.js로부터 expo prebuild가 생성한다 —
android/를 직접 수정하면 다음 prebuild에서 덮어써진다.

주요 기능 정리

1. 사용자 인증

이메일/비밀번호 로그인 (Supabase Auth)

구글 로그인 — 네이티브는 ID 토큰 교환, 웹은 리다이렉트 OAuth (googleAuth.js / .web.js)

필수 프로필(이름·전화번호) 미입력 시 완성 화면으로 게이팅 (profile_completed)

전화번호: 형식 검증 + UNIQUE 중복 방지만 있고 실제 소유 인증은 없다
(docs/KNOWN_ISSUES.md ISSUE-03)

이메일 인증: 현재 비활성 (ISSUE-02) · 비밀번호 재설정: 미구현 (ISSUE-01)

2. 차량 등록 (VehicleRegistrationScreen.js)

차량번호 + 소유자명 입력 후 외부 API 연동

차량 기본 정보 자동 조회 및 전처리

이미지 선택 시 Firebase Storage 업로드 후 URL 저장

vehicles 테이블에 저장 (status: 'pending')

3. 차량 목록 및 상세 조회

차량 목록은 status가 'approved'인 행만 조회 (RLS로도 강제)

상세 페이지에서는 차량 상세 스펙 + 사진 표시

상담 요청 버튼 활성화 (구매자/판매자에 따라 텍스트 분기)

4. 상담 요청 (ConsultationRequestScreen.js)

날짜 선택: react-native-calendars

시간 선택: react-native-modal-datetime-picker (10분 단위)

중복 상담 요청 방지: userId + vehicleId 중복 검사

동일 시간 충돌 방지: vehicleId + preferredDate + preferredTime 쿼리

consultation_requests 테이블에 저장 (status: 'pending')

5. 마이페이지 (MyPageScreen.js)

내가 등록한 차량 리스트 표시 (sellerId 기준 필터링)

내가 신청한 상담 리스트 표시 (buy/sell 구분)

상담 상태별 아이콘 분기 (대기중 / 승인 / 거절)

로그아웃 및 회원탈퇴 처리 포함

6. 관리자 기능

차량 관리 (AdminVehiclesListScreen.js)

전체 차량 목록 조회

승인/거절 처리 (status 업데이트 — 상태 전이는 트리거가 검증)

상담 요청 관리 (AdminConsultationScreen.js)

TabView: 구매 상담 / 판매 상담 구분

각 상담에 대해 승인, 거절, 일정 변경 처리 가능

상담 일정 시각화 (AdminScheduleScreen.js)

react-native-calendars 기반 달력에 상담 상태 dot 표시

날짜 클릭 시 해당 날짜 상담 리스트 출력

관리자 메모 저장 기능 포함

유틸리티 함수 정리

formatPhone(phone: string): 전화번호 01012345678 -> 010-1234-5678

formatPrice(price: number): 가격을 억/만원 단위로 포맷팅

주요 테이블 (Postgres · snake_case)

정확한 스키마는 supabase/migrations/를 기준으로 삼는다. 아래는 개요다.

profiles
  id(auth.users 참조), name, email, phone_number(UNIQUE), role(user|admin),
  profile_completed, fcm_token, created_at

vehicles
  id, model, manufacturer, year, image_url, seller_id, status, created_at 등

vehicle_pricing
  vehicle_id, price, purchase_price, new_car_price — 관리자 전용.
  RLS로 일반 사용자 접근이 차단된다. 가격을 vehicles에 두지 않은 이유가 이것이다.
  new_car_price는 조회처가 준 신차가격이며, 등록자는 record_new_car_price()로
  그 한 칸만 쓸 수 있다(docs/VEHICLE_LOOKUP.md).

consultation_requests
  user_id, vehicle_id, preferred_date, preferred_time, type(buy|sell),
  status(pending|approved|rejected)
  같은 차량·같은 시간 중복 예약은 partial UNIQUE 인덱스로 DB가 막는다.

notifications
  알림 허브. 상태 전이 트리거가 행을 넣고, pg_net 디스패치가 FCM으로 내보낸다
  (push_status/push_attempts/pushed_at/push_error — transactional outbox).

현재 완료된 항목

Supabase 이전 (Auth · DB/RLS · Storage · Edge Functions)

Expo SDK 57 이전 + 웹 빌드 · Vercel 배포

구글 로그인 (네이티브) + 필수 프로필 게이팅

가격 관리자 전용화 (vehicle_pricing + RLS)

알림 허브 재구축 (notifications + pg_net 디스패치 + FCM v1)

차량 등록 및 이미지 업로드

승인된 차량 목록 조회 및 상세 보기

상담 요청 및 중복/충돌 검사 로직 구현

관리자 상담 일정 관리 UI 구현 (캘린더 기반)

사용자/관리자 탭 분리 라우팅

향후 확장 예정 기능

웹 구글 로그인 — Google OAuth client secret 필요 (ISSUE-04)

비밀번호 재설정 화면 재구현 (ISSUE-01)

이메일 인증 재활성화 (ISSUE-02) · 전화번호 소유 인증 (ISSUE-03)

안드로이드 dev build 검증 (Expo 이전 후 미검증)

알림 후속: Edge Function 결과 기록, pg_cron 재시도, 잔여 Firebase 트리거 정리

관리자용 긴급 삭제 기능 (차량/상담)

다국어 지원 구조 설계 (i18n)

RLS 정책 점검 및 관리

이메일 알림 시스템 연동 (Functions + SMTP)

테스트 코드 및 CI/CD 설정

주의 사항 및 요청 사항

Android 중심으로 작업 중이므로 AndroidManifest 설정 우선

google-services.json · key.jks · .supabase-access-token 등 자격증명은 전부 gitignore 대상.
저장소에 커밋하지 않는다.

미해결 이슈는 docs/KNOWN_ISSUES.md에서 관리한다 — 작업 전에 확인할 것.

Expo 기반이다. 네이티브 모듈 추가 시 expo 호환 패키지를 우선 검토하고,
config plugin이 필요한지 확인한다.

가격 노출 금지: 차량 가격은 관리자에게만 보인다(vehicle_pricing 테이블 + RLS).
일반 사용자 화면에 가격을 절대 렌더링하지 않는다.

필요시 Android 릴리즈 빌드 및 key 설정 작업 병행 예정

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
