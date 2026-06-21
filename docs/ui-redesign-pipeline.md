# J-Car 1차 UI 전면 개편 — 파이프라인 작업 로그

> 목적: claude.ai/design 프로젝트 `J-Car.dc.html`(브랜드 "J-Car 앱 리디자인")의 **채택안(✓)** 기준으로
> 디자인 토큰 + 공통 컴포넌트 + 주요 화면을 전면 리디자인. **변수/토큰 연결 정합성**을 지키며 단계적으로 진행.
> 이 파일은 compaction(컨텍스트 요약)이 일어나도 작업이 끊기지 않도록 세부 상태를 보존한다. **각 단계 종료 시 갱신.**

## 진행 상태 보드
| 단계 | 커맨드 | 상태 |
|---|---|---|
| ① 정의 | /pipeline:define | ✅ 완료 |
| ② 탐색 | /pipeline:explore | ✅ 완료 |
| ③ 설계 | /pipeline:design | ✅ 완료 |
| ④ 분해 | /pipeline:decompose | ✅ 완료 |
| ⑤ 구현 | /pipeline:implement | ⬜ 대기 |
| ⑥ 검증 | /pipeline:verify | ✅ 완료 (정적·번들·테스트 통과) |
| ⑦ 정리 | /pipeline:wrap | ✅ 완료 |
| ⑧ 배포 | /pipeline:ship | ✅ 커밋 완료 (브랜치 feat/ui-redesign-phase1, 푸시·PR 미실행) |

---

## 디자인 시안 출처
- claude.ai/design 프로젝트 ID: `fa77738b-e160-45d1-9811-de2d256ca9f1` ("J-Car 앱 리디자인", owner Jinyong)
- 메인 파일: `J-Car.dc.html` (DesignSync `get_file`로 추출, 161KB)
- 추출본 로컬 캐시: `C:\Users\jyjeo\.claude\projects\C--JCar\5015815f-cd16-43d0-b105-4a03bdceca9e\tool-results\toolu_01Puxw6QJSYMSLySDGrGDTQe.txt`
- 시안 섹션: 01 디자인시스템 / 02 로그인 / 03 메인홈 / 04 차량카드 / 05 스플래시·온보딩·회원가입 / 06 유저 핵심플로우 프로토타입 / 07 관리자 콘솔 / 08 C2B2C 거래체결
- **채택안(✓)**: 로그인=**C 풀블리드 브랜드**, 메인홈=**A 검색 중심**. (04/07/08 세부 채택은 design 단계에서 시안 정독 후 확정)
- 인앱 현황 스크린샷: `UI_inapp/{login,user,admin}/*.png` (현재 앱 상태 참고용, git untracked)

## 시안 디자인 토큰 (Source of Truth)
- 컬러: Primary `#2B4593` / Light `#4A63B3` / Dark `#1A2B5C` / Success `#28A745` / Warning `#FFA000` / Danger `#DC3545`
  - BG `#F8F9FA`, Surface `#fff`, Text `#212529`/`#6C757D`/`#ADB5BD`, Border `#E9ECEF`/`#E1E5EA`
- 타이포(Pretendard): H1 32/800, H2 22/700, Title 16/600, Body 15/400, Caption 13/400
- 라운드: 카드 16~20, 버튼/입력 12~14, 배지 8~9, 폰목업 36
- 그림자: 소프트 엘리베이션 `0 8px 30px rgba(26,43,92,.07)` (카드), `0 6px 16px rgba(43,69,147,.24)` (Primary 버튼)
- 상태칩(톤다운): 대기 `#FFF6E5`/`#C77700`, 승인 `#E7F6EC`/`#1E7E34`, 거절 `#FCE9EB`/`#B02A37`, 완료 `#EAEFFB`/`#2B4593`
- 디자인 원칙: 화이트 헤더+블루 백버튼(블루는 강조에만), 소프트 그림자 카드(테두리 X), 차분한 상태색, Pretendard

---

## ② 탐색 결과 (Explore)

### 1. 관련 파일 위치
- **토큰 레이어 (이미 존재)**: `src/theme/` — `colors.js` `typography.js` `spacing.js` `borderRadius.js` `shadows.js` `index.js` `ThemeProvider.js`
  - `ThemeProvider`는 `src/App.js:144`에서 마운트됨. `useTheme()` 훅 제공.
