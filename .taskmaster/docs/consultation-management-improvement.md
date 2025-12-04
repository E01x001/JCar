# 상담 관리 시스템 개선 PRD

## 프로젝트 개요
관리자의 상담 관리 시스템을 개선하여 상담 타입별 관리, 거래 상태 추적, 월별 실적 확인, 그리고 관리자 소유 차량 관리 기능을 구현합니다.

## 목표
1. 상담을 타입별로 관리 (구매상담/판매상담/거래완료)
2. 상담 상태를 채결/보류/거절로 세분화하여 관리
3. 거래완료된 상담을 월별 실적으로 확인
4. 판매상담에서 채결된 차량을 관리자 소유 차량으로 자동 등록
5. 관리자 마이페이지에서 소유 차량 목록 조회

## 기술 스택
- React Native 0.79.x
- Firebase Firestore (쿼리, 트랜잭션)
- react-native-tab-view
- JCar Design System (Card, Badge, Button, StateScreen)

## 상세 요구사항

### 1. Firestore 데이터 구조 설계

#### 1.1 consultation_requests 컬렉션 필드 추가
기존 필드:
- userId, userName, userPhone
- vehicleId, vehicleName
- preferredDate, preferredTime
- status: 'pending' | 'approved' | 'rejected'
- type: 'buy' | 'sell'
- createdAt

추가 필드:
- **consultationStatus**: 'pending' | 'confirmed' | 'on-hold' | 'rejected' | 'completed'
  - pending: 초기 상태 (관리자 미처리)
  - confirmed: 채결 (상담 진행 확정)
  - on-hold: 보류 (잠시 대기)
  - rejected: 거절 (상담 불가)
  - completed: 거래완료 (최종 완료)
- **completedAt**: Timestamp | null (거래완료 시점)
- **completedBy**: string | null (처리한 관리자 ID)
- **dealAmount**: number | null (거래 금액 - 거래완료 시 입력)
- **adminNotes**: string (관리자 메모)

#### 1.2 admin_owned_vehicles 컬렉션 신규 생성
판매상담에서 채결된 차량을 관리자가 매입한 것으로 기록:
- **vehicleId**: string (원본 차량 ID)
- **vehicleName**: string
- **purchasePrice**: number (매입 가격)
- **purchaseDate**: Timestamp
- **consultationId**: string (연관된 상담 ID)
- **previousOwnerId**: string (이전 소유자 ID)
- **previousOwnerName**: string
- **status**: 'owned' | 'sold' (소유중/판매완료)
- **soldDate**: Timestamp | null
- **soldPrice**: number | null
- **createdAt**: Timestamp

### 2. AdminConsultationScreen 탭 구조 변경

#### 2.1 기존 탭 구조
- 대기중 (status === 'pending')
- 승인됨 (status === 'approved')
- 거절됨 (status === 'rejected')

#### 2.2 신규 탭 구조
- **구매상담 탭**: type !== 'sell' && consultationStatus !== 'completed'
- **판매상담 탭**: type === 'sell' && consultationStatus !== 'completed'
- **거래완료 탭**: consultationStatus === 'completed'

#### 2.3 각 탭의 기능
**구매상담 탭**:
- 구매 의사가 있는 고객의 상담 목록
- 상태 변경: 채결/보류/거절 버튼
- 채결 시 상담 일정 확정
- 최종 채결 시 "거래완료" 처리 가능 (거래 금액 입력 모달)

**판매상담 탭**:
- 차량을 판매하려는 고객의 상담 목록
- 상태 변경: 채결/보류/거절 버튼
- 채결 후 거래완료 시:
  - 거래 금액 입력 모달
  - admin_owned_vehicles 컬렉션에 차량 추가
  - 원본 vehicles 컬렉션의 status를 'sold'로 변경

**거래완료 탭**:
- consultationStatus === 'completed'인 모든 상담
- 월별 필터링 기능 (드롭다운 또는 달력)
- 거래 타입별 필터 (전체/구매/판매)
- 총 거래 금액 표시
- 거래 건수 통계

### 3. 상담 상태 변경 UI/UX

#### 3.1 상담 카드 디자인
각 상담 항목에 표시할 정보:
- 차량명, 차량 이미지 썸네일
- 고객 정보 (이름, 전화번호)
- 희망 상담 일시
- 현재 상태 Badge (pending/confirmed/on-hold/rejected)
- 생성일시
- 관리자 메모 (있는 경우)

#### 3.2 상태 변경 버튼
상담 상태에 따라 표시되는 버튼:
- **pending 상태**:
  - [채결] [보류] [거절] 버튼
- **confirmed 상태**:
  - [보류로 변경] [거절로 변경] [거래완료] 버튼
- **on-hold 상태**:
  - [채결로 변경] [거절로 변경] 버튼
- **rejected 상태**:
  - [재검토] 버튼 (pending으로 복원)

#### 3.3 거래완료 처리 모달
[거래완료] 버튼 클릭 시 표시:
- 거래 금액 입력 (필수)
- 관리자 메모 (선택)
- [확인] [취소] 버튼

판매상담의 경우 추가 확인:
- "이 차량을 관리자 소유 차량으로 등록하시겠습니까?" 체크박스

### 4. 거래완료 탭 월별 통계 기능

