# Design — Deferred Account Deletion (Task 126)

> **구현 상태 (2026-06):** P1·P2·P3 코드 완료(커밋됨), **functions 배포 대기**.
> - P1 `cascadeDeleteUser` 파괴→숨김 + `recoverDeletedUser` un-hide + `vehicleFilterService` 필터 — done
> - P2 `scheduledPermanentDelete`(onSchedule 매일 03:00 KST) 신설 — done (배포 시 Cloud Scheduler 활성화)
> - P3 MyPage 카피 정확화 — done
> - **남은 것**: `firebase deploy --only functions` (cascadeDeleteUser 갱신 + 신규 스케줄 함수). 그리고 *자가 복구 UI 없음* — Auth disabled 상태라 사용자가 직접 복구 불가 → **관리자 경유 복구**(recoverDeletedUser를 admin이 호출)가 실제 경로(카피의 "고객센터 문의"와 일치). 자가복구를 원하면 별도 작업.

> 목표: "30일 복구 가능" 약속과 실제 동작을 일치시킨다. 탈퇴 시점에는 **아무것도
> 파괴하지 않고**(숨김만), 30일 마감일에 **스케줄 함수가** 실제로 파괴한다.
> 복구는 아무것도 안 지워졌으므로 전부 원상복구된다.

## 1. 현재 문제 (요약)
`cascadeDeleteUser`가 탈퇴 즉시 차량(Step3)·상담(Step4)·이미지(Step5)를 **hard delete**하면서
계정만 소프트 삭제(Step6~7)한다. `recoverDeletedUser`는 user 문서/Auth만 복원 → 데이터는 못 살림.
= 약속은 A(지연), 동작은 B(즉시) 인 모순.

## 2. 목표 상태 머신 (account lifecycle)

```
active ──(회원탈퇴)──▶ pending_deletion ──(permanentDeleteDate 도달, 스케줄러)──▶ purged(완전삭제)
   ▲                        │
   └──────(recover, 마감 전)─┘
```

- `pending_deletion` 동안: 콘텐츠는 **숨김(hidden)** 상태로 보존. 로그인 차단(Auth disabled + isActiveUser 규칙).
- `recover`: 마킹 해제 + 콘텐츠 un-hide. **완전 복구.**
- `purged`: 스케줄러가 콘텐츠·계정·Auth를 실제 삭제. 복구 불가.

## 3. 데이터 모델 변경

새 필드 추가(파괴 대신 마킹):
- `vehicles/{id}.hidden: boolean` — 탈퇴 유예 중 공개 목록에서 제외. (기본 부재=노출)
- (선택) `consultation_requests/{id}.hidden: boolean` — 관리자 목록에서 제외.
- `users/{uid}` 는 기존대로 `accountStatus: 'pending_deletion'`, `permanentDeleteDate`, `deletedAt`, `_originalData` 유지.

> 차량 `status`(approved 등)는 **건드리지 않는다**(복구 시 원상태 보존). 숨김은 별도 `hidden` 플래그로만.

## 4. 컴포넌트별 변경

### 4.1 cascadeDeleteUser (탈퇴 = 소프트, 파괴 제거)
- **삭제(Step 3~5) → 숨김 처리로 교체**:
  - 사용자 차량: `batch.update(ref, { hidden: true })` (현행 `batch.delete` 대신). private 서브문서·이미지는 **건드리지 않음**(보존).
  - 사용자 상담(구매자·판매자): `{ hidden: true }`.
- Step 6(user 마킹 + permanentDeleteDate + _originalData), Step 7(Auth disable)은 유지.
- 반환 통계: `vehiclesHidden`, `consultationsHidden` 으로 의미 변경.

### 4.2 recoverDeletedUser (복구 = un-hide)
- 기존: user 문서 복원 + Auth 재활성화. (유지)
- **추가**: 그 사용자의 차량/상담 `hidden` 해제. (탈퇴 때 숨긴 것 되돌림)
  - 쿼리: `where('sellerId','==',uid)` (+ currentOwnerId), `where('userId','==',uid)` 로 찾아 `{ hidden: deleteField() 또는 false }`.