- **공통 컴포넌트 (이미 존재)**: `src/components/` — `Button.js` `InputField.js` `Card.js` `Badge.js` (+ State/Error/Loader류). `index.js`에서 배럴 export.
- **네비게이터**: `src/navigation/AppNavigator.js` — `navigationStyles`(header/tabBar) 중앙화. 화이트 헤더+블루 틴트+소프트섀도 **이미 시안 방향으로 적용됨**.
- **화면**: `src/screens/*Screen.js` (+ `MyPage/tabs`, `AdminConsultation/tabs`).

### 2. 기존 패턴 / 진행 현황 (중요)
- **리디자인이 이미 진행 중** (working tree, 미커밋): `git diff --stat HEAD` 기준
  - `LoginScreen.js` (+287줄) — **채택 C안(몰입형 블루+프로스티드 카드+장식 원) 이미 구현됨**. 단, **토큰 미사용, hex 하드코딩**.
  - `ConsultationRequestScreen.js` (+448), `ForgotPasswordScreen.js`, `VehicleDetailScreen.js`, `AppNavigator.js` 도 수정됨.
- 즉 팀의 실제 패턴 = **"시안 hex값을 화면에 직접 하드코딩 + 공통 컴포넌트 미사용"**. 토큰 레이어는 네비게이터/일부에서만 부분 사용.

