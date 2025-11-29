# UI/UX 개선 프로젝트 요구사항 문서 (PRD)

## 프로젝트 개요

### 목표
JCar 앱의 사용자 경험과 디자인 일관성을 개선하여 전문적이고 신뢰감 있는 브랜드 이미지 구축

### 핵심 원칙
1. **일관성**: 모든 화면에서 통일된 디자인 시스템 적용
2. **가독성**: 명확한 정보 계층 구조와 충분한 대비
3. **사용성**: 직관적인 네비게이션과 명확한 피드백
4. **접근성**: 다양한 사용자층을 고려한 디자인
5. **브랜드 정체성**: 기업 컬러(#2B4593)를 중심으로 한 일관된 비주얼

---

## 1. 디자인 시스템 구축

### 1.1 컬러 팔레트 정의
**목표**: 전체 앱에서 사용할 통일된 컬러 시스템 구축

#### Primary Colors (브랜드 컬러)
- **Primary**: `#2B4593` (로고 파란색)
  - 용도: 주요 버튼, 헤더, 강조 요소
  - 변형:
    - Primary Light: `#4A63B3` (hover, 비활성 상태)
    - Primary Dark: `#1A2B5C` (pressed 상태)
    - Primary Opacity 10%: `rgba(43, 69, 147, 0.1)` (배경, 하이라이트)

#### Semantic Colors (의미적 색상)
- **Success**: `#28A745` (승인, 성공)
  - Success Light: `#48C765`
  - Success Dark: `#1E7B34`
- **Warning**: `#FFA000` (경고, 대기)
  - Warning Light: `#FFB333`
  - Warning Dark: `#E68900`
- **Danger**: `#DC3545` (거절, 삭제, 오류)
  - Danger Light: `#E55565`
  - Danger Dark: `#C82333`
- **Info**: `#17A2B8` (정보, 안내)
  - Info Light: `#3BB5C8`
  - Info Dark: `#127A8A`

#### Neutral Colors (중립 색상)
- **Background**:
  - Primary: `#FFFFFF`
  - Secondary: `#F8F9FA`
  - Tertiary: `#F1F3F5`
  - Card: `#FFFFFF`
  - Disabled: `#E9ECEF`
- **Text**:
  - Primary: `#212529` (본문)
  - Secondary: `#6C757D` (보조 정보)
  - Tertiary: `#ADB5BD` (비활성, placeholder)
  - White: `#FFFFFF` (버튼 텍스트)
- **Border**:
  - Default: `#DEE2E6`
  - Light: `#E9ECEF`
  - Dark: `#ADB5BD`

### 1.2 타이포그래피 시스템
**목표**: 명확한 정보 계층을 위한 일관된 텍스트 스타일

#### Font Sizes
```
H1: 28px (bold) - 화면 제목
H2: 24px (bold) - 섹션 제목
H3: 20px (semi-bold) - 카드 제목
H4: 18px (semi-bold) - 서브 섹션
Body Large: 16px (regular) - 본문, 입력 필드
Body: 14px (regular) - 기본 텍스트
Body Small: 12px (regular) - 캡션, 라벨
Button: 16px (semi-bold) - 버튼 텍스트
```

#### Line Heights
```
H1-H4: 1.3
Body: 1.5
Button: 1.2
```

### 1.3 Spacing 시스템
**목표**: 일관된 여백과 패딩

```
XS: 4px
SM: 8px
MD: 16px
LG: 24px
XL: 32px
XXL: 48px
```

### 1.4 Border Radius
```
Small: 4px (태그, 뱃지)
Medium: 8px (버튼, 입력 필드, 카드)
Large: 12px (모달, 큰 카드)
Round: 50% (아바타, 원형 버튼)
```

### 1.5 Shadows
```
Card: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
}

Modal: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 5,
}
```

---

## 2. 공통 컴포넌트 개선

### 2.1 버튼 컴포넌트 통일
**현재 문제**: 화면마다 버튼 스타일이 제각각

**개선 방안**:
#### Button Variants
1. **Primary Button**
   - 배경: Primary 색상
   - 텍스트: White
   - 높이: 48px
   - Border Radius: 8px
   - 용도: 주요 액션 (로그인, 등록, 저장)

2. **Secondary Button**
   - 배경: Transparent
   - Border: Primary 색상 1px
   - 텍스트: Primary 색상
   - 용도: 부가 액션 (취소, 뒤로가기)

3. **Danger Button**
   - 배경: Danger 색상
   - 텍스트: White
   - 용도: 삭제, 거절

4. **Success Button**
   - 배경: Success 색상
   - 텍스트: White
   - 용도: 승인, 완료

5. **Text Button**
   - 배경: Transparent
   - 텍스트: Primary 색상
   - 용도: 링크, 보조 액션

#### States
- Default
- Hover (웹): 배경색 10% 어둡게
- Pressed: 배경색 20% 어둡게, Scale 0.98
- Disabled: 불투명도 40%, 터치 비활성

### 2.2 입력 필드 통일
**현재 문제**: 입력 필드 스타일 불일치

**개선 방안**:
- 높이: 48px
- Border: 1px solid Border.Default
- Border Radius: 8px
- Padding: 12px
- Background: White
- Focus 시:
  - Border: Primary 색상 2px
  - Shadow: Primary 색상 10% opacity
- Error 시:
  - Border: Danger 색상
  - Error 메시지: Danger 색상, 12px

### 2.3 카드 컴포넌트
**목표**: 일관된 카드 스타일

**스타일**:
- 배경: White
- Border Radius: 12px
- Padding: 16px
- Shadow: Card shadow
- Border: 없음 (그림자로 구분)

### 2.4 상태 뱃지/태그
**목표**: 상태를 명확하게 표시

**스타일**:
- Border Radius: 4px
- Padding: 4px 8px
- Font Size: 12px
- Font Weight: Semi-bold

**색상 매핑**:
- 대기중: Warning
- 승인: Success
- 거절: Danger
- 완료: Info

---

## 3. 화면별 개선 사항

### 3.1 로그인/회원가입 화면
**현재 문제**:
- 로고와 입력 필드 간격 불균형
- 버튼 스타일 개선 필요

**개선 사항**:
1. 로고 크기 조정 (150x150)
2. 로고와 입력 필드 사이 간격: 40px
3. 입력 필드 간격: 12px
4. Primary Button 적용
5. 비밀번호 찾기/회원가입: Text Button
6. 구분선 제거, 간격으로 구분

### 3.2 차량 목록 화면
**현재 문제**:
- 헤더와 리스트 구분이 약함
- 필터 버튼 스타일 불일치
- 차량 카드 시각적 계층 부족

**개선 사항**:
1. **헤더**:
   - 배경: White
   - Border Bottom: Border.Light
   - Padding: 16px
   - 제목: H2 스타일
   - 필터 버튼: Primary 색상 아이콘

2. **차량 카드**:
   - Card 컴포넌트 적용
   - 카드 간격: 12px
   - 카드 내부 레이아웃:
     ```
     [차량 타입 뱃지] [차량명] - H3
     [제조사 | 연식 | 가격] - Body, Secondary Text
     ```
   - 터치 시 Primary.Opacity 배경

3. **빈 상태**:
   - 아이콘: 큰 차량 아이콘 (Secondary Text 색상)
   - 텍스트: H4, Secondary Text
   - 여백: 64px 상하

### 3.3 차량 상세 화면
**개선 사항**:
1. **이미지 영역**:
   - 전체 너비
   - 높이: 250px
   - 배경: Background.Secondary (이미지 없을 때)

2. **정보 섹션**:
   - Padding: 16px
   - 섹션 제목: H4, Primary 색상
   - 섹션 간격: 24px
   - 정보 행:
     - 라벨: Body Small, Secondary Text
     - 값: Body, Primary Text

3. **액션 버튼**:
   - 하단 고정
   - Padding: 16px
   - Shadow 추가
   - Primary Button (상담 신청)

### 3.4 상담 요청 화면
**개선 사항**:
1. **단계 표시**:
   - 상단에 스텝 인디케이터
   - 완료 단계: Primary 색상
   - 현재 단계: Primary 색상, 굵게
   - 미완료 단계: Secondary Text

2. **날짜/시간 선택**:
   - 캘린더: Primary 색상으로 통일
   - 선택된 날짜: Primary 배경, White 텍스트
   - 오늘: Primary Border

3. **메모 입력**:
   - 멀티라인 입력 필드
   - 최소 높이: 100px
   - 글자 수 표시: Bottom Right, Secondary Text

### 3.5 마이페이지
**개선 사항**:
1. **사용자 정보 섹션**:
   - Card 컴포넌트
   - 아바타 (이니셜 또는 기본 아이콘)
   - 이름: H3
   - 이메일: Body, Secondary Text
   - 역할 뱃지

2. **메뉴 리스트**:
   - 각 항목: Card 컴포넌트
   - 간격: 8px
   - 아이콘 + 텍스트 + 화살표
   - 터치 시 Primary.Opacity 배경

3. **위험 액션**:
   - 로그아웃: Secondary Button
   - 회원탈퇴: Danger Text Button

### 3.6 관리자 화면
**개선 사항**:
1. **탭 바**:
   - 배경: White
   - Border Bottom: Border.Light
   - 활성 탭: Primary 색상, Bottom Border (3px)
   - 비활성 탭: Secondary Text

2. **통계 카드** (있다면):
   - Card 컴포넌트
   - 아이콘 + 숫자 + 라벨
   - 그리드 레이아웃 (2x2)

3. **리스트 아이템**:
   - Card 컴포넌트
   - 상태 뱃지 일관성
   - 액션 버튼: Success/Danger 버튼

---

## 4. 네비게이션 개선

### 4.1 헤더 디자인
**공통 헤더 스타일**:
- 높이: 56px
- 배경: Primary 색상
- 텍스트: White
- 뒤로가기 버튼: White 아이콘
- 제목: H4, Center Align (뒤로가기 있을 때)

### 4.2 탭 네비게이션
**스타일**:
- 배경: White
- 높이: 60px
- 활성 탭:
  - 아이콘: Primary 색상
  - 텍스트: Primary 색상
  - Top Border: 3px Primary
- 비활성 탭:
  - 아이콘: Secondary Text
  - 텍스트: Secondary Text

---

## 5. 인터랙션 & 피드백

### 5.1 로딩 상태
**목표**: 명확한 로딩 피드백

**구현**:
1. **전역 로딩**:
   - 반투명 오버레이
   - Primary 색상 스피너
   - 로딩 텍스트 (선택)

2. **버튼 로딩**:
   - 버튼 비활성
   - 스피너 표시
   - 텍스트 유지 또는 "처리 중..."

3. **리스트 로딩**:
   - 스켈레톤 UI (카드 형태)
   - Primary.Opacity 애니메이션

### 5.2 에러 상태
**목표**: 사용자 친화적인 에러 메시지

**구현**:
1. **인라인 에러** (폼 검증):
   - 입력 필드 아래
   - Danger 색상 텍스트
   - Danger Border

2. **토스트 메시지**:
   - 하단 중앙
   - 배경:
     - 성공: Success
     - 에러: Danger
     - 정보: Info
   - 텍스트: White
   - 자동 닫힘: 3초

3. **에러 화면**:
   - 중앙 정렬
   - 아이콘 + 메시지 + 재시도 버튼
   - Secondary Button (재시도)

### 5.3 빈 상태
**목표**: 명확한 빈 상태 안내

**구현**:
- 중앙 정렬
- 큰 아이콘 (48px, Secondary Text)
- H4 제목
- Body 설명
- Primary Button (액션이 있을 때)

### 5.4 애니메이션
**원칙**: 부드럽고 자연스러운 전환

**적용**:
- 화면 전환: Fade + Slide (250ms)
- 버튼 Press: Scale 0.98 (100ms)
- 모달 표시: Fade + Scale (200ms)
- 리스트 아이템: Opacity + TranslateY (150ms, stagger 50ms)

---

## 6. 접근성 개선

### 6.1 색상 대비
**목표**: WCAG AA 기준 준수

**검증**:
- 본문 텍스트: 최소 4.5:1 대비
- 큰 텍스트 (18px+): 최소 3:1 대비
- UI 요소: 최소 3:1 대비

### 6.2 터치 타겟
**목표**: 충분한 터치 영역

**기준**:
- 최소 크기: 44x44px
- 버튼 간격: 최소 8px

### 6.3 텍스트 크기
**목표**: 가독성 확보

**기준**:
- 최소 본문 크기: 14px
- 중요 정보: 16px 이상

---

## 7. 구현 우선순위

### Phase 1: 디자인 시스템 기초 (High Priority)
1. 테마 파일 생성 (colors.js, typography.js, spacing.js)
2. 공통 버튼 컴포넌트
3. 공통 입력 필드 컴포넌트
4. 공통 카드 컴포넌트

### Phase 2: 핵심 화면 개선 (High Priority)
1. 로그인/회원가입 화면
2. 차량 목록 화면
3. 차량 상세 화면
4. 마이페이지

### Phase 3: 상호작용 개선 (Medium Priority)
1. 로딩 컴포넌트
2. 토스트 메시지
3. 에러/빈 상태 컴포넌트
4. 모달 개선

### Phase 4: 관리자 화면 개선 (Medium Priority)
1. 관리자 차량 관리
2. 관리자 상담 관리
3. 관리자 사용자 관리
4. 관리자 스케줄

### Phase 5: 세부 개선 (Low Priority)
1. 애니메이션 추가
2. 접근성 검증
3. 다크모드 대응 (선택)

---

## 8. 성공 지표

### 정량적 지표
- 디자인 시스템 적용률: 100% (모든 화면)
- 색상 일관성: 단일 컬러 팔레트 사용
- 컴포넌트 재사용률: 80% 이상

### 정성적 지표
- 시각적 일관성: 모든 화면 통일된 느낌
- 브랜드 정체성: Primary 색상 명확히 인식
- 사용 편의성: 직관적인 UI 피드백

---

## 9. 기술 스택

### 디자인 시스템
- React Native StyleSheet
- 커스텀 테마 시스템 (Context API)

### 컴포넌트
- 재사용 가능한 공통 컴포넌트 라이브러리
- PropTypes 검증

### 애니메이션
- React Native Animated API
- Reanimated (필요시)

---

## 10. 디자인 가이드라인

### DO (해야 할 것)
- Primary 색상 (#2B4593)을 주요 액션에 사용
- 일관된 spacing 시스템 적용
- 명확한 정보 계층 구조
- 충분한 여백과 공간
- 의미론적 색상 사용 (Success/Warning/Danger)

### DON'T (하지 말아야 할 것)
- 이모지 사용 금지
- 하드코딩된 색상 값 사용 금지
- 인라인 스타일 남발 금지
- 불필요한 애니메이션 금지
- 브랜드 컬러 임의 변경 금지

---

## 11. 참고 사항

### 브랜드 아이덴티티
- 로고 컬러: #2B4593
- 로고 컨셉: 차량 + J-car 텍스트
- 브랜드 느낌: 신뢰성, 전문성, 안정감

### 경쟁사 분석 (선택)
- 중고차 플랫폼들의 UI/UX 트렌드 참고
- 현대적이고 깔끔한 디자인 지향
- 정보 밀도와 가독성 균형

### 유지보수성
- 테마 파일로 중앙 관리
- 컴포넌트 문서화
- Storybook 도입 고려 (선택)
