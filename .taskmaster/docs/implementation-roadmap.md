# JCar Implementation Roadmap

## Project Context
JCar is a React Native CLI-based used car trading platform with Firebase backend. The core features (authentication, vehicle registration, consultation requests, admin management) are implemented. This roadmap focuses on enhancement and production readiness.

## Phase 1: Security & Stability (High Priority)

### 1.1 Security Hardening
**Priority**: Critical
**Description**: Address security vulnerabilities and strengthen access control
- Remove exposed GitHub PAT from .env file and add .env to .gitignore properly
- Implement Firestore security rules for users, vehicles, consultation_requests collections
- Add input validation and sanitization across all forms
- Implement rate limiting for API calls
- Review and secure Firebase Storage rules for image uploads
- Add OWASP Top 10 vulnerability checks

### 1.2 Error Handling & Logging
**Priority**: High
**Description**: Implement comprehensive error handling and logging system
- Add global error boundary in React Native
- Implement structured logging service (Firebase Crashlytics or similar)
- Add error tracking for Firebase operations
- Create user-friendly error messages
- Implement retry logic for network failures

### 1.3 Code Quality & Testing
**Priority**: High
**Description**: Establish testing framework and improve code quality
- Set up Jest for unit testing
- Write tests for critical functions (firebaseService.js, formatters, validators)
- Implement integration tests for authentication flow
- Add E2E testing setup (Detox or similar)
- Set up ESLint rules and fix existing violations
- Add pre-commit hooks with Husky

## Phase 2: Feature Enhancements (Medium Priority)

### 2.1 Push Notification System
**Priority**: High
**Description**: Implement FCM push notifications for real-time updates
- Enable Firebase Cloud Messaging in firebaseService.js
- Implement notification permission requests
- Create notification handlers for consultation status changes
- Add notification settings in user profile
- Implement admin broadcast notifications
- Test notifications on both Android and background/foreground states

### 2.2 Admin Management Features
**Priority**: Medium
**Description**: Enhance admin capabilities for better platform management
- Implement emergency delete functionality for vehicles
- Add consultation cancellation with reason tracking
- Create user management interface (suspend/activate accounts)
- Add bulk operations for vehicle approval/rejection
- Implement admin activity logs
- Add statistics dashboard (total users, vehicles, consultations)

### 2.3 Enhanced Consultation Features
**Priority**: Medium
**Description**: Improve consultation request and management flow
- Add consultation rescheduling by users
- Implement consultation history and notes
- Add photo/document attachment to consultations
- Create consultation reminder system (24h before)
- Add consultation review/rating after completion
- Implement consultation cancellation policy

## Phase 3: User Experience Improvements (Medium Priority)

### 3.1 Advanced Search & Filters
**Priority**: Medium
**Description**: Enhance vehicle discovery capabilities
- Implement advanced vehicle search filters (price range, year, manufacturer, etc.)
- Add sorting options (price, date, popularity)
- Implement search history and saved searches
- Add favorite/bookmark vehicles feature
- Implement vehicle comparison feature (side-by-side)

### 3.1b Vehicle Mileage (주행거리) — ON HOLD
**Priority**: Low / Deferred
**Description**: Display vehicle mileage on cards and detail screen
- **현재 상태**: CarZen 등록원부 조회 응답에 주행거리가 없어 저장 불가 → 차량 상세에서 주행거리 행 제거됨(빈 값 숨김 처리).
- **보류 사유**: 등록 위저드에 수동 입력 필드를 넣으면 채울 수 있으나, **등록자가 허위로 입력할 수 있어** 신뢰성 문제. 단순 입력 필드만 추가하는 것은 지양하기로 결정.
- **진행 조건(이걸 갖출 때만 구현)**: 검증 수단 동반 필요 — 계기판/정비이력 사진 인증, 또는 관리자 검수 프로세스. (7.3 Vehicle History Reports와 연계 가능)

### 3.2 Image & Media Management
**Priority**: Medium
**Description**: Improve image handling and user experience
- Implement image compression before upload
- Add multiple image upload with reordering
- Implement image gallery with zoom and swipe
- Add image loading placeholders and lazy loading
- Implement image caching strategy
- Add support for video uploads (optional)

### 3.3 User Profile Enhancements
**Priority**: Low
**Description**: Expand user profile functionality
- Add profile picture upload
- Implement user verification system (ID, phone)
- Add user reputation/rating system
- Create user activity timeline
- Add privacy settings

## Phase 4: Internationalization & Accessibility (Low Priority)

### 4.1 Multi-language Support
**Priority**: Low
**Description**: Implement i18n for broader user base
- Install and configure react-native-i18n or react-i18next
- Extract all hardcoded strings to translation files
- Implement language selection in settings
- Translate to English and Korean (minimum)
- Handle RTL languages support (future consideration)
- Implement date/time/currency formatting per locale

### 4.2 Accessibility Improvements
**Priority**: Low
**Description**: Make app accessible to users with disabilities
- Add accessibility labels to all interactive elements
- Implement proper heading hierarchy
- Add screen reader support testing
- Ensure sufficient color contrast ratios
- Add keyboard navigation support where applicable

## Phase 5: Platform Expansion (Low Priority)

### 5.1 iOS Platform Support
**Priority**: Low
**Description**: Enable full iOS compatibility
- Configure Info.plist with required permissions
- Set up iOS Firebase configuration (GoogleService-Info.plist)
- Test and fix iOS-specific issues
- Configure iOS app icons and splash screens
- Set up iOS code signing and provisioning
- Test on multiple iOS device sizes

### 5.2 Release Build & Distribution
**Priority**: Medium
**Description**: Prepare for production release
- Configure Android release build with ProGuard
- Set up keystore and signing configuration
- Create release variant in build.gradle
- Generate signed APK/AAB for Play Store
- Configure app versioning strategy
- Create release documentation and changelog

