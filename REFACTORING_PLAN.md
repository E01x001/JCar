# JCar 체계적 리팩토링 실행 계획

## 📊 프로젝트 현황

### 분석 완료 통계
- **총 태스크**: 120개 (기존 70개 + 리팩토링 51개)
- **완료된 태스크**: 69개
- **대기 중인 리팩토링 태스크**: 51개
- **복잡도 분석 완료**: 50개 태스크
  - High complexity (8-10점): 13개
  - Medium complexity (5-7점): 29개
  - Low complexity (1-4점): 8개

### 즉시 시작 가능한 태스크
23개의 태스크가 의존성 없이 즉시 시작 가능합니다.

---

## 🚨 Phase 1: 긴급 보안 및 배포 수정 (Week 1-2)

### 우선순위 P0 - 즉시 실행
이 단계는 프로덕션 배포를 막고 있는 치명적 이슈를 해결합니다.

#### Task #77: Firebase Functions 배포 오류 해결 ⭐ **최우선**
**복잡도**: 6/10 | **서브태스크**: 3개
- Firebase Functions SDK 버전 업데이트
- v2 API로 모든 트리거 리팩토링
- 스테이징 환경에서 배포 검증

**예상 시간**: 4-6시간
**즉시 시작 가능**: ✅ (의존성 없음)

```bash
# 실행 명령어
task-master set-status --id=77 --status=in-progress
task-master show 77
```

---

#### Task #71: API 인증 토큰 보안 ⭐ **긴급**
**복잡도**: 4/10 | **서브태스크**: 4개
- react-native-config 설치 및 설정
- 하드코딩된 API 토큰 제거 (VehicleRegistrationScreen.js:66)
- 환경 변수로 마이그레이션
- README 문서화

**예상 시간**: 3-4시간
**즉시 시작 가능**: ✅ (의존성 없음)

**서브태스크**:
1. 71.1: react-native-config 설치 및 .env 파일 구성
2. 71.2: 민감한 자격증명 식별 및 .env로 이동
3. 71.3: Config 변수 사용하도록 코드 업데이트
4. 71.4: 환경 설정 문서화 및 보안 검증

```bash
# 실행 명령어
task-master set-status --id=71 --status=in-progress
cd C:\JCar
npm install react-native-config
```

---

#### Task #72: 노출된 API 키 재발급 ⭐ **긴급**
**의존성**: Task #71 완료 후
**예상 시간**: 1-2시간

API 제공자 콘솔에서:
1. 현재 키 즉시 비활성화
2. 새 키 생성
3. .env에 새 키 추가
4. 배포 및 검증

---

#### Task #73-76: 계정 삭제 cascade 구현 ⭐ **높음**
**복잡도**: 7-8/10 | **서브태스크**: 3-4개 각각
- Cloud Function `cascadeDeleteUser` 설계
- 사용자 차량, 상담, Storage 이미지 삭제 로직
- Soft delete 및 30일 복구 기간 구현
- 삭제 확인 이메일 발송