### 4.3 (신규) scheduledPermanentDelete — 실제 파괴
- `firebase-functions/v2/scheduler`의 `onSchedule('every 24 hours' 또는 'every day 03:00')`.
- 로직(현재 cascadeDelete의 Step3~5 + 계정 hard delete를 **여기로 이동**):
  1. `users` 에서 `accountStatus=='pending_deletion' && permanentDeleteDate <= now` 조회.
  2. 각 사용자에 대해:
     - 차량 + `vehicles/{id}/private/contact` 서브문서 삭제 (#75 로직 재사용)
     - 상담(구매자·판매자) 삭제
     - Storage 이미지 삭제 (imageUrl/imageUrls 모두)
     - `admin_owned_vehicles` 는 **삭제하지 않음**(관리자 자산)
     - user 문서 hard delete
     - `admin.auth().deleteUser(uid)`
  3. **멱등성**: 한 사용자 처리가 실패해도 다음 실행이 재시도(여전히 pending_deletion). 청크 배치.
- 권한: Cloud Scheduler API 필요(Blaze면 활성화 가능).

### 4.4 공개 쿼리 — 숨김 필터
- 공개 차량 구독(`vehicleStore.subscribeToApprovedVehicles`, `vehicleFilterService`)에서 `hidden===true` 제외.
  - **권장: 클라이언트 필터** `.filter(v => !v.hidden)` (기존에도 클라 필터 존재, 인덱스 불필요·저위험).
  - (대안: `where('hidden','==',false)` + 전 문서 hidden 필드 보장 + 복합 인덱스 — 더 무거움.)
- 관리자 상담 목록(`consultationQueryService`)에서도 hidden 제외(선택).
- 소유자 본인 화면(MyPage)은 자기 차량을 계속 보여도 무방(탈퇴 진행 중 안내 목적).

### 4.5 MyPage 카피 — 정확화
- 변경: "✓ 30일 이내 **데이터까지 복구 가능** / ✓ 30일 후 모든 데이터 영구 삭제". (이제 사실과 일치)

## 5. 엣지 케이스
- **진행 중 상담**: 탈퇴자의 차량이 hidden → 신규 상담 불가(차량 안 보임 + 규칙상 pending_deletion 사용자 create 차단). 기존 상담은 숨김 후 마감일에 purge.
- **관리자에게 판 차량**(sell→admin 완료): 이미 `admin_owned_vehicles`/소유권 이전됨 → 그 자산은 삭제 대상 아님. 차량 쿼리는 `sellerId==uid`만 잡으므로 currentOwnerId가 admin인 건 영향 없음.
- **부분 실패**: 스케줄러 멱등 → 다음날 재시도.
- **시계/타임존**: `permanentDeleteDate`는 서버 Timestamp 비교(`<= now`)로 안전.
- **GDPR/PIPA**: 30일 유예는 합리적 처리기간으로 허용. 단 사용자가 "즉시 완전 삭제"를 명시 요청하면 별도 처리 경로 고려(후순위).

## 6. 보안 규칙 영향
- `pending_deletion` 사용자는 이미 `isActiveUser()`로 쓰기 차단(현행).
- hidden 차량 read: 공개 read 규칙은 status=='approved' 기준 → hidden이어도 읽힘. **클라 필터로 숨김 충분**(저위험). 더 엄격히 하려면 규칙에 `resource.data.get('hidden', false) != true` 추가(선택).

## 7. 롤아웃 단계 (작게 나눠 배포)
1. **P1 — 모델·소프트화**: cascadeDeleteUser(파괴→숨김) + recoverDeletedUser(un-hide) + 공개 쿼리 hidden 필터. 배포. *(이 시점부터 신규 탈퇴는 데이터 보존)*
2. **P2 — 스케줄러**: scheduledPermanentDelete 신설(파괴 로직 이동) + Cloud Scheduler 활성화. 배포. 짧은 주기로 한 번 검증 후 일 단위로.
3. **P3 — 카피**: MyPage 안내 문구 정확화.

> P1만 배포돼도 "복구 약속"은 즉시 정직해진다(데이터 보존됨). P2가 빠지면 마감일 자동삭제만 미동작 → 수동/후속.

## 8. 테스트 전략
- 탈퇴 → 공개 목록에서 그 차량 사라짐, 본인 로그인 차단, 데이터(차량/상담/이미지) **Firestore·Storage에 그대로 존재**.
- 유예 중 recover → 차량 다시 목록 노출, 데이터 손실 0.
- permanentDeleteDate 과거로 세팅 후 스케줄러 강제 실행 → 차량/상담/이미지/private/user/auth 모두 삭제, 고아 없음.
- 멱등성: 스케줄러 2회 실행해도 오류 없음.

## 9. 공수/리스크
- 중간~큰. 신규 스케줄 함수 + 쿼리 필터 + 양방향(숨김/복구) 로직 + 배포 3회.
- 리스크: 스케줄러 권한/빌링, "숨김 누락" 시 탈퇴자 매물 노출(테스트로 커버). 파괴는 마감일에만 일어나므로 데이터 손실 위험은 오히려 **감소**.

## 10. 참고
- 현재 파괴 로직: [functions/accountManagement/cascadeDelete.js](../functions/accountManagement/cascadeDelete.js) Step 3~5.
- #75에서 추가한 private 서브문서 삭제 로직을 스케줄러로 이동해 재사용.
- 관련: [REVIEW_FINDINGS_2026-06-20.md](REVIEW_FINDINGS_2026-06-20.md), [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)