### 3. 재사용 가능한 자산
- `theme.colors.primary.main` 등 토큰은 시안 컬러와 **이미 일치**(#2B4593 등). 컬러는 추가 작업 최소.
- `Button/InputField/Badge/Card` 컴포넌트 존재하나 **스펙과 불일치**(아래 갭).

### 4. 영향 범위 (Blast Radius)
- `src/theme`·`src/components` 변경 시 `useTheme`/컴포넌트 import 파일 **46개**에 영향. 토큰 리네이밍은 위험 → **추가(additive)** 우선, 리네이밍 지양.
- `theme.typography.fontSize.h1` 등을 값 변경하면 이를 쓰는 모든 화면 헤더 영향. 특히 `AppNavigator` headerTitle은 `fontSize.h3` 사용.

### 5. 함정 (Pitfalls)
- **토큰 vs 하드코딩 불일치**: 컴포넌트는 토큰 사용, 신규 리디자인 화면은 hex 하드코딩 → 정합성 핵심 리스크.
- **타이포 갭**: 시안 H1=32/800인데 `typography.styles.h1`=28/700. `fontWeight`에 `extraBold(800)` 없음.
- **컴포넌트 갭**: `borderRadius.medium=8`(버튼/입력) vs 시안 12~14. `Card`는 테두리 있음(시안은 테두리 X + 소프트섀도). `shadows.card`는 약함(시안 `0 8px 30px`). `Badge`는 솔리드 배경(시안은 톤다운 칩 + dot + 한글 라벨 "대기중/승인됨/거절됨/완료").
- **데드코드**: `src/screens/HomeScreen.js` — 네비게이터에 미연결, 자기 자신만 참조. 시안 "메인 홈 A안"과 혼동 주의(현재 유저 첫 탭은 `VehiclesListScreen` "차량 목록").
- **상태값 이름**: `colors.status` / `Badge` status enum (pending/approved/confirmed/on-hold/rejected/completed/cancelled/archived) — 시안 4종(대기/승인/거절/완료)과 매핑 필요, 기존 enum 보존하며 라벨/색만 조정.
- Pretendard 폰트: 시안은 웹폰트(Pretendard). RN 앱에 폰트 번들 여부 미확인 → design 단계에서 확인(미적용 시 시스템 폰트 폴백).

### 미해결/다음 단계로 이월
- 차량카드(04)/관리자(07)/거래체결(08) 채택 세부 → 해당 화면 구현 직전 시안 정독.

---

## ③ 설계 결과 (Design)

### 사용자 결정 (확정)
- **토큰 전략 = 토큰 단일소스 + 화면 토큰화**: theme를 additive로 강화하고, 공통 컴포넌트를 시안 스펙으로 갱신. 신규 화면은 토큰 참조로 구현하고, 이미 하드코딩된 화면(Login 등)도 토큰 참조로 정리.
- **1차 범위 = 채택안 핵심 화면**: 디자인시스템(토큰+컴포넌트) → 로그인(C) → 메인홈(A 검색중심, 신규) → 차량목록/상세 → 마이페이지 빈상태. 관리자(07)/C2B2C(08)는 2차.

### 1. 접근법 요약
theme 레이어를 **additive(기존 키 유지, 신규 키 추가)** 로 시안 스펙에 맞춰 확장한 뒤, 공통 UI 컴포넌트(Button/Input/Badge/Card + 신규 VehicleCard/StatusChip/EmptyState/SectionHeader)를 시안대로 갱신/신설한다. 그 위에서 채택안 화면을 토큰·컴포넌트 참조로 구현한다. 리네이밍 대신 추가를 택해 46개 의존 파일의 참조가 깨지지 않게 한다.

### 2. 데이터 흐름 / 책임 분담
- **UI 레이어만 교체**. 비즈니스 로직/Firebase/네비게이션/스토어(`stores/`, `context/`, `services/`)는 보존.
- 상태: 화면 로컬 state 그대로. 디자인 토큰은 `useTheme()`(Context) 경유 — App.js에 ThemeProvider 이미 마운트됨.
- 서버/보안규칙 변경 없음. 메인홈 검색/통계는 1차에서 **UI 셸 + 기존 데이터 소스 재사용**(신규 쿼리 없으면 mock/placeholder, design에서 화면 구현 시 결정).

### 3. 변경 지점 목록
- `src/theme/typography.js` — `fontWeight.extraBold='800'` 추가, styles에 시안 스케일(h1 32/800, h2 22/700, title 16/600, body 15/400, caption 13/400) **추가 프리셋**(기존 키 보존).
- `src/theme/shadows.js` — `soft`(0 8px 30px rgba(26,43,92,.07)), `button`/`buttonDanger`, `header` 추가.
- `src/theme/borderRadius.js` — `button:14, input:12, card:16, cardLg:20, chip:9` 등 시맨틱 추가(기존 small/medium/large/round 보존).
- `src/theme/colors.js` — `statusChip`(대기/승인/거절/완료의 bg/fg/dot) 추가, `border.subtle=#E1E5EA` 추가.
- `src/components/Button.js` — radius 14, 소프트 그림자, secondary=연블루 솔리드(#EEF1FA/#2B4593), ghost variant 추가, fullWidth.
- `src/components/InputField.js` — radius 12, focus 시 4px 글로우 링, 시안 스타일.
- `src/components/Badge.js` — 톤다운 칩(bg+fg+dot) 스타일 + 4종 한글 라벨 정합.
- `src/components/Card.js` — 테두리 제거+소프트 그림자(`elevated` prop, 기존 사용처 호환 위해 기본은 현행 유지/opt-in).
- **신규**: `src/components/VehicleCard.js`, `StatusChip.js`(또는 Badge 확장), `EmptyState.js`, `SectionHeader.js`, `Avatar.js`, `SearchBar.js`, `CategoryChip.js` — `components/index.js`에 export.
- `src/screens/LoginScreen.js` — hex → 토큰 참조로 정리(비주얼 동일 유지).
- 메인홈: 신규 화면 또는 `VehiclesListScreen` 상단 확장(검색바+카테고리+섹션). decompose에서 확정. **주의: `HomeScreen.js`(데드코드)와 혼동 금지** — 살릴지/지울지 wrap에서 정리.
- `src/screens/VehicleDetailScreen.js`, `MyPageScreen.js`(빈상태) — 토큰/컴포넌트 적용.

### 4. 대안과 트레이드오프
- **(채택) 토큰 단일소스**: 정합성↑, 유지보수↑. 비용=46파일 영향 주의 → additive로 완화. ADR 근거: 사용자가 "변수 연결 정합성"을 명시 요구.
- (기각) 하드코딩 유지: 빠르지만 시안값이 화면마다 흩어져 1차 목표(정합성)와 충돌.
- 폰트: Pretendard **번들 안 함**(android assets/react-native.config 없음 확인). 1차는 시스템 폰트 폴백. 폰트 번들=네이티브 설정 변경이라 비범위(2차).
- 컴포넌트 갱신은 **하위호환 우선**: 기존 사용처가 깨지지 않도록 prop 기본값을 현행 유지하고 신규 스타일은 opt-in 또는 시각 동등 범위 내 조정.

### 5. 검증 전략 (⑥ 대비)
- 빌드: `npm start`(Metro 번들 통과) + `npm run lint` 통과.
- 정합성 정적 점검: 토큰 export 키 깨짐 없는지 grep(기존 키 유지 확인), 컴포넌트 import 배럴 정상.
- 수동 시나리오(가능 시 에뮬레이터/스크린샷): 로그인 화면 시안 일치, 메인홈 검색중심 레이아웃, 차량카드/상세, 마이페이지 빈상태, 헤더/탭바 화이트+블루.
- 회귀: 토큰 값 변경이 아닌 추가임을 확인해 기존 화면 비주얼 회귀 최소화.

---

## ④ 분해 결과 (Decompose) — 구현 체크리스트

원칙: 1 단계 = 1 관심사 = 1 커밋. 토큰(기반) → 컴포넌트 → 화면 순(의존성 방향). 각 단계 독립 검증 가능.

### Phase 0 — 토큰 기반 (먼저, 의존 없음) ← 동작하는 가장 작은 조각 ✅ 완료 (lint 통과)
- [x] **S1. typography 확장** — `fontWeight.extraBold='800'` + 시안 스케일 프리셋 추가(displayH1 32/800, h2 22/700, title 16/600, body 15/400, caption 13/400). 기존 키 보존.
  - 완료조건: `theme.typography`에 신규 키 존재 + 기존 키 그대로 + 번들 통과. 파일: `src/theme/typography.js`
- [x] **S2. colors/shadows/borderRadius 확장** — `colors.statusChip`(대기/승인/거절/완료 bg·fg·dot), `border.subtle=#E1E5EA`; `shadows.soft/button/buttonDanger/header`; `borderRadius.button/input/card/cardLg/chip`. 전부 additive.
  - 완료조건: 신규 토큰 export, 기존 키 무변경, `theme/index.js`로 노출. 파일: `src/theme/{colors,shadows,borderRadius}.js`
- [x] **S3. 토큰 무결성 점검** — 기존 키 전부 보존 확인(grep), 신규는 additive. lint exit 0. — 기존 사용처(46파일) 참조 키가 그대로인지 grep 확인.
  - 완료조건: 삭제·리네이밍된 키 0건. (검증 스텝, 코드변경 없음)

### Phase 1 — 공통 컴포넌트 (S1·S2 의존) ✅ 완료 (lint 0 error)
- [x] **S4. Button 갱신** — radius.button, 소프트 그림자(button/buttonDanger), `ghost` variant, `fullWidth`. weight bold. **⚠️ secondary 비주얼 변경**: 기존 transparent+border → 시안 연블루 솔리드(#EEF1FA). 리디자인 의도지만 기존 secondary 사용처 외형 바뀜(verify에서 확인).
- [x] **S5. InputField 갱신** — radius.input, focus 글로우 강화.
- [x] **S6. Badge** — `variant="chip"` opt-in 추가(statusChip 토큰+dot). 기본 `solid` 유지 → 기존 사용처 무변경. enum→chip 매핑(`CHIP_KEY`).
- [x] **S7. 신규 컴포넌트** — Avatar/SectionHeader/EmptyState/VehicleCard/SearchBar/CategoryChip 생성, `index.js` 배럴 export. EmptyState는 StateScreen(풀스크린)과 용도 구분 주석.
- [x] **S8. Card** — `elevated` prop(테두리 제거+shadows.soft, radius.card). 기본 현행 유지.

**Phase 1 메모**: lint 14 warning(inline-style/complexity) = 기존 컴포넌트와 동일 패턴, 0 error. VehicleCard는 `formatPrice` 재사용, imageUrl 배열/문자열 모두 처리.

### Phase 2 — 채택 화면 (Phase 1 의존)
- [x] **S9. LoginScreen 토큰화** — 브랜드 hex(#1A2B5C→primary.dark, #2B4593→primary.main) 인라인 토큰화. 글래스 rgba(white) 오버레이와 on-dark 에러색(#FF8A95)은 의도적으로 리터럴 유지(브랜드 토큰 아님). 비주얼 동일. lint 0 error.
- [x] **S10. 메인홈(A 검색중심)** — **결정: `VehiclesListScreen`(현 유저 첫 탭) 확장** (HomeScreen 데드코드/탭 구조 변경 회피). 인사말(sellerName)+Avatar / 신규 SearchBar / 동적 CategoryChip(로드된 vehicleType 기반, 항상 정합) / SectionHeader / 리스트 아이템 → VehicleCard. **부수: 기존 버그 `theme.borderRadius.md`(존재X→0) 참조 제거.** lint 0 error.
- [x] **S11. 차량 상세 점검** — 목록은 S10에서 VehicleCard로 완료. 상세(`VehicleDetailScreen.js`)는 깨진 토큰 참조 0건 + lint 0 error로 정합 확인(이미 리디자인됨, 추가 변경 불요).
- [x] **S12. 마이페이지 빈상태** — 3개 탭(Buy/Sell/MyVehicles) `StateScreen`→`EmptyState`(카드형, 둥근 블루 뱃지) 교체 + 중앙정렬 래핑. 시안 copy 톤 반영.

### ★ 토큰 정합성 복구 (S11 중 발견·수정)
- **발견**: 코드베이스 전반(admin 화면·modals 등)이 존재하지 않는 토큰 키 참조 → 조용히 undefined(사각 모서리/기본 폰트)로 깨져 있었음.
  - `theme.borderRadius.md/lg/sm` (~25곳), `theme.typography.fontSize.caption` (~15곳).
- **수정(additive 별칭)**: `borderRadius.{sm:4,md:8,lg:12,xl:16}`, `fontSize.caption:12`, `fontWeight.{medium:500,extraBold:800}` 추가.
- **검증**: `grep` 전수 — 참조되는 모든 borderRadius/fontSize/fontWeight 키가 정의됨. **dangling 참조 0건.**

**Phase 2 완료(S9-S12)**.

---

## ⑥ 검증 결과 (Verify)

### 정적 검사
- **ESLint**: 변경 파일 전체 **0 error** (119 warning = 기존과 동일한 prop-types/inline-style 스타일 경고, 신규 아님).
- **Jest**: **57/57 통과** (`__tests__` 테마 토큰 스위트 포함 — additive 변경이 기존 토큰 형태/값 불변 확인).
- **Metro 프로덕션 번들**: `react-native bundle --platform android --dev false` **성공**(bundle-exit 0, 38 에셋 복사). → 모든 import·신규 컴포넌트·토큰 참조 end-to-end 해석 OK = 변수 연결 통합 검증.

### 엣지케이스 (코드 경로 확인)
- 빈 목록 → `EmptyState`/`StateScreen` 렌더(ListEmptyComponent). ✅
- 카테고리 데이터 없음 → `categories.length > 1` 가드로 칩 숨김. ✅
- VehicleCard 이미지/가격 null → placeholder/'가격 문의' 폴백. ✅
- sellerName null → 인사말 '반가워요 👋', Avatar 'J' 폴백. ✅
- Badge 기본 `solid` → 기존 사용처 외형 불변. ✅

### DoD 대조 (①정의)
1. 디자인 토큰 단일소스화 — ✅ (additive 확장 + 깨진 참조 복구, grep 전수 0 dangling)
2. 공통 컴포넌트 시안화 — ✅ (Button/Input/Badge/Card 갱신 + 신규 6종)
3. 채택 화면 반영 — ✅ 로그인(C)/메인홈(A)/차량목록·상세/마이페이지 빈상태
4. 변수/토큰 연결 정합성(번들+린트) — ✅ 번들 성공, lint 0 error, dangling 0
5. 비즈니스 로직/Firebase/네비 보존 — ✅ UI 레이어만 변경

### 한계(정직 보고)
- **실기기/에뮬레이터 시각 관찰 미수행**(이 세션에 구동 디바이스 없음). 정적+번들+테스트로 동작 가능성 검증했으나, 픽셀 단위 시안 일치(글래스 블러, 그림자 렌더)는 `/run`·사용자 확인 권장.
- Button **secondary 외형 변경**(transparent+border→연블루 솔리드): 의도된 리디자인. 기존 secondary 사용처 외형이 바뀌므로 wrap에서 사용처 목록 확인 권장.

**판정: 통과** → 다음 `/pipeline:wrap`.

---

## ⑦ 정리·셀프리뷰 결과 (Wrap)

### 정리한 항목
- 군더더기 점검(내 파일 19개): console.log/주석처리 코드/unused import **0건**. lint 0 error.
- 품질 폴리시: Button secondary 하드코딩 hex(#EEF1FA) → `theme.colors.tag.accent.bg` 토큰 참조로 교체(정합성).
- VehiclesListScreen 구 styles(searchContainer/vehicleHeader 등) 전량 교체 — dead style 잔여 없음.

### ★ 범위 분리 (중요 — ship 전 사용자 확인 필요)
이번 working tree diff에는 **세션 시작 전부터 미커밋 상태였던 변경**이 섞여 있음(내 작업 아님):
- `src/screens/ConsultationRequestScreen.js` (+448) — 기존 미커밋
- `src/screens/ForgotPasswordScreen.js` (+299) — 기존 미커밋
- `src/navigation/AppNavigator.js` (+45) — 기존 미커밋(화이트헤더/탭바, 시안 방향)
- `src/screens/VehicleDetailScreen.js` 대부분 — 기존 미커밋(내가 한 건 점검만)
- `src/screens/LoginScreen.js` — 기존 C안 리디자인 + **내 토큰화 변경 일부**(혼재)

**이번 세션(내 작업) 파일**: `src/theme/*`(4), `src/components/*`(Badge·Button·Card·InputField·index + 신규 6), `src/screens/VehiclesListScreen.js`, `src/screens/MyPage/tabs/*`(3), LoginScreen 토큰화분, `docs/ui-redesign-pipeline.md`.

→ ship에서 커밋 분할 시 **기존 미커밋 화면들을 이번 커밋에 포함할지 사용자 결정 필요**.

### 후속 이슈 (이번 변경에 욱여넣지 않고 분리)
1. **Badge `solid`→`chip` 마이그레이션**: 신규 chip variant는 추가만 했고 기존 화면(상담/차량 상태 표시)은 여전히 solid. 시안 톤다운 칩으로 전환하려면 사용처별 `variant="chip"` 적용 필요(2차).
2. **Button `secondary` 외형 변경 사용처 점검**: transparent+border→연블루 솔리드. 기존 secondary 버튼 화면들 시각 회귀 확인(StateScreen 재시도 버튼 등).
3. **관리자(07)/C2B2C(08) 화면 리디자인**: 1차 비범위. admin 화면들은 이번 토큰 별칭 복구로 깨진 라운드/폰트가 정상화됨(부수 효과).
4. **메인홈 별도 탭 분리**: 현재 첫 탭(VehiclesList) 확장으로 구현. 시안의 5탭(홈/차량/등록/상담/마이) 구조로 가려면 네비 재편 필요(2차).
5. **Pretendard 폰트 번들**: 네이티브 설정(android assets + react-native.config). 1차 시스템폰트 폴백 → 2차.

다음: `/pipeline:ship`.

---

## ⑧ 배포 결과 (Ship)
- 브랜치: **`feat/ui-redesign-phase1`** (main에서 분기).
- 커밋 3개 (내 작업만, pre-commit 훅 eslint+jest 통과):
  1. `0933a5c feat(theme): 시안 디자인 토큰 확장 및 깨진 토큰 참조 복구`
  2. `c526133 feat(components): 시안 스펙 공통 컴포넌트 갱신 및 신규 6종`
  3. `5652c54 feat(ui): 메인홈 검색중심 개편·로그인 토큰화·마이페이지 빈상태`
- `UI_inapp/` → `.gitignore` 처리(커밋 제외).
- **미커밋 잔류(의도)**: AppNavigator/ConsultationRequestScreen/ForgotPasswordScreen/VehicleDetailScreen — 세션 전 기존 변경, 사용자 결정으로 제외.
- **푸시·PR 미실행** (사용자 추가 승인 시 진행).

### 배포 후 관찰
- 시각 확인: `/run` 또는 에뮬레이터로 로그인/메인홈/마이페이지 빈상태/차량카드 렌더 확인.
- 회귀 관찰: Button secondary 외형 변경 영향 화면, Crashlytics(렌더 크래시 없는지).

### Phase 3 — 마감 (검증/정리)
- [ ] **S13. verify** — 번들+lint+주요 화면 렌더 점검(⑥).
- [ ] **S14. wrap** — diff 셀프리뷰, HomeScreen 데드코드 처리 결정, 군더더기 제거(⑦).
- [ ] **S15. ship** — 브랜치/커밋 분할(토큰/컴포넌트/화면)/PR 준비(⑧, 승인 후 실행).

### 1순위(동작하는 최소 조각)
**S1+S2(토큰 확장)** → 즉시 번들로 검증 가능하고 이후 모든 단계의 기반. 커밋 단위: `feat(theme): 시안 토큰 확장`.

### 커밋 분할 계획
1. `feat(theme): 시안 디자인 토큰 확장 (S1-S2)`
2. `feat(components): 시안 스펙 공통 컴포넌트 (S4-S8)`
3. `feat(ui): 로그인·메인홈 채택안 적용 (S9-S10)`
4. `feat(ui): 차량/마이페이지 토큰화 (S11-S12)`
</content>
</invoke>

---

# 2차 UI 개편 (진행 중)

> 추천 순서: ①회원가입 ②유저 핵심동선 정합 ③관리자 콘솔(07) ④C2B2C(08) ⑤(옵션)5탭 네비.
> 1차 토큰/컴포넌트 재사용, 변수 연결 정합성 유지. 한 묶음씩 구현·검증·커밋.

## 2-1. 회원가입 ✅
- `RegisterScreen`: 플로팅 백버튼 → 헤더바(‹ 회원가입), 폼을 `Card elevated`로 래핑, 풀폭 CTA, 인트로 문구. 로직/검증/Functions 호출 보존. 기존 InputField/Button 재사용.

## 2-2. 유저 핵심동선 — 상태 칩 정합 ✅
- MyPage `Buy/SellConsultationsTab`: 상태 배지 `variant="chip"` 전환 + Card `elevated`.
- `UserConsultationDetailScreen`: 상태 배지 chip 전환.
- **버그 수정**: "승인됨"이 `status="completed"`(파랑)로 잘못 매핑 → `status="approved"`(초록, 시안 정합).
- 공유 `ConsultationCard`(관리자 상담탭에서도 사용): 상태 배지 chip + Card elevated → 관리자 상담 리스트도 함께 시안화.

### 검증
- lint 0 error, Metro 프로덕션 번들 성공.

### 2-3(관리자)에서 처리할 발견사항
- 관리자 상담 탭(Pending/Approved/Rejected/Meeting/Completed)의 Badge는 **상태가 아니라 타입(구매/판매) 라벨**로 오용 중 + enum에 없는 `status="failed"`·`status="success"`(깨진 값) 사용. → 블라인드 chip 전환 부적절, 2-3에서 타입 태그/상태 분리 설계 + 깨진 status 값 정리 필요.

## 남은 묶음
- 2-3 관리자 콘솔(07): AdminVehiclesList/AdminConsultation(+tabs)/AdminSchedule/AdminUserManagement/AdminPage — 큰 묶음, decompose에서 분할.
- 2-4 C2B2C 거래체결(08).
- 2-5 (옵션) 5탭 네비 — 별도 승인.

## 2-3. 관리자 콘솔 (상담·차량) ✅ 1차분
신규 **Tag 컴포넌트**(분류용 칩, colors.tag 토큰)를 추가해 "상태 vs 분류" 의미 분리.
- 신규: `src/components/Tag.js` (variant info/neutral/accent), index export.
- 관리자 상담 탭 5종(Pending/Approved/Rejected/Meeting/Completed):
  - 구매/판매 **타입 라벨 → Tag**(상태 배지 오용 제거), 실제 상태는 Badge `chip`.
  - **깨진 status 값 정리**: `failed`/`success`/`warning`(enum 외 → 회색 폴백 버그)을
    Tag 또는 유효 status(chip)로 교체. 소유권이전 플래그 → Tag(accent).
  - Card `elevated` 적용.
- `AdminVehicleDetailScreen`: 차종 → Tag, 승인상태 → Badge chip.
- `AdminVehiclesListScreen`: 차종 badge → Tag + **카드에 승인상태 chip 추가**(기존엔 상태 미표시), Card elevated.
- `AdminPageScreen`: 차종 badge → Tag, Card elevated, 미사용 Badge import 제거.

### 검증
- lint 0 error, Metro 프로덕션 번들 성공. 깨진 status 값 전수 grep 0건.

### 2-3 남은 화면 (다음 증분)
- `AdminScheduleScreen`(캘린더), `AdminUserManagementScreen`, `AdminConsultationScreen`(탭 컨테이너/TabView 헤더), `AdminVehiclesListScreen` 카드의 VehicleCard화(선택).

## 남은 묶음
- 2-3 잔여(스케줄/사용자관리/탭헤더) → 다음.
- 2-4 C2B2C 거래체결(08).
- 2-5 (옵션) 5탭 네비.

## 2-3 잔여 (스케줄·사용자관리) ✅
- `AdminUserManagementScreen`: **전면 토큰화**(기존 theme 미사용 + 비브랜드 #007bff 하드코딩 제거).
  SearchBar/Card elevated/Avatar/Tag(관리자)/상태 chip(활성=approved초록, 정지=rejected빨강)/EmptyState 적용.
  로직(fetch/filter/toggle/Switch/activity log) 보존. formatPhone 재사용.
- `AdminScheduleScreen`: 캘린더 선택일 흰색 하드코딩(#ffffff×2) → neutral.white 토큰.
- `AdminConsultationScreen`: 이미 토큰화 완료(0 하드코딩) — 변경 불요.
- 검증: lint 0 error, Metro 번들 성공.

→ **2-3 관리자 콘솔 완료.** 남은 묶음: 2-4 C2B2C(08), 2-5(옵션) 5탭 네비.

## 2-4. C2B2C 거래 체결 (08) ✅
시안 08은 신규 화면이 아니라 **기존 거래 모달의 바텀시트 비주얼 정의**임을 확인.
- **정합성 버그**: `theme.colors.background.paper`가 5개 모달에서 깨진 키(undefined 배경)로
  사용 중 → `background.paper='#FFFFFF'` 별칭(additive)으로 일괄 복구.
- `CompleteDealModal`(판매/구매 체결): 중앙 페이드 모달 → **바텀시트**(slide, 라운드 top,
  그랩 핸들) + 시안의 **"체결 시 처리 내용" 번호 스텝**(sell 3단계: 완료→보유등록→판매완료(red),
  buy 2단계). 폼/검증/analytics 전부 보존.
- `OwnershipTransferConfirmModal`(소유권 이전): 바텀시트로 전환(그랩 핸들). 로직 보존.
- 검증: lint 0 error, Metro 번들 성공.

→ **2-4 완료.** 남은 것: 2-5(옵션) 5탭 네비. 나머지 거래 모달(SoldVehicle/OwnershipTransferDetail/
  RejectConsultation)은 background.paper 별칭으로 정상 렌더되며, 바텀시트 전환은 선택(후속).

## 2-5. 5탭 네비 (B안: 실용 4탭) ✅
시안 5탭(홈/차량/등록/상담/마이)을 리스크 낮춘 **4탭(홈/등록/상담/마이)** 으로 구현.
- 신규 `UserConsultationsScreen`: 마이페이지에 묶여 있던 구매/판매 상담을 **전용 탭으로 분리**.
  데이터/네비(useConsultationStore, BuyConsultationsTab/SellConsultationsTab) 재사용.
- `MyPageScreen` 간소화: 상담 TabView 제거 → 프로필(Avatar)+내 차량+로그아웃/탈퇴.
  소비하던 store는 vehicle만 구독(consultation은 새 화면이 구독). 로그아웃 cleanup 보존.
- `AppNavigator` UserTabs: Vehicles(홈, home 아이콘)/Register/Consultations(신규)/MyPage 4탭.
  ※ AppNavigator는 세션 전 미커밋(헤더/탭바 화이트 스타일)이 있던 파일 — 이 커밋에 함께 포함됨.
- 검증: lint 0 error, Metro 번들 성공.

→ **2차 전부 완료 (2-1~2-5).** 시안 01~08 + 5탭 IA 반영 완료.

## 후속: 탭 상단 헤더 제거 ✅
시안에 맞춰 유저 탭 화면의 React-Navigation 상단 헤더를 제거(headerShown:false).
- 탭 화면이 상태바에 붙지 않도록 SafeArea edges에 'top' 추가(홈/마이/상담/등록).
- 타이틀이 없던 등록·상담 화면에 인-스크린 타이틀("차량 등록"/"상담 내역") 추가.
- 푸시 상세 화면(VehicleDetail/ConsultationRequest 등)의 헤더(뒤로가기)는 유지.
- 검증: lint 0 error, Metro 번들 성공.

## 충실도 향상 1: Pretendard 폰트 번들 + 탭바
- 시안이 쓰는 **Pretendard** 5웨이트(Regular~ExtraBold) `src/assets/fonts/`에 번들.
- `react-native.config.js`: 폰트 에셋 링크 경로(`npx react-native-asset`로 android/iOS 등록).
- `src/theme/fonts.js`: weight→Pretendard 파일명 매핑(`familyForWeight`). theme.fonts로 노출.
- `src/theme/applyPretendard.js`: Text/TextInput render를 감싸 fontWeight를 보고 알맞은
  Pretendard 패밀리를 주입 → **화면 수정 없이 앱 전역 Pretendard**. 방어적(실패 시 시스템폰트 폴백).
  `index.js`에서 applyPretendard() 호출.
- 상단 세그먼트 탭바(상담 구매/판매 TabView): 인디케이터 3px 라운드, 굵은 라벨, 톤다운 배경으로 시안화.
- **⚠️ 적용에 네이티브 재빌드 필요**: `npx react-native-asset` 후 `npm run android`. JS 번들만으론 폰트 미반영(런타임 디바이스 확인 필요).
- 검증(정적): lint 0 error, Metro 번들 성공.