**예상 시간**: 1-2일
**즉시 시작 가능**: ✅ (Task #73은 의존성 없음)

---

### Phase 1 체크리스트
- [ ] Firebase Functions 배포 성공
- [ ] 모든 푸시 알림 트리거 작동 확인
- [ ] 하드코딩된 API 토큰 제거 완료
- [ ] 새 API 키 발급 및 적용
- [ ] 계정 삭제 시 모든 연관 데이터 정리
- [ ] Soft delete 및 복구 기능 작동

**예상 완료 시간**: 1-2주

---

## 🔒 Phase 2: Firestore 보안 강화 (Week 3)

### Task #80-82: 보안 규칙 개선
**복잡도**: 7-8/10 | **서브태스크**: 3개 각각

#### Task #80: 차량 필드 수준 보안
- 공개 필드 vs 소유자 전용 필드 분리
- 판매자 개인정보 마스킹
- Firebase Security Rules Playground 테스트

#### Task #81: 상담 요청 보안 강화
- 요청자/차량 소유자/관리자만 조회 가능
- 상태 전환 검증 규칙
- 관리자 전용 필드 보호

#### Task #82: 상담 요청 Rate Limiting
- Cloud Function 기반 속도 제한
- Firestore 카운터 방식 구현
- 클라이언트 에러 처리 통합

**예상 완료 시간**: 1주

---

## 🚀 Phase 3: 서비스 레이어 리팩토링 (Week 4-6)

### Task #88: firebaseService.js 모듈화 ⭐ **핵심**
**복잡도**: 9/10 (최고) | **서브태스크**: 5개
**의존성**: 없음 | **즉시 시작 가능**: ✅

#### 목표 구조
```
src/services/
├── auth/
│   ├── authService.js          # 로그인, 회원가입 (150줄)
│   ├── sessionService.js       # 세션 관리 (100줄)
│   └── accountService.js       # 계정 삭제, 프로필 (120줄)
├── vehicle/
│   ├── vehicleService.js       # CRUD (200줄)
│   ├── vehicleApprovalService.js # 승인/거절 (100줄)
│   └── vehicleQueryService.js  # 검색, 필터 (150줄)
├── consultation/
│   ├── consultationService.js    # CRUD, 상태 변경 (250줄)
│   ├── consultationQueryService.js # 쿼리, 페이지네이션 (150줄)
│   └── consultationValidation.js # 중복 체크, 시간 충돌 (100줄)
├── notification/
│   ├── fcmService.js          # FCM 토큰 관리 (100줄)
│   └── notificationService.js # 로컬 알림 (80줄)
└── storage/
    └── imageService.js        # 이미지 업로드, 압축 (150줄)
```

**서브태스크**:
1. 88.1: 디렉토리 구조 및 서비스 파일 생성
2. 88.2: firebaseService.js에서 함수 체계적으로 이동
3. 88.3: 전체 앱의 import 경로 업데이트
4. 88.4: 포괄적인 회귀 테스트
5. 88.5: 서비스 모듈성을 위한 ESLint 규칙 구현

**예상 시간**: 3-4일

---

### Task #89-91: Repository Pattern 구현 ⭐ **아키텍처**
**복잡도**: 8/10 | **서브태스크**: 3개 각각
**의존성**: Task #88 완료 후

#### 구현 계획
```javascript
// src/repositories/VehicleRepository.js
class VehicleRepository {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5분
  }

  async getById(id) {
    if (this.cache.has(id)) return this.cache.get(id);
    const doc = await firestore().collection('vehicles').doc(id).get();
    const data = { id: doc.id, ...doc.data() };
    this.cache.set(id, data);
    return data;
  }

  async query(filters) { /* Firestore 쿼리 추상화 */ }
  async create(data) { /* 생성 로직 */ }
  async update(id, data) { /* 업데이트 로직 */ }
  async delete(id) { /* 삭제 로직 */ }
}

export default new VehicleRepository(); // Singleton
```

**예상 시간**: 4-5일

---

### Task #97: Magic String Constants 중앙화
**복잡도**: 7/10 | **서브태스크**: 4개
**의존성**: 없음 | **즉시 시작 가능**: ✅

#### 구현
```javascript
// src/constants/consultation.js
export const CONSULTATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const CONSULTATION_TYPE = {
  BUY: 'buy',
  SELL: 'sell',
};

// src/constants/vehicle.js
export const VEHICLE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const VEHICLE_TYPES = ['승용차', '택시', '렌터카', '화물차', '군용차', '외교차'];
```

**서브태스크**:
1. 97.1: constants/ 디렉토리 및 초기 모듈 생성
2. 97.2: 모든 magic string 식별 및 추출
3. 97.3: magic string을 상수로 교체
4. 97.4: constants import 경로 업데이트

**예상 시간**: 2-3일

---

## ⚡ Phase 4: 성능 최적화 (Week 7-8)

### Task #83: React 성능 최적화
**복잡도**: Medium | **서브태스크**: 여러 개
**의존성**: 없음 | **즉시 시작 가능**: ✅

#### 최적화 대상
```javascript
// Before
const VehiclesListScreen = () => {
  const [vehicles, setVehicles] = useState([]);

  const filteredVehicles = vehicles.filter(v => v.status === 'approved');

  const handlePress = (id) => {
    navigation.navigate('VehicleDetail', { vehicleId: id });
  };

  return <FlatList data={filteredVehicles} ... />;
};

// After
const VehiclesListScreen = () => {
  const [vehicles, setVehicles] = useState([]);

  const filteredVehicles = useMemo(() =>
    vehicles.filter(v => v.status === 'approved'),
    [vehicles]
  );

  const handlePress = useCallback((id) => {
    navigation.navigate('VehicleDetail', { vehicleId: id });
  }, [navigation]);

  return (
    <FlatList
      data={filteredVehicles}
      keyExtractor={item => item.id}
      getItemLayout={(data, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      })}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      ...
    />
  );
};
```

**적용 파일**:
- AdminVehiclesListScreen.js
- VehiclesListScreen.js
- MyPageScreen.js
- 모든 consultation tab 컴포넌트

**예상 시간**: 3-4일

---

### Task #84-85: 중앙화된 상태 관리 (Zustand)
**복잡도**: 8/10 | **서브태스크**: 4개
**의존성**: 없음 | **즉시 시작 가능**: ✅

#### Zustand Store 구현
```javascript
// src/stores/vehicleStore.js
import create from 'zustand';
import firestore from '@react-native-firebase/firestore';

const useVehicleStore = create((set, get) => ({
  vehicles: [],
  loading: false,
  cache: new Map(),
  cacheTimestamp: null,
  unsubscribe: null,

  // Singleton listener
  subscribeToVehicles: () => {
    if (get().unsubscribe) return; // Already subscribed

    const unsubscribe = firestore()
      .collection('vehicles')
      .where('status', '==', 'approved')
      .onSnapshot((snapshot) => {
        const vehicles = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        set({ vehicles, cacheTimestamp: Date.now() });
      });

    set({ unsubscribe });
  },

  unsubscribeFromVehicles: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null });
    }
  },

  // Cached query
  getVehicleById: (id) => {
    const { vehicles, cache } = get();

    // Check in-memory vehicles first
    const vehicle = vehicles.find(v => v.id === id);
    if (vehicle) return vehicle;

    // Check cache
    if (cache.has(id)) {
      const cached = cache.get(id);
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.data;
      }
    }

    return null;
  },
}));

export default useVehicleStore;
```

**예상 시간**: 3-4일

---

### Task #86-87: 서버 사이드 쿼리 및 페이지네이션
**복잡도**: 7-8/10 | **서브태스크**: 3-4개
**의존성**: 없음 (Task #86) | **즉시 시작 가능**: ✅

#### Before (Client-Side)
```javascript
// ❌ 나쁜 예: 모든 데이터 가져온 후 필터링
const consultations = await firestore()
  .collection('consultation_requests')
  .get();

const filtered = consultations.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .filter(c => c.consultationStatus === 'approved')
  .filter(c => c.type === 'buy')
  .filter(c => {
    const month = c.preferredDate.toDate().getMonth();
    return month === selectedMonth;
  });
```

#### After (Server-Side)
```javascript
// ✅ 좋은 예: Firestore 쿼리로 필터링
const startDate = new Date(year, month, 1);
const endDate = new Date(year, month + 1, 0, 23, 59, 59);

const consultations = await firestore()
  .collection('consultation_requests')
  .where('consultationStatus', '==', 'approved')
  .where('type', '==', 'buy')
  .where('preferredDate', '>=', startDate)
  .where('preferredDate', '<=', endDate)
  .orderBy('preferredDate', 'desc')
  .limit(20)
  .get();
```

#### Composite Index 생성
```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "consultation_requests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "consultationStatus", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "preferredDate", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "vehicles",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "year", "order": "DESCENDING" },
        { "fieldPath": "price", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**예상 시간**: 3-4일

---

## 🧪 Phase 5: 테스트 인프라 구축 (Week 9-11)

### Task #100: Jest 및 Firebase Mock 설정 ⭐ **기반**
**복잡도**: 8/10 | **서브태스크**: 4개
**의존성**: 없음 | **즉시 시작 가능**: ✅

#### 서브태스크
1. 100.1: React Native용 Jest 구성
2. 100.2: React Native Testing Library 설치 및 통합
3. 100.3: Firebase 모듈 Mock 생성
4. 100.4: Firebase 데이터 구조용 Mock Factory 구현

#### Jest 설정
```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-native-firebase)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      statements: 40,
      branches: 35,
      functions: 40,
      lines: 40,
    },
  },
};
```

#### Firebase Mock 예시
```javascript
// __mocks__/@react-native-firebase/firestore.js
const mockCollection = jest.fn(() => mockFirestoreQuery);
const mockDoc = jest.fn(() => mockDocumentReference);
const mockGet = jest.fn(() => Promise.resolve(mockQuerySnapshot));
const mockSet = jest.fn(() => Promise.resolve());
const mockUpdate = jest.fn(() => Promise.resolve());
const mockDelete = jest.fn(() => Promise.resolve());

