# JCar 프로젝트 기능 구현 계획 (PLAN.md)

**본 문서는 JCar 프로젝트의 추가 기능 구현을 위한 체계적인 실행 계획을 정의합니다.**

---

## 0. 코드 안정성 및 품질 보강 (신규)

- **목표**: 모든 기능 개발에 앞서, 애플리케이션의 안정성과 코드 품질을 확보하여 장기적인 유지보수 비용을 절감하고 사용자 경험을 향상시킵니다.
- **세부 계획**:
  - **A. 전역 에러 핸들링 및 사용자 피드백 강화**:
    - **`Client Agent`**:
      - **중앙 에러 처리기 구현**: `src/utils/errorHandler.js` 파일을 생성합니다. 이 함수는 에러 객체를 인자로 받아 개발 환경에서는 `console.error`로 상세 정보를 출력하고, 사용자에게는 `Alert.alert('오류 발생', '요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.')` 와 같이 표준화된 오류 메시지를 표시하는 역할을 합니다.
      - **서비스 계층 적용**: `src/services/firebaseService.js` 내 모든 `async` 함수에 `try...catch` 블록을 적용하고, `catch` 블록에서 위에서 만든 `errorHandler`를 호출하여 예외를 처리합니다.
      - **화면 계층 적용**: 각 화면 컴포넌트에서 `firebaseService` 함수 호출 시, 반환값을 신뢰하기 전에 로딩 상태 및 잠재적 `null` 값을 방어적으로 코딩합니다.
  - **B. 핵심 기능에 대한 테스트 코드 작성**:
    - **`Testing Agent`**:
      - **테스트 환경 설정**: `@testing-library/react-native`와 Jest의 `mock` 기능을 사용하여 Firebase 통신을 모의(mock) 처리할 수 있도록 `__tests__/setup.js` 파일을 설정합니다.
      - **단위 테스트 (Unit Tests)**:
        - `src/utils/format.js`의 `formatPrice`, `formatPhone` 함수에 대해 정상 케이스, 엣지 케이스(e.g., `null`, `0`, `undefined` 입력)에 대한 테스트 코드를 작성합니다.
      - **통합 테스트 (Integration Tests)**:
        - `firebaseService.js`의 함수들을 테스트합니다. 예를 들어, `getVehicles` 함수 호출 시 모의 Firestore가 'approved' 상태의 차량 2개와 'pending' 상태의 차량 1개를 반환하도록 설정하고, `getVehicles` 함수가 'approved' 상태의 2개만 정확히 반환하는지 검증합니다.
        - `LoginScreen.js`가 렌더링되고, 이메일/비밀번호 입력 후 '로그인' 버튼을 눌렀을 때 `AuthContext`의 `signIn` 함수가 올바른 인자와 함께 호출되는지 확인하는 테스트를 작성합니다.
  - **C. Firestore 보안 규칙 강화 및 배포** (기존 4번 항목 구체화):
    - **`Rule-Writing Agent`**:
      - `firestore.rules` 파일에 아래와 같이 구체적인 규칙을 작성합니다.
        ```
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            // Helper function to check for admin role
            function isAdmin() {
              return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
            }

            // Users can only read/write their own data
            match /users/{userId} {
              allow read, update: if request.auth.uid == userId;
              allow create: if request.auth.uid != null;
            }

            // Vehicles can be read by anyone, created by authenticated users,
            // and updated/deleted only by owner or admin.
            match /vehicles/{vehicleId} {
              allow read: if true;
              allow create: if request.auth != null;
              allow update: if request.auth.uid == resource.data.sellerId || isAdmin();
              allow delete: if isAdmin();
            }

            // Consultation requests have more complex rules based on who is involved.
            match /consultation_requests/{reqId} {
              allow create: if request.auth != null;
              allow read, update: if request.auth.uid == resource.data.userId
                                 || request.auth.uid == get(/databases/$(database)/documents/vehicles/$(resource.data.vehicleId)).data.sellerId
                                 || isAdmin();
              allow delete: if isAdmin();
            }
          }
        }
        ```
    - **`Testing Agent`**: Firebase Emulator Suite와 `@firebase/rules-unit-testing`을 사용하여 위 규칙의 각 `allow` 조건(e.g., 관리자만 삭제, 소유자만 업데이트)에 대한 테스트 케이스를 작성하고 검증합니다.
    - **`Deployment Agent`**: 검증 완료 후 `firebase deploy --only firestore:rules` 명령으로 실제 프로덕션 환경에 규칙을 배포합니다.

