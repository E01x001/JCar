# Task ID: 53

**Title:** 관리자 대시보드에 소유권 이전 기록 표시

**Status:** done

**Dependencies:** 51 ✓, 49 ✓, 48 ✓

**Priority:** medium

**Description:** 새로운 AdminOwnershipHistoryScreen을 생성하여 차량 소유권 이전 기록을 표시하고 관리하며, AdminPageScreen에 관련 메뉴 항목을 추가합니다. 날짜 및 차량별 필터링, 상세 정보 모달, 그리고 소유권 이전 통계 정보를 제공합니다.

**Details:**

1. AdminOwnershipHistoryScreen.js 생성:
    *   경로: src/screens/AdminOwnershipHistoryScreen.js
    *   데이터 조회: Firestore의 `ownership_transfers` 컬렉션에서 소유권 이전 기록을 조회합니다. 초기 로드 시 `transferDate` (내림차순) 기준으로 정렬합니다. 데이터 양에 따라 초기 단계에는 전체 조회를 구현하고, 향후 필요 시 페이지네이션을 고려합니다.
    *   필터링 기능 구현:
        *   **날짜 필터링**: UI 컴포넌트 (예: `DateTimePicker` 또는 `SegmentedControl`을 활용한 '지난 7일', '이번 달' 등)를 추가하여 `transferDate` 기준으로 기록을 필터링합니다.
        *   **차량 필터링**: 검색 입력 필드를 추가하여 `vehicleId` 또는 `vehicleName` (ownership_transfers 문서에 포함되거나 별도 조회)으로 기록을 필터링합니다.
    *   목록 표시: 필터링된 소유권 이전 기록을 `FlatList`를 사용하여 표시합니다. 각 목록 항목은 `Card` 컴포넌트를 활용하여 `vehicleName`, `previousOwnerName`, `newOwnerName`, `transferDate`, `transferAmount` 등의 핵심 정보를 요약하여 보여줍니다.
    *   상세 정보 모달 구현:
        *   새로운 모달 컴포넌트 (예: `OwnershipTransferDetailModal.js`)를 생성하여 목록 항목 탭 시 상세 정보를 표시합니다.
        *   모달은 선택된 이전 기록의 모든 세부 정보(예: `transferReason`, `vehicleDetails`, `sellerDetails`, `buyerDetails`, 타임스탬프)를 포함해야 합니다. Task 52의 `OwnershipTransferConfirmModal`과 일관된 UI/UX를 유지합니다.

2. AdminPageScreen.js 메뉴 추가:
    *   경로: src/screens/AdminPageScreen.js
    *   메뉴 항목 추가: 기존 관리자 메뉴/내비게이션 섹션에 '소유권 이전 기록' 텍스트를 가진 `TouchableOpacity` 또는 `Button` 컴포넌트를 추가합니다.
    *   내비게이션 연결: 해당 버튼 클릭 시 `navigation.navigate('AdminOwnershipHistory')`를 통해 새로운 `AdminOwnershipHistoryScreen`으로 이동하도록 내비게이션 로직을 구현합니다. src/navigation/AdminNavigator.js 또는 관련 내비게이터에 새 화면을 등록합니다.

3. 통계 정보 추가:
    *   `useOwnershipStats` 훅 생성: `src/hooks/useOwnershipStats.js` 파일을 생성하여 소유권 이전 통계 로직을 캡슐화합니다.
        *   이 훅은 특정 기간 (예: 월별, 연별 또는 사용자 지정 날짜 범위)에 대한 `ownership_transfers` 컬렉션을 쿼리합니다.
        *   해당 기간의 총 이전 건수 및 총 거래액 (`transferAmount` 합계)을 계산하여 반환합니다.
        *   Firestore 집계 쿼리를 활용하거나 클라이언트 측에서 데이터를 집계하여 최적화합니다.
    *   통계 정보 표시: `AdminOwnershipHistoryScreen` 상단에 `useOwnershipStats` 훅을 통합하고, '월별 이전 건수: X건, 총 거래액: Y원'과 같이 요약 통계를 눈에 잘 띄게 표시합니다.

**Test Strategy:**

1.  **Unit/Integration Test for `useOwnershipStats` hook:**
    *   Firebase Emulator Suite를 사용하여 `ownership_transfers` 컬렉션에 다양한 날짜, 금액, 차량 ID를 포함하는 테스트 데이터를 준비합니다.
    *   `useOwnershipStats` 훅을 다양한 날짜 범위로 호출하고, 계산된 `totalTransfers` 및 `totalAmount`가 올바른지 검증합니다.
    *   컬렉션이 비어 있거나, 단일 이전 기록만 있거나, 여러 달/년에 걸쳐 있는 경우 등 엣지 케이스를 테스트합니다.
2.  **Component Test for `AdminOwnershipHistoryScreen`:**
    *   `ownership_transfers`에 대한 Mock 데이터를 사용하여 `AdminOwnershipHistoryScreen`을 렌더링합니다.
    *   이전 기록 목록이 올바르게 표시되는지 확인합니다.
    *   날짜 필터링 기능을 테스트: 다른 날짜 범위를 적용하고 관련 이전 기록만 표시되는지 확인합니다.
    *   차량 필터링 기능을 테스트: 차량 이름/ID로 검색하고 결과가 정확한지 확인합니다.
    *   통계 요약 섹션이 Mock `useOwnershipStats` 훅의 출력을 올바르게 표시하는지 확인합니다.
    *   목록 항목 탭을 시뮬레이션하고 `OwnershipTransferDetailModal`이 올바른 데이터로 열리는지 확인합니다.
    *   필터와 일치하는 이전 기록이 없거나 컬렉션이 비어 있을 때 `StateScreen` (Task 28 및 42 참조)과 같은 비어 있는 상태가 올바르게 표시되는지 테스트합니다.
3.  **UI Integration Test (AdminPageScreen에서 AdminOwnershipHistoryScreen으로의 내비게이션):**
    *   `AdminPageScreen`으로 이동합니다.
    *   '소유권 이전 기록' 버튼이 존재하고 시각적으로 올바른지 확인합니다.
    *   버튼을 탭하고 `AdminOwnershipHistoryScreen`으로 성공적으로 이동하는지 확인합니다.
    *   통합된 환경에서 `AdminOwnershipHistoryScreen`의 기본적인 상호 작용 (예: 스크롤, 필터 적용)이 예상대로 작동하는지 확인합니다.
4.  **End-to-End Test (수동):**
    *   기존 흐름(Task 48, 49, 51에 의존)을 사용하여 차량 소유권 이전 (관리자에게 판매, 관리자로부터 구매 등)을 완료합니다.
    *   `AdminPageScreen`으로 이동한 다음 '소유권 이전 기록' 화면으로 이동합니다.
    *   새로 완료된 이전 기록이 목록에 나타나는지 확인합니다.
    *   통계 정보가 그에 따라 업데이트되는지 확인합니다.
    *   새로운 이전 기록의 상세 모달을 열고 모든 정보가 정확한지 확인합니다.