## Phase 6: DevOps & Monitoring (Medium Priority)

### 6.1 CI/CD Pipeline
**Priority**: Medium
**Description**: Automate build, test, and deployment processes
- Set up GitHub Actions or similar CI/CD
- Automate testing on pull requests
- Implement automated builds for staging/production
- Set up code coverage reporting
- Implement automated changelog generation
- Configure automated Play Store deployment

### 6.2 Email Notification System
**Priority**: Low
**Description**: Implement email notifications using Firebase Functions
- Set up Firebase Functions with SMTP integration (SendGrid or similar)
- Create email templates for consultation status changes
- Implement welcome email for new users
- Add password reset email customization
- Create admin notification emails
- Implement email preference settings

### 6.3 Monitoring & Analytics
**Priority**: Medium
**Description**: Implement comprehensive monitoring and analytics
- Set up Firebase Analytics for user behavior tracking
- Implement performance monitoring
- Add custom event tracking for key actions
- Create analytics dashboard for admins
- Set up error rate alerting
- Implement A/B testing capability

## Phase 7: Advanced Features (Future Consideration)

### 7.1 Real-time Chat
**Priority**: Low
**Description**: Enable direct messaging between buyers and sellers
- Implement chat functionality using Firebase Realtime Database
- Add message notifications
- Implement message history and search
- Add image sharing in chat
- Implement chat moderation tools for admins

### 7.2 Payment Integration
**Priority**: Future
**Description**: Enable secure payment processing (if platform evolves to handle transactions)
- Research payment gateways (Stripe, Iamport, etc.)
- Implement escrow system design
- Add payment method management
- Implement refund handling
- Add payment history and receipts

### 7.3 Vehicle History Reports
**Priority**: Low
**Description**: Integrate with vehicle history APIs
- Research Korean vehicle history APIs
- Implement API integration for accident history
- Add ownership history display
- Implement inspection record integration
- Add report generation and sharing

## Phase 8: 2026-07-07 총점검 후 도출 신규 항목

> 배포 전 총점검([docs/PRE_DEPLOY_REVIEW_2026-07-07.md](../../docs/PRE_DEPLOY_REVIEW_2026-07-07.md))에서 나온 개선/신규 기능. 🔴 항목은 리뷰 문서에서 추적.

### 8.1 가격 비공개의 서버 레벨 강제 (출시 차단 연계)
**Priority**: Critical
- `price`/`sellerId`를 admin·owner 전용 서브컬렉션 또는 public·admin 2문서 구조로 분리(가격은 role 검사 callable로만 해석).
- 필터에서 가격대/가격정렬을 비관리자에게 숨기고 서버측에서도 price 필터 파라미터 거부.
- Supabase 이전 시 RLS 컬럼 통제로 근본화([supabase-migration-readiness.md](../../docs/supabase-migration-readiness.md)).

### 8.2 예약 정합성 인프라
**Priority**: High
- 결정적 슬롯 문서ID(`vehicleId_date_time`) 기반 트랜잭션 예약으로 이중예약 원천 차단.
- 상담 생성·레이트리밋을 단일 서버 callable로 통합(클라 우회 불가).
- 완료/소유권 이전 멱등키(`consultationId` 문서ID).

### 8.3 관측성 & 상태 리스너 리팩토링
**Priority**: Medium
- zustand 스토어 리스너를 cacheKey별 unsubscribe 맵으로 전환(구독 공존·누수 해결).
- 전체 컬렉션 구독 페이지네이션·limit 표준화.
- Firebase Analytics 핵심 이벤트(상담신청/승인/이탈 퍼널) + 성능 모니터링.

### 8.4 접근성 & i18n 기반
**Priority**: Medium
- 아이콘 전용 터치에 `accessibilityRole`/`accessibilityLabel` 부여(내비·모달 닫기 우선).
- 문자열 추출 → i18n 스캐폴딩(한/영), 통화/날짜 로케일 포맷.

### 8.5 신규 사용자 기능 후보 (제품)
**Priority**: Low~Medium
- **찜/관심 차량** + 알림(가격 변동 없이 상태 변화 알림).
- **인앱 알림센터**(FCM 히스토리 영속화).
- **상담 채팅**(구매자↔에이전트) — 7.1과 통합.
- **차량 비교**(2~3대 스펙 사이드바이).
- **상담 리마인더 푸시**(예약 1일/1시간 전).
- **차량 이력 인증**(계기판/정비이력 사진 인증) — 이게 갖춰지면 주행거리 입력(3.1b 보류) 해제 가능.
- **에이전트 리뷰/평점**(상담 완료 후).

## Immediate Next Steps

Based on current project state and priority, recommend starting with:

1. **Security Hardening** (1.1) - Critical for any production system
   - Remove exposed credentials
   - Implement Firestore security rules

2. **Error Handling** (1.2) - Improve stability and debugging
   - Add error boundaries
   - Implement logging

3. **Push Notifications** (2.1) - High-value feature for user engagement
   - Enable FCM
   - Implement notification handlers

4. **Testing Setup** (1.3) - Essential for maintainability
   - Configure Jest
   - Write critical tests

## Success Metrics

- **Security**: Zero exposed credentials, all collections secured with rules
- **Stability**: <1% error rate, 99.9% uptime
- **Testing**: >70% code coverage, all critical paths tested
- **User Engagement**: Push notification open rate >40%
- **Platform**: Android and iOS both supported
- **Performance**: <3s app launch time, <2s screen transition

## Notes

- Focus on Android first as specified in CLAUDE.md
- Maintain React Native CLI approach (no Expo)
- All Firebase features should be properly configured
- Consider user feedback loops for prioritization adjustments