---

## 1. 로그인 및 회원가입 절차 개선 (진행 중)

- **목표**: 초기 사용자 경험을 개선하기 위해 회원가입 절차를 간소화하고, 편의 기능인 '비밀번호 찾기'를 추가합니다.
- **세부 계획**:
  - **A. 회원가입 절차 간소화**: 현재 2단계(휴대폰 인증 > 정보 입력)로 구성된 회원가입 절차에서 휴대폰 SMS 인증을 임시로 제거하고, 모든 정보를 한 화면에서 입력받도록 변경합니다.
    - **`Client Agent`**:
      - `RegisterScreen.js`의 UI를 단일 화면으로 통합합니다.
      - 휴대폰 번호 SMS 인증 관련 로직(`requestVerification`, `confirmCode`) 및 상태(`step`, `verificationId` 등)를 모두 제거합니다.
      - `handleRegister` 함수에서 이메일/비밀번호로 사용자를 생성하고, (인증되지 않은) 휴대폰 번호를 다른 정보와 함께 Firestore에 저장하도록 수정합니다.
  - **B. 비밀번호 찾기 기능 구현**: 이메일 기반으로 비밀번호를 재설정하는 기능을 추가합니다.
    - **`Client Agent`**:
      - **화면 생성**: `ForgotPasswordScreen.js` 파일을 신규 생성하고, 이메일 입력 필드와 전송 버튼 UI를 구현합니다.
      - **네비게이션 설정**: `AppNavigator.js`에 `ForgotPasswordScreen`을 추가하고, `LoginScreen.js`에 해당 화면으로 이동하는 '비밀번호를 잊으셨나요?' 링크를 추가합니다.
    - **`Server Agent` (Firebase)**:
      - **API 구현**: `firebaseService.js`에 `sendPasswordResetEmail(email)` 함수를 추가합니다. 이 함수는 Firebase Authentication의 `sendPasswordResetEmail` API를 호출하여 비밀번호 재설정 메일을 발송하는 역할을 합니다.

---

## 2. FCM 푸시 알림 기능

- **목표**: 상담 요청 상태 변경 시 사용자에게 실시간 푸시 알림을 전송합니다.
- **핵심 구성 요소 (Agents)**:
  - **`Client Agent` (React Native App)**: 사용자 기기에서 알림 권한 요청, FCM 토큰 관리, 알림 수신을 담당합니다.
  - **`Server Agent` (Firebase Backend)**: Firestore 데이터 변경을 감지하고 푸시 알림을 발송합니다.
- **세부 계획**:
  1.  **Client-Side**:
      - `firebaseService.js`의 `saveFcmToken` 함수 활성화.
      - `App.js`에서 앱 시작 시 알림 권한을 요청.
      - 로그인/회원가입 시 `saveFcmToken`을 호출하여 Firestore에 토큰 저장.
      - `onMessage` (포그라운드), `onNotificationOpenedApp` (백그라운드) 리스너를 구현하여 알림 수신 처리.
  2.  **Server-Side**:
      - Firebase Functions에 `onUpdate` 트리거를 사용하여 `consultation_requests` 컬렉션의 상태 변경을 감지.
      - 변경이 감지되면, 해당 `userId`의 `fcmToken`을 조회하여 `admin.messaging().send()`로 알림을 발송.

---

## 3. 관리자용 긴급 삭제 기능