#### 4.1 필터 옵션
- 월 선택 드롭다운 (최근 12개월)
- 거래 타입 선택 (전체/구매/판매)

#### 4.2 통계 표시
헤더 Card에 표시:
- 선택한 월의 총 거래 건수
- 총 거래 금액
- 구매 건수 / 판매 건수
- 평균 거래 금액

#### 4.3 거래 목록
- 거래 완료일시 순 정렬 (최신순)
- 각 항목에 거래 타입 Badge
- 차량명, 거래 금액, 완료일시 표시
- 탭하면 상담 상세 화면으로 이동

### 5. 관리자 소유 차량 관리

#### 5.1 AdminPageScreen에 "소유 차량" 섹션 추가
현재 구조:
- 프로필 정보
- 최근 등록 차량
- 로그아웃 버튼

추가할 섹션:
- **소유 차량** (admin_owned_vehicles 쿼리)
  - 가로 스크롤 카드 리스트
  - 각 카드: 차량 이미지, 차량명, 매입가, 매입일
  - 탭하면 소유 차량 상세 화면으로 이동

#### 5.2 소유 차량 상세 화면 (AdminOwnedVehicleDetailScreen)
표시 정보:
- 차량 기본 정보 (이미지, 차량명, 스펙)
- 매입 정보
  - 매입가
  - 매입일
  - 이전 소유자 정보
  - 연관된 상담 ID (탭하면 상담 상세로 이동)
- 관리자 메모 (편집 가능)
- 상태 변경 버튼
  - [판매완료 처리] (판매가 입력 모달)

### 6. UI/UX 일관성 유지

#### 6.1 JCar Design System 컴포넌트 사용
- Card: 모든 섹션 카드
- Badge: 상태 표시 (pending, confirmed, on-hold, rejected, completed)
- Button: 액션 버튼 (채결, 보류, 거절, 거래완료)
- StateScreen: 빈 상태 (상담 없음, 소유 차량 없음)
- theme.colors, theme.typography, theme.spacing 일관 적용

#### 6.2 Badge 색상 매핑
- pending: theme.colors.warning.main (노란색)
- confirmed: theme.colors.success.main (초록색)
- on-hold: theme.colors.text.tertiary (회색)
- rejected: theme.colors.danger.main (빨간색)
- completed: theme.colors.primary.main (파란색)

#### 6.3 오류 방지
- Firestore 쿼리 전 사용자 인증 확인
- 트랜잭션 사용하여 데이터 정합성 보장
- 로딩 상태 관리 (SkeletonLoader 사용)
- 에러 핸들링 (Alert 또는 Toast로 사용자에게 피드백)

### 7. Firebase 보안 규칙 업데이트

#### 7.1 consultation_requests 컬렉션
```javascript
match /consultation_requests/{docId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update: if request.auth != null &&
    (request.auth.token.role == 'admin' ||
     resource.data.userId == request.auth.uid);
  allow delete: if request.auth.token.role == 'admin';
}
```

#### 7.2 admin_owned_vehicles 컬렉션
```javascript
match /admin_owned_vehicles/{docId} {
  allow read: if request.auth != null && request.auth.token.role == 'admin';
  allow write: if request.auth != null && request.auth.token.role == 'admin';
}
```

## 구현 순서

### Phase 1: 데이터 구조 및 기본 UI
1. Firestore 컬렉션 및 필드 구조 설계 완료
2. consultation_requests 컬렉션 마이그레이션 (기존 데이터에 새 필드 추가)
3. admin_owned_vehicles 컬렉션 생성
4. AdminConsultationScreen 탭 구조 변경 (구매/판매/거래완료)

### Phase 2: 상담 상태 관리
5. 상담 상태 변경 UI 구현 (채결/보류/거절 버튼)
6. 상태 변경 로직 구현 (Firestore 업데이트)
7. 거래완료 처리 모달 구현
8. 판매상담 거래완료 시 admin_owned_vehicles 추가 로직

### Phase 3: 통계 및 소유 차량 관리
9. 거래완료 탭 월별 필터링 구현
10. 월별 통계 계산 및 표시
11. AdminPageScreen에 소유 차량 섹션 추가
12. AdminOwnedVehicleDetailScreen 구현

### Phase 4: 테스트 및 최적화
13. 전체 기능 통합 테스트
14. 오류 처리 강화
15. 성능 최적화 (쿼리 인덱스, 캐싱)
16. Firebase 보안 규칙 업데이트

## 성공 지표
- 관리자가 상담을 타입별로 명확히 구분하여 관리 가능
- 상담 상태 변경이 직관적이고 오류 없이 작동
- 월별 거래 실적을 한눈에 파악 가능
- 관리자 소유 차량이 자동으로 등록되고 관리됨
- 모든 화면에서 JCar Design System 일관성 유지
- Context7 참고로 Firebase 관련 오류 최소화

## 기술적 고려사항
- Firestore 복합 쿼리를 위한 인덱스 생성 필요
- 거래완료 처리 시 트랜잭션 사용 (데이터 정합성)
- 월별 통계는 실시간 계산 (나중에 최적화 시 집계 컬렉션 고려)
- 이미지 로딩 최적화 (썸네일 사용)
- 오프라인 상태 처리 (Firebase 오프라인 지속성 활용)