const mockFirestoreQuery = {
  where: jest.fn(() => mockFirestoreQuery),
  orderBy: jest.fn(() => mockFirestoreQuery),
  limit: jest.fn(() => mockFirestoreQuery),
  get: mockGet,
  onSnapshot: jest.fn((callback) => {
    callback(mockQuerySnapshot);
    return jest.fn(); // unsubscribe
  }),
};

export default () => ({
  collection: mockCollection,
  doc: mockDoc,
});
```

**예상 시간**: 3-4일

---

### Task #101: 서비스 모듈 단위 테스트
**복잡도**: 8/10 | **서브태스크**: 4개
**의존성**: Task #91, #92, #96, #100

#### 목표 커버리지
- 서비스 레이어: **80%**
- 유틸리티: **90%**
- 컴포넌트: **50%**
- 전체: **40%+**

#### 테스트 예시
```javascript
// src/services/vehicle/__tests__/vehicleService.test.js
import vehicleService from '../vehicleService';
import firestore from '@react-native-firebase/firestore';

jest.mock('@react-native-firebase/firestore');

describe('vehicleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getApprovedVehicles', () => {
    it('should fetch vehicles with approved status', async () => {
      const mockVehicles = [
        { id: '1', vehicleName: 'Test Car', status: 'approved' },
      ];

      firestore().collection().where().get.mockResolvedValue({
        docs: mockVehicles.map(v => ({
          id: v.id,
          data: () => v,
        })),
      });

      const result = await vehicleService.getApprovedVehicles();

      expect(firestore().collection).toHaveBeenCalledWith('vehicles');
      expect(result).toEqual(mockVehicles);
    });

    it('should handle Firestore errors gracefully', async () => {
      firestore().collection().where().get.mockRejectedValue(
        new Error('permission-denied')
      );

      await expect(vehicleService.getApprovedVehicles())
        .rejects.toThrow('permission-denied');
    });
  });

  describe('createVehicle', () => {
    it('should create vehicle with correct data structure', async () => {
      const vehicleData = {
        vehicleName: 'Test Car',
        manufacturer: 'Hyundai',
        year: 2020,
      };

      await vehicleService.createVehicle(vehicleData);

      expect(firestore().collection().add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...vehicleData,
          status: 'pending',
          createdAt: expect.any(Object),
        })
      );
    });
  });
});
```

**예상 시간**: 5-6일

---

### Task #104: Firebase Emulator 통합 테스트
**복잡도**: 8/10 | **서브태스크**: 4개
**의존성**: Task #100

#### Emulator 설정
```bash
# Firebase Emulator 설치
npm install -g firebase-tools

