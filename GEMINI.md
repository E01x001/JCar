# GEMINI.md

This file provides guidance to GEMINI when working with code in this repository.

## Project Overview

JCar is a React Native vehicle marketplace application with Firebase backend integration. The app features role-based authentication with separate interfaces for regular users and administrators, supporting vehicle listings, consultation requests, and administrative management.

## Development Commands

### Start Development Server
```bash
npm start          # Start Metro bundler
```

### Build and Run
```bash
npm run android    # Build and run Android app
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

향후 확장 예정 기능 (SuperGEMINI 대상)

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