- **목표**: 관리자가 부적절한 차량 또는 상담 데이터를 즉시 삭제할 수 있는 기능을 제공하여 플랫폼의 신뢰도를 유지합니다.
- **핵심 구성 요소 (Agents)**:
  - **`Client Agent` (React Native App)**: 관리자에게만 노출되는 삭제 UI 및 확인 절차를 담당합니다.
  - **`Server Agent` (Firebase Backend)**: 실제 데이터 삭제 로직을 안전하게 수행하고 권한을 검증합니다.
- **세부 계획**:
  1.  **Client-Side**:
      - **UI 구현**: `AdminVehicleDetailScreen`, `AdminConsultationScreen`에 관리자 역할(`user.role === 'admin'`)일 때만 보이는 '삭제' 버튼을 추가합니다.
      - **확인 절차**: 삭제 버튼 클릭 시, 되돌릴 수 없는 작업임을 알리는 `Alert.alert` 확인 창을 표시합니다.
      - **API 호출**: `firebaseService.js`에 `deleteVehicle(vehicleId)`, `deleteConsultation(consultationId)` 함수를 추가하고, 이 함수들은 백엔드의 Callable Function을 호출하도록 구현합니다.
  2.  **Server-Side**:
      - **Callable Functions 구현**: `deleteVehicleAdmin`, `deleteConsultationAdmin`이라는 두 개의 HTTPS Callable Function을 `functions/index.js`에 생성합니다.
      - **권한 검증**: 각 함수의 시작 부분에서 호출자가 관리자(`context.auth.token.role === 'admin'`)인지 반드시 확인하고, 아닐 경우 즉시 에러를 반환합니다.
      - **삭제 로직 (차량)**: `deleteVehicleAdmin` 함수는 `vehicleId`를 받아 연결된 이미지를 Firebase Storage에서 먼저 삭제한 후, `vehicles` 컬렉션에서 해당 문서를 삭제합니다.
      - **삭제 로직 (상담)**: `deleteConsultationAdmin` 함수는 `consultationId`를 받아 `consultation_requests` 컬렉션에서 문서를 삭제합니다.

---

## 4. 다국어 지원 (i18n) 구조 설계

- **목표**: 앱의 모든 텍스트를 여러 언어(기본: 한국어, 영어)로 제공할 수 있는 기반을 마련하여 글로벌 사용자를 확보합니다.
- **핵심 구성 요소 (Agents)**:
  - **`Configuration Agent` (i18n 초기 설정)**: `i18next` 라이브러리 설치 및 설정을 담당합니다.
  - **`Translation Agent` (텍스트 변환)**: 하드코딩된 문자열을 번역 키로 대체하고, 언어별 리소스 파일을 관리합니다.
  - **`Language-Switching Agent` (언어 전환 UI)**: 사용자가 앱 내에서 언어를 변경할 수 있는 인터페이스를 제공합니다.
- **세부 계획**:
  1.  **환경 설정**: `i18next`, `react-i18next` 라이브러리를 설치하고, `src/i18n.js` 설정 파일을 생성하여 지원 언어, 기본 언어, 번역 리소스 경로 등을 구성합니다. 이 설정 파일을 `App.js`에서 불러옵니다.
  2.  **리소스 파일 생성**: `src/locales/ko/translation.json`, `src/locales/en/translation.json`과 같이 언어별 번역 파일을 생성합니다.
  3.  **코드 리팩토링**: 모든 컴포넌트의 하드코딩된 텍스트를 `useTranslation` 훅에서 제공하는 `t('key')` 함수로 대체합니다.
  4.  **언어 전환 UI 구현**: `MyPageScreen` 등에 언어를 선택할 수 있는 UI(예: Picker)를 추가하고, `i18n.changeLanguage()` 함수를 호출하여 언어를 동적으로 변경합니다. `AsyncStorage`를 사용해 사용자의 언어 설정을 기기에 저장하는 것을 권장합니다.

---

## 5. 이메일 알림 시스템 연동

