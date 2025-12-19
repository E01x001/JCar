# JCar 보안 검토 보고서

**검토 날짜:** 2025-12-11
**검토자:** Claude Code AI
**프로젝트:** JCar - React Native 중고차 거래 플랫폼

---

## 목차

1. [개요](#개요)
2. [CVE-2025-55182 취약점 분석](#cve-2025-55182-취약점-분석)
3. [React Native 및 Firebase 보안 취약점](#react-native-및-firebase-보안-취약점)
4. [브루트 포스 공격 방어 분석](#브루트-포스-공격-방어-분석)
5. [Firestore 보안 규칙 검토](#firestore-보안-규칙-검토)
6. [입력 검증 및 Injection 방어](#입력-검증-및-injection-방어)
7. [의존성 패키지 취약점](#의존성-패키지-취약점)
8. [보안 개선 권장사항](#보안-개선-권장사항)
9. [즉시 조치 필요 항목](#즉시-조치-필요-항목)

---

## 개요

본 문서는 JCar React Native 애플리케이션에 대한 종합 보안 검토 결과를 정리한 것입니다. 최신 보안 위협(CVE-2025-55182 포함)을 검토하고, Firebase Authentication 및 Firestore 보안 구성을 분석하였으며, 엔터프라이즈급 보안 모범 사례와 비교하여 개선 권장사항을 도출했습니다.

### 검토 범위

- CVE-2025-55182 (React2Shell) 취약점 영향 분석
- React Native 및 Firebase 관련 보안 취약점
- Firebase Authentication 브루트 포스 공격 방어 메커니즘
- Firestore 보안 규칙 및 데이터 접근 제어
- 사용자 입력 검증 및 Injection 공격 방어
- NPM 의존성 패키지 취약점 스캔
- 엔터프라이즈급 보안 기능 적용 여부

---

## CVE-2025-55182 취약점 분석

### 취약점 개요

- **CVE ID:** CVE-2025-55182 (일명 "React2Shell")
- **심각도:** CVSS 10.0 (Critical - 최대 위험도)
- **발표일:** 2025년 12월 3일
- **공격 복잡도:** 낮음 (인증 불필요, 사용자 상호작용 불필요)
- **영향:** 원격 코드 실행 (RCE)

### 기술적 세부사항

**원인:**
React Server Components (RSC)의 "Flight" 프로토콜에서 안전하지 않은 역직렬화(insecure deserialization) 취약점이 발견됨. 공격자가 제어하는 데이터가 서버 측 실행 로직에 영향을 미칠 수 있어 임의의 JavaScript 코드를 서버에서 실행 가능.

**영향받는 버전:**
- react-server-dom-parcel: 19.0, 19.1.0, 19.1.1, 19.2.0
- react-server-dom-webpack: 19.0, 19.1.0, 19.1.1, 19.2.0
- react-server-dom-turbopack: 19.0, 19.1.0, 19.1.1, 19.2.0

**주요 영향 프레임워크:**
Next.js (App Router 사용 시), React Router, Waku 등 서버 사이드 렌더링 프레임워크

### JCar 프로젝트 영향 분석

**결론: ✅ 영향 없음**

**이유:**

1. **React Native 환경:** JCar는 React Native CLI 기반 모바일 애플리케이션
2. **React 버전 확인:** `package.json`에서 React 18.3.1 사용 (취약 버전: React 19.x)
3. **서버 컴포넌트 미사용:** React Server Components는 Next.js와 같은 웹 프레임워크 전용 기능
4. **클라이언트 사이드 앱:** React Native 앱은 서버 사이드 렌더링을 수행하지 않음

### 공격 현황

- **활발한 악용 중:** 2025년 12월 4일부터 공개 PoC 익스플로잇 사용한 활발한 공격 관찰
- **영향 규모:** Wiz 데이터에 따르면 클라우드 환경의 39%가 취약한 버전 포함
- **위협 행위자:** 중국 국가안보부와 연관된 것으로 추정되는 공격자 그룹(Earth Lamia, Jackpot Panda 등) 활동 확인

### 참고자료

- [NVD - CVE-2025-55182](https://nvd.nist.gov/vuln/detail/CVE-2025-55182)
- [Wiz Blog - React2Shell Critical Vulnerability](https://www.wiz.io/blog/critical-vulnerability-in-react-cve-2025-55182)
- [Palo Alto Networks Unit 42 - Exploitation Analysis](https://unit42.paloaltonetworks.com/cve-2025-55182-react-and-cve-2025-66478-next/)

---

## React Native 및 Firebase 보안 취약점

### React Native 0.77.0 보안 상태

**현재 버전:** 0.77.0

**검토 결과:**
2025년 12월 기준으로 React Native 0.77.0에 대한 알려진 critical 또는 high severity 취약점은 발견되지 않았습니다. 그러나 outdated 패키지가 다수 존재합니다.

**Outdated 주요 패키지:**
```
react-native: 0.77.0 → 0.83.0 (최신)
@react-native-firebase/app: 23.5.0 → 23.7.0
@react-native-firebase/auth: 23.5.0 → 23.7.0
@react-native-firebase/firestore: 23.5.0 → 23.7.0
@react-native-firebase/functions: 23.5.0 → 23.7.0
@react-native-firebase/messaging: 23.5.0 → 23.7.0
@react-navigation/native: 7.1.6 → 7.1.25
@react-navigation/stack: 7.2.10 → 7.6.12
```

### Firebase 보안 구성 검토

**사용 중인 Firebase 서비스:**
- Firebase Authentication (이메일/비밀번호 인증)
- Cloud Firestore (데이터베이스)
- Cloud Functions v2 (서버리스 백엔드)
- Firebase Cloud Messaging (푸시 알림)
- Firebase Storage (이미지 저장)
- Firebase Crashlytics (에러 로깅)

**Firebase 보안 상태:**

✅ **잘 구현된 부분:**
- Firebase Authentication을 통한 인증 처리
- Firestore Security Rules를 통한 역할 기반 접근 제어(RBAC)
- Default deny-all 정책 적용
- serverTimestamp() 사용으로 일관된 타임스탬프 관리

⚠️ **개선 필요 부분:**
- Email Enumeration Protection 미적용
- Multi-Factor Authentication (MFA) 미구현
- API Quota 제한 기본값 사용 (브루트 포스 공격에 취약)
- Firebase App Check 미적용
- Rate Limiting 미구현

---

## 브루트 포스 공격 방어 분석

### 현재 구현 상태

**로그인 함수 분석 (firebaseService.js:39-50):**

```javascript
export const loginUser = async ({ email, password }) => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    return { success: true, userId: userCredential.user.uid };
  } catch (error) {
    console.error('로그인 실패:', error);
    crashlytics().recordError(error);
    crashlytics().log('loginUser failed');
    Alert.alert('로그인 오류', error.message || '알 수 없는 오류가 발생했습니다.');
    return { success: false, error };
  }
};
```

**발견된 보안 취약점:**

🔴 **Critical Issues:**

1. **Rate Limiting 미구현**
   - 로그인 시도 횟수 제한 없음
   - 동일 IP/계정에 대한 연속 시도 방지 메커니즘 부재
   - 무제한 브루트 포스 공격 가능

2. **Account Lockout 미구현**
   - 일정 횟수 로그인 실패 시 계정 잠금 기능 없음
   - 사전 공격(Dictionary Attack)에 취약

3. **Suspicious Activity Monitoring 부재**
   - 비정상적인 로그인 패턴 탐지 없음
   - 로그인 시도 로깅 없음

4. **CAPTCHA/Bot Protection 미적용**
   - 자동화된 봇 공격 방어 없음

### Firebase의 기본 보안 기능

Firebase Authentication은 몇 가지 기본 보안 기능을 제공하지만 충분하지 않습니다:

**Firebase 기본 제공 기능:**
- 너무 많은 실패한 로그인 시도 시 계정 자동 잠금 (threshold 비공개)
- IP 기반 이상 활동 탐지 (제한적)

**부족한 부분:**
- 개발자가 명시적으로 설정하지 않으면 충분한 보호 제공 안 함
- Identity Toolkit API quota 제한이 기본값으로 설정되어 있어 대규모 공격에 취약

### 엔터프라이즈급 보안 기준과의 비교

**일반적인 기업 보안 기준:**

1. **Rate Limiting:**
   - ✅ 필수
   - ❌ 미구현

2. **Account Lockout:**
   - ✅ 5-10회 실패 시 일시적 또는 영구 잠금
   - ❌ 미구현

3. **Multi-Factor Authentication:**
   - ✅ 금융/의료 데이터 취급 시 필수
   - ❌ 미구현

4. **CAPTCHA/reCAPTCHA:**
   - ✅ 로그인, 회원가입, 비밀번호 재설정 시 적용
   - ❌ 미구현

5. **Security Monitoring:**
   - ✅ 로그인 시도, 이상 활동 실시간 모니터링
   - ❌ 미구현 (Crashlytics만 에러 로깅)

6. **IP Blocking/Geolocation:**
   - ✅ 의심스러운 IP/지역 차단
   - ❌ 미구현

7. **Password Policy:**
   - ✅ 최소 10-12자, 복잡도 요구사항
   - ⚠️ 부분 구현 (Firebase 기본 6자 이상만 적용)

### Firebase 권장 보안 조치

**Firebase Security Checklist에 따른 권장사항:**

1. **Email Enumeration Protection 활성화**
   - Google Cloud Identity Platform으로 업그레이드 필요
   - 공격자가 계정 존재 여부를 확인하는 것 방지

2. **Identity Toolkit API Quota 강화**
   - `identitytoolkit.googleapis.com` 엔드포인트의 기본 quota 축소
   - Google Cloud Console에서 설정 가능

3. **Multi-Factor Authentication (MFA) 구현**
   - Identity Platform으로 업그레이드하여 2FA/MFA 지원
   - SMS, TOTP(Google Authenticator), 이메일 인증 중 선택

4. **Firebase App Check 적용**
   - 앱에서만 API 요청 가능하도록 제한
   - 웹 스크래핑 및 봇 공격 방어

5. **강력한 Password Policy 설정**
   - 최소 10자 이상
   - 대소문자, 숫자, 특수문자 조합 필수
   - Identity Platform의 Password Policy 기능 사용

### 참고자료

- [Firebase Security Checklist](https://firebase.google.com/support/guides/security-checklist)
- [Defending Firebase Authentication Against Brute Force](https://medium.com/@tempmailwithpassword/thwarting-brute-force-attacks-on-firebase-authentication-888e1dd01b99)
- [Firebase Authentication Best Practices](https://climbtheladder.com/10-firebase-authentication-best-practices/)

---

## Firestore 보안 규칙 검토

### 현재 Firestore Security Rules 분석

**전체 평가: ✅ 양호 (몇 가지 개선 필요)**

### 구현된 보안 기능

✅ **잘 구현된 부분:**

1. **Helper Functions for Role-Based Access Control (RBAC)**
   ```javascript
   function isAdmin() {
     return request.auth != null &&
            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
   }

   function isActiveUser() {
     return request.auth != null &&
            (!exists(/databases/$(database)/documents/users/$(request.auth.uid)) ||
             !('status' in get(/databases/$(database)/documents/users/$(request.auth.uid)).data) ||
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status != 'suspended');
   }
   ```
   - 명확한 역할 분리 (admin/user)
   - suspended 사용자 차단

2. **Users Collection (lines 20-24)**
   - ✅ 사용자는 자신의 문서만 읽기/쓰기 가능
   - ✅ 관리자는 모든 사용자 문서 접근 가능

3. **Vehicles Collection (lines 27-53)**
   - ✅ 인증된 사용자만 차량 조회 가능
   - ✅ 차량 등록 시 sellerId 검증
   - ✅ 소유자 또는 관리자만 수정/삭제 가능
   - ✅ 필수 필드 검증 (vehicleId, vehicleName, manufacturer, sellerId)

4. **Consultation Requests Collection (lines 58-98)**
   - ✅ 사용자는 자신의 상담 요청만 조회
   - ✅ 사용자는 자신의 상담만 생성 가능
   - ✅ 관리자는 모든 상담 관리 가능
   - ✅ 사용자 상담 취소 제한적 허용 (pending/approved/meeting 상태만)
   - ✅ 거절된 상담 재제출 허용 (특정 조건)
   - ✅ 재제출 시 관리자 전용 필드 수정 방지

5. **Admin Activity Log (lines 100-110)**
   - ✅ 관리자만 로그 읽기/생성
   - ✅ 로그 수정/삭제 불가 (감사 추적 보호)

6. **Admin Owned Vehicles (lines 112-125)**
   - ✅ 관리자만 접근 가능

7. **Default Deny-All Policy (lines 127-130)**
   - ✅ 명시되지 않은 모든 컬렉션 접근 차단

### 보안 개선 필요 사항

⚠️ **개선 필요 부분:**

1. **Field-Level Security 제한**

   **현재 문제 (lines 60-63):**
   ```javascript
   // Note: Client code must filter out adminMemo field for non-admin users as
   // Firestore doesn't support field-level read permissions
   allow read: if request.auth != null &&
     (request.auth.uid == resource.data.userId || isAdmin());
   ```

   - Firestore는 필드 단위 읽기 권한을 지원하지 않음
   - adminMemo가 일반 사용자에게 노출될 위험
   - 클라이언트 코드에서 필터링해야 함 (클라이언트 신뢰 문제)

   **권장 해결책:**
   - adminMemo를 별도 sub-collection으로 분리
   - 예: `consultation_requests/{requestId}/admin_notes/{noteId}`
   - 관리자만 admin_notes sub-collection 접근 가능하도록 규칙 설정

2. **Data Validation 강화**

   **누락된 검증:**
   - 이메일 형식 검증
   - 전화번호 형식 검증
   - 날짜/시간 형식 검증
   - 문자열 길이 제한

   **권장 추가 규칙 (예시):**
   ```javascript
   // Consultation request validation
   allow create: if request.auth != null &&
     isActiveUser() &&
     request.auth.uid == request.resource.data.userId &&
     request.resource.data.preferredDate.matches('^\\d{4}-\\d{2}-\\d{2}$') &&
     request.resource.data.preferredTime.matches('^\\d{2}:\\d{2}$') &&
     request.resource.data.type in ['buy', 'sell'] &&
     request.resource.data.status == 'pending';
   ```

3. **Rate Limiting 미적용**
   - Firestore Security Rules는 요청 빈도 제한 불가
   - Cloud Functions 또는 App Check로 보완 필요

4. **Data Size Limits**
   - 문자열 필드 최대 길이 검증 없음
   - 대용량 데이터 삽입 방지 필요

   **권장 추가:**
   ```javascript
   request.resource.data.adminMemo.size() < 5000 &&  // 5KB 제한
   request.resource.data.vehicleName.size() < 100
   ```

### 추가 보안 권장사항

1. **User Document Creation 제한**
   - 현재 users 컬렉션 생성 규칙 없음
   - registerUser 함수에서만 생성하지만 규칙 레벨에서 보호 필요

   ```javascript
   match /users/{userId} {
     allow create: if request.auth != null &&
                   request.auth.uid == userId &&
                   request.resource.data.role == 'user' &&  // 관리자 자가 승격 방지
                   request.resource.data.keys().hasOnly(['name', 'phoneNumber', 'role', 'createdAt']);
   }
   ```

2. **Timestamp Validation**
   - createdAt, updatedAt 필드 조작 방지
   - serverTimestamp() 사용 강제

3. **Admin Role Escalation 방지**
   - 사용자가 자신의 role을 admin으로 변경하는 것 방지

   ```javascript
   allow update: if request.auth != null &&
                 request.auth.uid == userId &&
                 request.resource.data.role == resource.data.role;  // role 변경 불가
   ```

### 참고자료

- [Firestore Security Rules - Best Practices](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Common Security Rules Patterns](https://firebase.google.com/docs/firestore/security/rules-structure)

---

## 입력 검증 및 Injection 방어

### XSS (Cross-Site Scripting) 방어

**현재 상태: ✅ 양호**

**이유:**
- React Native는 웹 브라우저의 DOM을 사용하지 않음
- 모든 텍스트는 네이티브 Text 컴포넌트로 렌더링됨
- HTML 인젝션 불가능
- `dangerouslySetInnerHTML` 미사용

**검증된 컴포넌트:**
- InputField, Button, Card 등 모든 사용자 입력이 React Native 컴포넌트 통해 처리
- WebView 컴포넌트 미사용 (HTML 렌더링 없음)

### SQL Injection 방어

**현재 상태: ✅ 양호**

**이유:**
- Firestore는 NoSQL 데이터베이스로 SQL 인젝션 불가능
- 모든 쿼리가 Firestore SDK를 통해 파라미터화됨
- 직접적인 쿼리 문자열 조작 없음

**검증된 쿼리 예시 (firebaseService.js):**
```javascript
await firestore().collection('consultation_requests').add(validData);
await firestore().collection('users').doc(userId).set({ ... });
```

### NoSQL Injection 방어

**현재 상태: ⚠️ 주의 필요**

**발견된 문제:**

1. **사용자 입력 sanitization 부족**

   **LoginScreen.js 분석 (lines 23-52):**
   ```javascript
   const handleLogin = async () => {
     // 빈 값 체크
     if (!email) {
       setEmailError('이메일 주소를 입력해주세요.');
       return;
     }

     // 이메일 형식 검증
     if (!validateEmail(email)) {
       setEmailError('올바른 이메일 형식이 아닙니다.');
       return;
     }

     // ❌ email, password trim() 미적용
     await auth().signInWithEmailAndPassword(email, password);
   }
   ```

   **문제점:**
   - 입력값에 `trim()` 미적용
   - 앞뒤 공백이 포함된 이메일/비밀번호로 계정 생성 가능
   - 일관성 없는 인증 문제 발생 가능

2. **특수 문자 검증 부족**

   **saveConsultationRequest 함수 (firebaseService.js:55-84):**
   ```javascript
   const validData = {
     userId: data.userId || null,
     userName: data.userName || '익명',  // ❌ Sanitization 없음
     userPhone: data.userPhone || '미등록',  // ❌ 형식 검증 없음
     vehicleName: data.vehicleName || '알 수 없음',  // ❌ Sanitization 없음
     // ...
   };
   ```

   **위험:**
   - 특수 문자, 이모지, 제어 문자 삽입 가능
   - Firestore는 대부분의 문자 허용하지만 UI 렌더링 시 문제 발생 가능
   - 데이터 정합성 문제

3. **Admin Memo/Rejection Reason 검증 부족**

   **AdminMemoModal, RejectConsultationModal:**
   - 메모 길이 제한 없음
   - 특수 문자 필터링 없음
   - 대용량 텍스트 삽입 시 성능 문제 가능

### 입력 검증 현황 요약

**구현된 검증:**

✅ **LoginScreen.js:**
- 이메일 형식 검증 (정규표현식)
- 빈 값 체크

⚠️ **미흡한 검증:**

1. **문자열 정규화 부족:**
   - `trim()` 미적용
   - 대소문자 정규화 없음

2. **전화번호 검증:**
   - 형식 검증 없음
   - 국가 코드 처리 없음

3. **날짜/시간 검증:**
   - 클라이언트 측에서만 검증
   - Firestore rules에 추가 검증 없음

4. **파일 업로드 검증:**
   - 파일 크기 제한 없음 (코드 확인 필요)
   - MIME 타입 검증 확인 필요
   - 이미지 메타데이터 sanitization 필요

### 권장 개선사항

**1. 입력값 Sanitization 함수 생성 (src/utils/validation.js):**

```javascript
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .trim()
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')  // 제어 문자 제거
    .slice(0, 5000);  // 최대 길이 제한
};

export const validateEmail = (email) => {
  const trimmed = email.trim().toLowerCase();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(trimmed) ? trimmed : null;
};

export const validatePhone = (phone) => {
  const cleaned = phone.replace(/[^0-9]/g, '');
  const regex = /^01[0-9]{8,9}$/;  // 한국 휴대폰 번호
  return regex.test(cleaned) ? cleaned : null;
};

export const validateDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

export const validateTime = (timeString) => {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(timeString);
};
```

**2. 모든 사용자 입력에 적용:**

```javascript
// LoginScreen.js
import { sanitizeInput, validateEmail } from '../utils/validation';

const handleLogin = async () => {
  const sanitizedEmail = sanitizeInput(email);
  const validatedEmail = validateEmail(sanitizedEmail);

  if (!validatedEmail) {
    setEmailError('올바른 이메일 형식이 아닙니다.');
    return;
  }

  const sanitizedPassword = sanitizeInput(password);

  await auth().signInWithEmailAndPassword(validatedEmail, sanitizedPassword);
};
```

**3. Firestore Security Rules에 추가 검증:**

```javascript
match /consultation_requests/{requestId} {
  allow create: if request.auth != null &&
    isActiveUser() &&
    request.auth.uid == request.resource.data.userId &&
    request.resource.data.userName.size() < 100 &&
    request.resource.data.userPhone.size() < 20 &&
    request.resource.data.preferredDate.matches('^\\d{4}-\\d{2}-\\d{2}$') &&
    request.resource.data.preferredTime.matches('^\\d{2}:\\d{2}$');
}
```

---

## 의존성 패키지 취약점

### NPM Audit 결과

**검사 일시:** 2025-12-11
**총 취약점:** 6개 (Low: 4, Moderate: 1, High: 1)

### 발견된 취약점 상세

#### 1. 🔴 High Severity: node-forge (CVSS 8.6)

**패키지:** node-forge <= 1.3.1
**현재 버전:** 확인 필요
**최신 버전:** 1.3.2+

**취약점:**
1. **CVE-2025-XXXXX:** ASN.1 Unbounded Recursion
   - DoS 공격 가능
   - CWE-674

2. **GHSA-5gfm-wpxj-wjgq:** ASN.1 Validator Desynchronization
   - CVSS: 8.6
   - 공격자가 ASN.1 인증서 검증 우회 가능
   - CWE-436 (Interpretation Conflict)

3. **GHSA-65ch-62r8-g69g:** ASN.1 OID Integer Truncation
   - CWE-190 (Integer Overflow)

**영향:** node-forge는 암호화 작업에 사용되므로 매우 중요
**권장 조치:** 즉시 1.3.2 이상으로 업그레이드

```bash
npm update node-forge
```

#### 2. 🟡 Moderate Severity: js-yaml (CVSS 5.3)

**패키지:** js-yaml <3.14.2 또는 >=4.0.0 <4.1.1
**취약점:** GHSA-mh29-5h37-fv8m (Prototype Pollution)

**설명:**
- YAML 파일 파싱 시 프로토타입 오염 가능
- `merge (<<)` 기능 악용
- CWE-1321

**영향:** 설정 파일 파싱에 사용되는 경우 위험
**권장 조치:** 3.14.2 이상 또는 4.1.1 이상으로 업그레이드

```bash
npm update js-yaml
```

#### 3. 🟢 Low Severity: brace-expansion (CVSS 3.1)

**패키지:** brace-expansion 1.0.0 - 1.1.11, 2.0.0 - 2.0.1
**취약점:** GHSA-v6h2-p8h4-qcjw (ReDoS)

**설명:**
- 정규표현식 DoS (Regular Expression Denial of Service)
- 특정 패턴 입력 시 CPU 과다 사용
- CWE-400

**영향:** 간접 의존성, 낮은 위험도
**권장 조치:** `npm audit fix` 실행

#### 4. 🟢 Low Severity: compression (CVSS 미공개)

**패키지:** compression 1.0.3 - 1.8.0
**취약점:** on-headers 의존성 문제

**설명:**
- HTTP 응답 헤더 조작 가능
- CWE-241

**영향:** 서버 사이드에서만 영향 (React Native 앱에는 직접 영향 없음)
**권장 조치:** `npm audit fix` 실행

#### 5. 🟢 Low Severity: on-headers (CVSS 3.4)

**패키지:** on-headers <1.1.0
**취약점:** GHSA-76c9-3jph-rj3q

**설명:**
- HTTP 응답 헤더 조작 취약점
- 로컬 공격자가 높은 권한으로 악용 가능

**영향:** 서버 사이드에서만 영향
**권장 조치:** `npm audit fix` 실행

#### 6. 🟢 Low Severity: tmp (CVSS 2.5)

**패키지:** tmp <=0.2.3
**취약점:** GHSA-52f5-9888-hmc6

**설명:**
- 심볼릭 링크를 통한 임시 파일/디렉토리 쓰기 조작
- CWE-59 (Improper Link Resolution)

**영향:** 로컬 공격에만 취약
**권장 조치:** `npm audit fix` 실행

### 자동 수정 가능 여부

**모든 취약점이 자동 수정 가능:**

```bash
npm audit fix
```

**강제 업데이트 (breaking changes 포함):**

```bash
npm audit fix --force
```

⚠️ **주의:** `--force` 옵션은 주요 버전 업그레이드를 수행하므로 테스트 필수

### Outdated 패키지 업데이트 권장

**주요 보안 관련 패키지:**

```bash
# Firebase 패키지 업데이트 (23.5.0 → 23.7.0)
npm update @react-native-firebase/app @react-native-firebase/auth \
  @react-native-firebase/firestore @react-native-firebase/functions \
  @react-native-firebase/messaging @react-native-firebase/storage

# React Native 업데이트 (0.77.0 → 0.83.0)
# ⚠️ 주의: 메이저 업그레이드, 테스트 필수
npx react-native upgrade

# Navigation 업데이트
npm update @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
```

### 지속적인 보안 모니터링 권장

**1. GitHub Dependabot 활성화:**
- 자동 보안 업데이트 PR 생성
- .github/dependabot.yml 설정

**2. npm audit 정기 실행:**
```bash
# package.json scripts에 추가
{
  "scripts": {
    "security-check": "npm audit && npm outdated"
  }
}
```

**3. Snyk 통합 (선택사항):**
- 실시간 취약점 모니터링
- CI/CD 파이프라인 통합

---

## 보안 개선 권장사항

### 우선순위별 개선 사항

#### 🔴 Critical (즉시 조치 필요)

1. **브루트 포스 공격 방어 구현**

   **문제:** 로그인 시도 제한 없음

   **해결 방법:**

   a. **Firebase Identity Platform 업그레이드**
   - Email Enumeration Protection 활성화
   - Identity Toolkit API quota 제한 강화
   - 비용: 월 $0.0055/MAU (Monthly Active User)

   b. **Cloud Functions Rate Limiting 구현**

   ```javascript
   // functions/src/rateLimiting.ts
   import * as admin from 'firebase-admin';

   const MAX_LOGIN_ATTEMPTS = 5;
   const LOCKOUT_DURATION = 15 * 60 * 1000; // 15분

   export const checkRateLimit = async (email: string): Promise<boolean> => {
     const rateLimitDoc = admin.firestore()
       .collection('rate_limits')
       .doc(email);

     const doc = await rateLimitDoc.get();
     const now = Date.now();

     if (!doc.exists) {
       await rateLimitDoc.set({
         attempts: 1,
         firstAttempt: now,
         lockedUntil: null
       });
       return true;
     }

     const data = doc.data();

     // 잠금 확인
     if (data.lockedUntil && now < data.lockedUntil) {
       throw new Error(`계정이 잠겨있습니다. ${Math.ceil((data.lockedUntil - now) / 60000)}분 후 다시 시도하세요.`);
     }

     // 15분 경과 시 초기화
     if (now - data.firstAttempt > 15 * 60 * 1000) {
       await rateLimitDoc.set({
         attempts: 1,
         firstAttempt: now,
         lockedUntil: null
       });
       return true;
     }

     // 시도 횟수 증가
     const newAttempts = data.attempts + 1;

     if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
       await rateLimitDoc.update({
         attempts: newAttempts,
         lockedUntil: now + LOCKOUT_DURATION
       });
       throw new Error('로그인 시도 횟수 초과. 15분 후 다시 시도하세요.');
     }

     await rateLimitDoc.update({ attempts: newAttempts });
     return true;
   };
   ```

   c. **클라이언트 통합 (firebaseService.js)**

   ```javascript
   export const loginUser = async ({ email, password }) => {
     try {
       // Rate limiting 체크
       const checkRateLimit = functions().httpsCallable('checkRateLimit');
       await checkRateLimit({ email });

       const userCredential = await auth().signInWithEmailAndPassword(email, password);

       // 성공 시 rate limit 초기화
       const resetRateLimit = functions().httpsCallable('resetRateLimit');
       await resetRateLimit({ email });

       return { success: true, userId: userCredential.user.uid };
     } catch (error) {
       // ...
     }
   };
   ```

2. **의존성 패키지 취약점 수정**

   ```bash
   npm audit fix
   npm update node-forge  # Critical
   npm update js-yaml     # Moderate
   ```

3. **입력값 Sanitization 적용**

   - 모든 사용자 입력에 `trim()` 적용
   - 특수 문자 필터링
   - validation.js 유틸리티 생성 및 적용

#### 🟡 High (1주일 이내)

4. **Firebase App Check 구현**

   **App Check란?**
   - 앱의 정당성을 검증하여 봇/스크래핑 방지
   - reCAPTCHA Enterprise, Play Integrity, App Attest 지원

   **구현 방법:**

   ```bash
   npm install @react-native-firebase/app-check
   ```

   ```javascript
   // src/App.js
   import appCheck from '@react-native-firebase/app-check';

   // 초기화
   appCheck()
     .initializeAppCheck({
       provider: __DEV__ ? appCheck.newDebugProvider() : appCheck.newPlayIntegrityProvider(),
       isTokenAutoRefreshEnabled: true
     });
   ```

5. **Password Policy 강화**

   **현재:** Firebase 기본 6자 이상

   **권장:**
   - 최소 10자 이상
   - 대문자, 소문자, 숫자, 특수문자 중 3가지 이상 포함

   **구현 (RegisterScreen.js):**

   ```javascript
   const validatePassword = (password) => {
     if (password.length < 10) {
       return '비밀번호는 최소 10자 이상이어야 합니다.';
     }

     let complexity = 0;
     if (/[a-z]/.test(password)) complexity++;
     if (/[A-Z]/.test(password)) complexity++;
     if (/[0-9]/.test(password)) complexity++;
     if (/[^a-zA-Z0-9]/.test(password)) complexity++;

     if (complexity < 3) {
       return '대문자, 소문자, 숫자, 특수문자 중 3가지 이상 포함해야 합니다.';
     }

     return null;
   };
   ```

6. **Firestore Security Rules 개선**

   - adminMemo를 sub-collection으로 분리
   - 데이터 길이 검증 추가
   - 날짜/시간 형식 검증 추가
   - role escalation 방지 규칙 추가

#### 🟢 Medium (1개월 이내)

7. **Multi-Factor Authentication (MFA) 구현**

   - Firebase Identity Platform으로 업그레이드
   - SMS 또는 TOTP 기반 2FA 구현
   - 관리자 계정은 MFA 필수화

8. **Security Monitoring 및 Logging**

   **구현할 로깅:**
   - 로그인 성공/실패
   - 비정상적인 활동 (짧은 시간 내 다수 요청)
   - 관리자 작업 (차량 승인/거절, 상담 관리)
   - 민감한 데이터 접근

   **도구:**
   - Firebase Analytics
   - Cloud Logging
   - Sentry (선택)

9. **API Key 보호 강화**

   - API Key에 앱 패키지명 제한 적용
   - Google Cloud Console에서 API 키 제한 설정
   - iOS: Bundle ID 제한
   - Android: 패키지명 + SHA-1 지문 제한

10. **파일 업로드 보안 강화**

    - 파일 크기 제한 (예: 10MB)
    - MIME 타입 검증
    - 이미지 메타데이터 제거 (EXIF)
    - 악성 파일 스캔 (Cloud Functions + VirusTotal API)

#### 🔵 Low (3개월 이내)

11. **HTTPS Pinning (Certificate Pinning)**

    - 중간자 공격 (MITM) 방지
    - react-native-ssl-pinning 라이브러리 사용

12. **Code Obfuscation**

    - ProGuard (Android)
    - 소스 코드 난독화로 리버스 엔지니어링 방지

13. **Biometric Authentication**

    - 지문/얼굴 인식 로그인 지원
    - react-native-biometrics 라이브러리

14. **Session Management 개선**

    - 세션 타임아웃 설정
    - 동시 로그인 제한
    - 강제 로그아웃 기능

---

## 즉시 조치 필요 항목

### 1주일 이내 필수 조치

#### 1. 의존성 취약점 수정 (소요 시간: 30분)

```bash
# 1. 자동 수정 실행
npm audit fix

# 2. 취약점 재확인
npm audit

# 3. 업데이트 테스트
npm test
npm run android  # 빌드 및 실행 테스트
```

**예상 영향:**
- 대부분 자동 수정 가능
- Breaking changes 가능성 낮음
- 테스트 필수

#### 2. 입력값 Sanitization 적용 (소요 시간: 2시간)

**작업 순서:**

a. `src/utils/validation.js` 생성 (위 코드 참조)

b. 모든 인증 화면에 적용:
   - LoginScreen.js
   - RegisterScreen.js
   - ForgotPasswordScreen.js

c. firebaseService.js의 모든 함수에 적용:
   - registerUser
   - saveConsultationRequest
   - 기타 사용자 입력 처리 함수

**예상 영향:**
- 기존 데이터와 호환성 문제 없음
- 새로운 입력값만 sanitization 적용
- 사용자 경험 영향 없음

#### 3. 브루트 포스 방어 구현 (소요 시간: 4시간)

**Phase 1: Cloud Functions Rate Limiting**
- functions/src/rateLimiting.ts 생성
- checkRateLimit, resetRateLimit 함수 구현
- 배포: `firebase deploy --only functions`

**Phase 2: 클라이언트 통합**
- firebaseService.js의 loginUser 함수 수정
- 에러 메시지 사용자 친화적으로 표시

**Phase 3: 테스트**
- 5회 실패 시 잠금 확인
- 15분 후 자동 해제 확인
- 성공 로그인 시 초기화 확인

**예상 영향:**
- 사용자: 5회 실패 시 15분 대기
- 공격자: 브루트 포스 공격 차단

#### 4. Firebase 패키지 업데이트 (소요 시간: 1시간)

```bash
npm update @react-native-firebase/app @react-native-firebase/auth \
  @react-native-firebase/firestore @react-native-firebase/functions \
  @react-native-firebase/messaging @react-native-firebase/storage

# 네이티브 의존성 동기화
cd android && ./gradlew clean
cd .. && npm run android
```

**예상 영향:**
- 보안 패치 적용
- 버그 수정
- Breaking changes 없음 (마이너 업데이트)

---

## 보안 체크리스트

### 배포 전 필수 확인사항

- [ ] npm audit 실행 및 모든 취약점 수정
- [ ] Firebase 패키지 최신 버전 업데이트
- [ ] 모든 사용자 입력에 sanitization 적용
- [ ] 브루트 포스 방어 메커니즘 구현
- [ ] Firestore Security Rules 검증
- [ ] API Key 제한 설정 (패키지명, SHA-1)
- [ ] Firebase App Check 활성화
- [ ] Password Policy 강화
- [ ] 파일 업로드 크기/타입 제한
- [ ] HTTPS만 사용 (HTTP 차단)
- [ ] ProGuard/R8 활성화 (Android 릴리즈 빌드)
- [ ] 민감 정보 로그 제거 (API 키, 비밀번호 등)
- [ ] .gitignore에 민감 파일 추가 (.env, keystore 등)

### 정기 보안 점검 (월 1회)

- [ ] npm audit 실행
- [ ] Firebase Console에서 이상 활동 확인
- [ ] Cloud Logging 검토
- [ ] Crashlytics 에러 리포트 분석
- [ ] 의존성 패키지 업데이트 검토
- [ ] Firestore 보안 규칙 검토
- [ ] 사용자 피드백 중 보안 관련 이슈 확인

---

## 참고 문서

### Firebase 보안

- [Firebase Security Checklist](https://firebase.google.com/support/guides/security-checklist)
- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication Best Practices](https://firebase.blog/posts/2020/10/password-sign-in-best-practices/)

### React Native 보안

- [React Native Security Best Practices](https://reactnative.dev/docs/security)
- [OWASP Mobile Security Testing Guide](https://owasp.org/www-project-mobile-security-testing-guide/)

### 취약점 데이터베이스

- [NVD - National Vulnerability Database](https://nvd.nist.gov/)
- [Snyk Vulnerability Database](https://security.snyk.io/)
- [GitHub Advisory Database](https://github.com/advisories)

---

## 결론

JCar 애플리케이션은 **전반적으로 양호한 보안 수준**을 유지하고 있으나, **브루트 포스 공격 방어** 및 **입력값 검증** 부분에서 개선이 필요합니다.

**주요 발견사항:**

✅ **잘 구현된 부분:**
- CVE-2025-55182 취약점 영향 없음 (React Native 환경)
- Firestore Security Rules를 통한 강력한 접근 제어
- XSS/SQL Injection 위험 낮음
- 역할 기반 접근 제어 (RBAC) 잘 구현됨

⚠️ **개선 필요 부분:**
- 브루트 포스 공격 방어 미구현 (Critical)
- Rate Limiting 부재 (Critical)
- 입력값 Sanitization 부족 (High)
- MFA 미구현 (Medium)
- 의존성 패키지 취약점 6개 (1 High, 1 Moderate, 4 Low)

**즉시 조치 권장:**
1. npm audit fix 실행 (30분)
2. 브루트 포스 방어 구현 (4시간)
3. 입력값 Sanitization 적용 (2시간)
4. Firebase 패키지 업데이트 (1시간)

**총 예상 소요 시간:** 약 7.5시간

**장기 로드맵:**
- 1주: Critical/High 항목 완료
- 1개월: Medium 항목 완료 (MFA, Monitoring)
- 3개월: Low 항목 완료 (HTTPS Pinning, Code Obfuscation)

본 보고서의 권장사항을 순차적으로 적용하면 엔터프라이즈급 보안 수준에 도달할 수 있습니다.

---

**보고서 버전:** 1.0
**다음 검토 예정일:** 2026-01-11