# 초기화
firebase init emulators

# 실행
firebase emulators:start
```

#### firebase.json 설정
```json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "storage": {
      "port": 9199
    },
    "functions": {
      "port": 5001
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

#### E2E 테스트 예시
```javascript
// __tests__/integration/vehicleRegistrationFlow.test.js
describe('Vehicle Registration Flow (E2E)', () => {
  beforeAll(async () => {
    // Emulator에 연결
    await setupEmulatorConnection();
  });

  afterEach(async () => {
    // 각 테스트 후 데이터 정리
    await clearEmulatorData();
  });

  it('should complete full vehicle registration flow', async () => {
    // 1. 사용자 로그인
    const user = await createTestUser();
    await signIn(user.email, user.password);

    // 2. 차량 등록
    const vehicleData = createMockVehicleData();
    await registerVehicle(vehicleData);

    // 3. Firestore 검증
    const vehicleDoc = await firestore()
      .collection('vehicles')
      .where('sellerId', '==', user.uid)
      .get();

    expect(vehicleDoc.docs).toHaveLength(1);
    expect(vehicleDoc.docs[0].data()).toMatchObject({
      vehicleName: vehicleData.vehicleName,
      status: 'pending',
    });

    // 4. 관리자 승인
    await adminApproveVehicle(vehicleDoc.docs[0].id);

    // 5. 상태 변경 검증
    const approvedDoc = await firestore()
      .collection('vehicles')
      .doc(vehicleDoc.docs[0].id)
      .get();

    expect(approvedDoc.data().status).toBe('approved');
  });
});
```

**예상 시간**: 4-5일

---

## 🎨 Phase 6: UX 개선 (Week 12-14)

### Task #105: Loading Skeleton 구현
**복잡도**: Medium | **의존성**: 없음
**예상 시간**: 2-3일

### Task #106-108: 오프라인 지원 및 이미지 최적화
**복잡도**: 7-8/10 | **의존성**: 없음
**예상 시간**: 4-5일

### Task #109: 검색 기능 추가
**복잡도**: 7/10 | **의존성**: 없음
**예상 시간**: 3-4일

---

## 📊 Phase 7: 분석 및 모니터링 (Week 15-16)

### Task #110-111: Firebase Analytics 및 Performance Monitoring
**복잡도**: Medium | **의존성**: 없음
**예상 시간**: 3-4일

---

## 🏗️ Phase 8: 아키텍처 개선 (Week 17-20)

### Task #112: Zustand로 Context API 마이그레이션
**복잡도**: 8/10 | **의존성**: Task #84
**예상 시간**: 3-4일

### Task #113: Navigation 리팩토링
**복잡도**: Medium | **의존성**: 없음
**예상 시간**: 2-3일

---

## 📝 실행 가이드

### 1. 시작하기
```bash
# Task Master로 다음 태스크 확인
task-master next

# 태스크 세부정보 보기
task-master show 71

# 작업 시작
task-master set-status --id=71 --status=in-progress

# 서브태스크 확인
task-master show 71
```

### 2. 진행 중 업데이트
```bash
# 구현 노트 추가
task-master update-subtask --id=71.1 --prompt="react-native-config 설치 완료. 네이티브 모듈 링크 필요 없음 (자동 링크)"

# 상태 변경
task-master set-status --id=71.1 --status=done
task-master set-status --id=71.2 --status=in-progress
```

### 3. 완료 및 다음 단계
```bash
# 태스크 완료 표시
task-master set-status --id=71 --status=done

# 다음 태스크로 이동
task-master next
```

### 4. 진행 상황 모니터링
```bash
# 전체 진행 상황
task-master list

# 특정 상태의 태스크만 보기
task-master list --status pending,in-progress

# 복잡도 리포트 확인
task-master complexity-report
```

---

## 🎯 성공 지표

### 보안
- ✅ 하드코딩된 자격 증명 0개
- ✅ 모든 보안 규칙 검증 완료
- ✅ 90일간 데이터 유출 0건

### 성능
- ✅ Firestore 읽기 60% 감소
- ✅ 앱 시작 시간 < 2초
- ✅ FlatList 스크롤 FPS > 55

### 코드 품질
- ✅ 테스트 커버리지 > 40%
- ✅ Production에 console.log 0개
- ✅ 모든 서비스 < 300줄
- ✅ Cyclomatic complexity < 10

### 사용자 경험
- ✅ 인지된 로딩 시간 50% 감소
- ✅ 오프라인 모드 기능적
- ✅ 검색 응답 시간 < 300ms
- ✅ 이미지 업로드 70% 빠름

### 모니터링
- ✅ 15개 이상 이벤트 Analytics 추적
- ✅ Performance 대시보드 구성
- ✅ 에러 추적 < 세션의 1%

---

## 🚀 즉시 시작 가능한 태스크 (의존성 없음)

### 보안 (P0)
- ✅ **Task #71**: API 자격증명 보안 (4시간)
- ✅ **Task #73**: Cascade Delete 설계 (1일)
- ✅ **Task #77**: Firebase Functions 수정 (6시간)
- ✅ **Task #80**: 필드 수준 보안 규칙 (3일)
- ✅ **Task #82**: Rate Limiting (3일)

### 리팩토링 (P1)
- ✅ **Task #88**: firebaseService.js 분할 (4일)
- ✅ **Task #97**: Constants 중앙화 (3일)
- ✅ **Task #83**: React 성능 최적화 (4일)
- ✅ **Task #84**: Zustand 상태 관리 (4일)
- ✅ **Task #86**: 서버 사이드 쿼리 (4일)
- ✅ **Task #92**: 글로벌 에러 핸들러 (3일)
- ✅ **Task #96**: Logger 유틸리티 (2일)
- ✅ **Task #99**: PropTypes (3일)

### 테스팅 (P1)
- ✅ **Task #100**: Jest 설정 (4일)

### UX (P2)
- ✅ **Task #105**: Loading Skeletons (3일)
- ✅ **Task #106**: 오프라인 지원 (4일)
- ✅ **Task #107**: 이미지 최적화 (4일)
- ✅ **Task #109**: 검색 기능 (4일)
- ✅ **Task #110**: Analytics (3일)
- ✅ **Task #111**: Performance Monitoring (3일)

### 기타 (P2-P3)
- ✅ **Task #113**: Navigation 리팩토링 (3일)
- ✅ **Task #114**: 임시 계정 정지 (4일)
- ✅ **Task #118**: ADR 문서 (2일)

---

## 💡 추천 실행 순서

### Week 1-2: 긴급 (P0)
1. **Task #77** (Firebase Functions) - 6시간
2. **Task #71** (API 보안) - 4시간
3. **Task #72** (API 키 재발급) - 2시간
4. **Task #73-76** (Cascade Delete) - 2일

### Week 3: 보안 강화
5. **Task #80** (필드 보안) - 3일
6. **Task #81-82** (상담 보안 + Rate Limiting) - 4일

### Week 4-6: 핵심 리팩토링
7. **Task #97** (Constants) - 3일 ⬅️ **먼저 실행 (다른 작업 전)**
8. **Task #88** (firebaseService 분할) - 4일
9. **Task #89-91** (Repository Pattern) - 5일
10. **Task #92-95** (에러 핸들링) - 5일

### Week 7-8: 성능 최적화
11. **Task #83** (React 최적화) - 4일
12. **Task #84-85** (Zustand) - 4일
13. **Task #86-87** (쿼리 + 페이지네이션) - 4일

### Week 9-11: 테스팅
14. **Task #100** (Jest 설정) - 4일
15. **Task #101** (단위 테스트) - 6일
16. **Task #104** (통합 테스트) - 5일

### Week 12-14: UX 개선
17. **Task #105-109** (Skeleton, 오프라인, 이미지, 검색) - 15일

### Week 15-20: 분석 + 아키텍처
18. **Task #110-113** (Analytics, Performance, State, Navigation) - 15일

---

## 📞 도움이 필요하면

### Task Master 명령어
```bash
# 도움말
task-master --help

# 다음 태스크 추천
task-master next

# 태스크 확장
task-master expand --id=<id>

# 복잡도 리포트
task-master complexity-report

# 진행 상황
task-master list
```

### 문서 위치
- 리팩토링 PRD: `.taskmaster/docs/refactoring-prd.md`
- 태스크 파일: `.taskmaster/tasks/tasks.json`
- 복잡도 리포트: `.taskmaster/reports/task-complexity-report.json`
- 향후 업데이트: `FUTURE_UPDATES.txt`

---

**생성일**: 2026-01-12
**총 리팩토링 태스크**: 51개
**예상 완료**: 20주 (5개월)
**즉시 시작 가능**: 23개 태스크

**다음 액션**: `task-master set-status --id=77 --status=in-progress`