- **목표**: 회원가입, 상담 확정 등 주요 이벤트 발생 시 사용자에게 이메일을 전송하여 중요 정보를 안정적으로 전달합니다.
- **핵심 구성 요소 (Agents)**:
  - **`Server Agent` (Firebase Backend)**: 이메일 전송을 위한 모든 백엔드 로직을 담당합니다. Client Agent는 관여하지 않습니다.
- **세부 계획**:
  1.  **환경 설정**: SendGrid, Mailgun 등 이메일 서비스의 API 키를 발급받아 `firebase functions:config:set` 명령으로 Firebase 환경 변수에 안전하게 저장합니다.
  2.  **Callable Function 구현**: `sendEmail`과 같은 재사용 가능한 HTTPS Callable Function을 생성합니다.
  3.  **트리거 연동**: 사용자 생성(`onCreate`) 또는 상담 상태 변경(`onUpdate`)을 감지하는 Firestore 트리거에서 `sendEmail` 함수를 호출하도록 로직을 구성합니다.
  4.  **이메일 발송 로직**: `sendEmail` 함수는 `to`, `subject`, `html` 등의 인자를 받아, 이메일 서비스의 Node.js SDK를 사용하여 실제 이메일을 발송합니다.

---

## 6. iOS 버전 호환성 확보

- **목표**: Android 우선으로 개발된 앱을 iOS 환경에서 완벽하게 동작하도록 만듭니다.
- **핵심 구성 요소 (Agents)**:
  - **`Environment Setup Agent`**: iOS 개발 환경 및 의존성 설정을 담당합니다.
  - **`Permission Configuration Agent`**: iOS 고유의 권한 설정을 처리합니다.
  - **`Build & Test Agent`**: iOS 빌드 및 기능 테스트를 수행합니다.
- **세부 계획**:
  1.  **개발 환경 설정**: `ios` 디렉터리에서 `bundle install` 및 `bundle exec pod install`을 실행하여 네이티브 의존성을 설치합니다. Xcode에서 서명 및 개발팀 설정을 완료합니다.
  2.  **`Info.plist` 설정**: `ios/JCarApp/Info.plist` 파일을 열어 사진 라이브러리 접근(`NSPhotoLibraryUsageDescription`), 알림(`Push Notifications`) 등 앱에 필요한 모든 권한에 대한 사용자 안내 문구를 추가합니다.
  3.  **빌드 및 테스트**: `npx react-native run-ios` 명령 또는 Xcode를 사용하여 시뮬레이터와 실제 기기에서 앱을 빌드하고, 모든 기능(이미지 업로드, 알림 수신 등)이 정상 동작하는지 전체 회귀 테스트를 진행하여 iOS 전용 버그를 수정합니다.

---

## 7. 테스트 코드 및 CI/CD 설정

- **목표**: 코드 품질을 향상시키고, 테스트 및 배포 과정을 자동화하여 개발 효율성을 극대화합니다.
- **핵심 구성 요소 (Agents)**:
  - **`Unit/Integration Testing Agent` (Jest)**: 핵심 로직에 대한 테스트 코드를 작성합니다.
  - **`CI/CD Pipeline Agent` (GitHub Actions)**: 코드 변경 시 자동으로 테스트와 빌드를 수행하는 파이프라인을 구축합니다.
- **세부 계획**:
  1.  **테스트 코드 작성**:
      - Jest와 React Native Testing Library를 사용하여 `utils`, `services` 등 핵심 로직과 주요 컴포넌트에 대한 단위/통합 테스트를 작성합니다.
      - Firebase 관련 로직은 Mocking하여 테스트합니다.
  2.  **CI/CD 파이프라인 구축**:
      - `.github/workflows/main.yml` 파일을 생성합니다.
      - main 브랜치에 `push` 또는 `pull_request`가 발생할 때마다 실행될 워크플로우를 정의합니다.
      - 워크플로우 단계에는 `Node.js 설치 -> npm ci (의존성 설치) -> npm run lint (린트 검사) -> npm test (테스트 실행)`가 포함됩니다.
      - (선택) `Android APK/AAB 빌드` 단계를 추가하여 릴리즈 빌드까지 자동화합니다.
