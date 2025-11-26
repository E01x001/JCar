# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JCarNew is a React Native vehicle marketplace application with Firebase backend integration. The app features role-based authentication with separate interfaces for regular users and administrators, supporting vehicle listings, consultation requests, and administrative management.

## Development Commands

### Start Development Server
```bash
npm start          # Start Metro bundler
```

### Build and Run
```bash
npm run android    # Build and run

 Android app
npm run ios        # Build and run iOS app (requires pod install)
```

### iOS Setup (First time or after native dependency updates)
```bash
bundle install                # Install Ruby bundler
bundle exec pod install      # Install CocoaPods dependencies
```

### Testing and Quality
```bash
npm test          # Run Jest tests
npm run lint      # Run ESLint
```

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
- **Backend**: Firebase (Auth, Firestore, Storage, Messaging)
- **UI Framework**: React Native with Vector Icons and gesture handling

### Key Directories
```
src/
├── components/     # Reusable UI components (LoadingOverlay, UpdateChecker)
├── context/        # Global state management (Auth, Loading)
├── navigation/     # App navigation structure and role-based routing
├── screens/        # All application screens (User + Admin)
├── services/       # Firebase integration and business logic
└── utils/          # Utility functions (formatting, validation)
```

### Authentication Flow
The app uses Firebase Authentication with role-based access control:
- **AuthContext**: Manages user state, role (user/admin), and profile data
- **Role Detection**: Firestore users collection stores role and profile information
- **Navigation**: Conditional rendering based on authentication state and user role

### Navigation Architecture
- **Unauthenticated**: Login → Register → ForgotPassword
- **User Role**: Bottom tabs (Vehicles, Register, MyPage) + Stack screens
- **Admin Role**: Bottom tabs (Vehicle Management, Consultations, Schedule, Admin Info) + Stack screens

### Firebase Integration
- **Authentication**: User login/logout, role-based access
- **Firestore**: Vehicle data, consultation requests, user profiles
- **Storage**: Image uploads for vehicles
- **Messaging**: FCM integration (currently disabled in firebaseService.js)

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
- Use Context API for global state (authentication, loading)
- Local state with useState for component-specific data
- Firebase real-time listeners in useEffect with proper cleanup

### Firebase Best Practices
- Always validate Firestore document existence before accessing data
- Use serverTimestamp() for consistent timestamps
- Handle authentication state changes with proper loading states
- Implement proper error handling for Firebase operations

### Development Environment Requirements
- Node.js >= 18
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)
- CocoaPods (for iOS dependencies)

## Testing Strategy
- Jest configuration in `jest.config.js`
- Test files in `__tests__/` directory
- Focus on component rendering, navigation logic, and Firebase integration


프로젝트 개요

프로젝트명: JCar

유형: 중고차 거래 및 실시간 상담 플랫폼

기반: React Native CLI (Android 우선 개발)

Backend: Firebase (Authentication, Firestore, Storage, Functions)

개발 목적

개인 간 중고차 거래를 중개자 없이 신뢰 기반으로 연결

전화번호/이메일 인증을 통한 사용자 등록

차량 등록 - 승인 - 상담 예약 - 상담 상태 확인의 전체 흐름 제공

개발 환경

React Native CLI (v0.79.x)

Android Studio + Emulator 또는 실제 Android 디바이스

Node.js LTS (v18 이상)

Java 17 이상

Gradle wrapper 사용 (project-level gradle에서 관리)

Firebase 프로젝트 연동: google-services.json 설정 완료

패키지명: com.jcarplatform.jcar

주요 기능 정리

1. 사용자 인증

전화번호 인증 (Firebase Phone Auth)

Android에서는 SafetyNet 자동 활성화

중복 가입 방지를 위한 Firebase Functions (checkPhoneNumber) 호출

이메일/비밀번호 로그인 및 재설정

signInWithEmailAndPassword

sendPasswordResetEmail

2. 차량 등록 (VehicleRegistrationScreen.js)

차량번호 + 소유자명 입력 후 외부 API 연동

차량 기본 정보 자동 조회 및 전처리

이미지 선택 시 Firebase Storage 업로드 후 URL 저장

Firestore vehicles 컬렉션에 저장 (status: 'pending')

3. 차량 목록 및 상세 조회

차량 목록은 Firestore에서 status가 'approved'인 문서만 조회

상세 페이지에서는 차량 상세 스펙 + 사진 표시

상담 요청 버튼 활성화 (구매자/판매자에 따라 텍스트 분기)

4. 상담 요청 (ConsultationRequestScreen.js)

날짜 선택: react-native-calendars

시간 선택: react-native-modal-datetime-picker (10분 단위)

중복 상담 요청 방지: userId + vehicleId 중복 검사

동일 시간 충돌 방지: vehicleId + preferredDate + preferredTime 쿼리

Firestore consultation_requests 컬렉션에 저장 (status: 'pending')

5. 마이페이지 (MyPageScreen.js)

내가 등록한 차량 리스트 표시 (sellerId 기준 필터링)

내가 신청한 상담 리스트 표시 (buy/sell 구분)

상담 상태별 아이콘 분기 (대기중 / 승인 / 거절)

로그아웃 및 회원탈퇴 처리 포함

6. 관리자 기능

차량 관리 (AdminVehiclesListScreen.js)

전체 차량 목록 조회

승인/거절 처리 (Firestore status 업데이트)

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

Firestore 주요 컬렉션

users

uid, name, email, phoneNumber, role (user | admin), createdAt

vehicles

vehicleId, vehicleName, manufacturer, year, imageUrl, sellerId, status, createdAt 등

consultation_requests

userId, vehicleId, preferredDate, preferredTime, type (buy | sell), status (pending | approved | rejected)

현재 완료된 항목

Firebase Auth 연동

전화번호 중복 검사용 Firebase Functions

차량 등록 및 이미지 업로드

승인된 차량 목록 조회 및 상세 보기

상담 요청 및 중복/충돌 검사 로직 구현

관리자 상담 일정 관리 UI 구현 (캘린더 기반)

사용자/관리자 탭 분리 라우팅

향후 확장 예정 기능 (SuperClaude 대상)

FCM 푸시 알림: 상담 승인/거절 시 사용자 알림

관리자용 긴급 삭제 기능 (차량/상담)

다국어 지원 구조 설계 (i18n)

Firestore 보안 규칙 강화 및 관리

이메일 알림 시스템 연동 (Functions + SMTP)

React Native CLI에서의 iOS 대응 (Info.plist 설정 포함)

테스트 코드 및 CI/CD 설정

주의 사항 및 요청 사항

Android 중심으로 작업 중이므로 AndroidManifest 설정 우선

Firebase 관련 네이티브 설정 (google-services.json, SHA 키 등록 등) 사전 확인 필수

expo 라이브러리 사용하지 않음 (CLI 기준 구성)

필요시 Android 릴리즈 빌드 및 key 설정 작업 병행 예정

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
