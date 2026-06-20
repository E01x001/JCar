# JCar 릴리스 체크리스트 & 배포 런북

> 마지막 감사: 2026-06. 보안 작업(권한상승/자가승인/Storage/PII 규칙 + cascade 정리)은
> 코드 커밋 + 백엔드(규칙/함수) 배포 완료. **남은 것은 앱 빌드 출시 + #125 PII 마이그레이션.**

## 0. 현재 상태 요약

| 영역 | 상태 |
|---|---|
| Firestore/Storage 보안 규칙 | ✅ 배포됨 (privilege-escalation/self-approval/tampering/PII subdoc) |
| Cloud Functions (registerUser, cascadeDeleteUser 등) | ✅ 배포됨 |
| 클라이언트 코드 변경(PII 분리, 중복제출, enum, logger 등) | ⏳ **커밋만 됨 — 새 빌드 출시 필요** |
| 기존 차량 문서의 판매자 PII | 🔴 **아직 노출 중** — 출시 후 #125 마이그레이션 실행해야 제거됨 |
| 릴리스 서명 (android/key.properties) | ✅ 로컬 구성됨 (gitignore 처리됨) |

## 1. 빌드 전 점검

- [ ] `npm run lint` / `npm test` 그린 (CI도 동일 게이트)
- [ ] **versionCode 증가** — `android/app/build.gradle`의 `versionCode`(현재 `1`)를 Play 업로드마다 +1. versionName도 갱신.
- [ ] `google-services.json` package_name(`com.jcarnew`) == applicationId 확인 ✅ (현재 일치)
- [ ] `.env` / API 키가 빌드에 올바르게 주입되는지 (react-native-config)

## 2. 릴리스 빌드 (서명 AAB)

```bash
# 릴리스 번들(AAB) — Play 업로드용
cd android && ./gradlew bundleRelease
# 산출물: android/app/build/outputs/bundle/release/app-release.aab
```

- [ ] **릴리스 빌드를 실제 기기에서 검증** — `release`는 `minifyEnabled + shrinkResources + proguard` 활성.
      R8/ProGuard가 RN/Firebase의 리플렉션을 깨면 **release에서만 크래시**할 수 있음.
      `npx react-native run-android --variant=release`로 핵심 플로우(로그인/등록/상담/이미지업로드) 스모크 테스트.
- [ ] Crashlytics에 release 빌드 크래시가 올라오는지 확인(매핑 업로드는 crashlytics gradle plugin이 처리)

## 3. CI 개선 (선택, 권장)

`.github/workflows/android-ci.yml` 현재: lint/test 게이트 + **debug APK만** 빌드.

- [ ] `actions/upload-artifact@v3` / `actions/cache@v3` → **v4로 업그레이드** (v3 sunset)
- [ ] release **AAB 빌드 잡 추가**(서명 secret은 GitHub Secrets로) — release 빌드가 CI에서 깨지지 않는지 검증
- [ ] (선택) lint/test를 PR 필수 통과(branch protection)로

## 4. Play 스토어 정책 (PII 다룸 → 필수)

- [ ] **개인정보처리방침 URL** 준비 (전화번호·이메일·사진 수집). Play Console에 등록.
- [ ] **데이터 보안(Data Safety) 폼** 작성: 수집 항목(전화/이메일/사진/기기), FCM 사용, 계정·데이터 삭제 경로.
      ✅ 앱 내 회원탈퇴(30일 소프트삭제) 존재 → "계정 삭제 요청" 정책 충족.
- [ ] 권한 고지: 카메라/사진(이미지 등록), 알림(FCM)

## 5. 배포 순서 (의존성 있음 — 순서 지킬 것)

1. ✅ **보안 규칙/함수 배포** (완료) — 신규 등록의 private PII 쓰기가 prod에서 허용되려면 규칙이 먼저 있어야 함.
2. [ ] **새 앱 빌드(AAB) Play 업로드 → 출시**. 이때부터 신규 차량 등록은 PII를 `vehicles/{id}/private/contact`로 저장.
3. [ ] **#125 PII 마이그레이션 실행** (아래 6번) — 기존 문서 PII 제거.
4. [ ] 마이그레이션 검증 후, MigrationScreen은 임시 화면이므로 다음 빌드에서 제거 고려.

## 6. #125 PII 마이그레이션 런북

**목적**: 기존 차량 문서의 인라인 판매자 PII(name/phone/email/ownerName/regiNumber/vin)를
`vehicles/{id}/private/contact`로 이전하고 공개 문서에서 삭제.

**전제**: 보안 규칙 배포됨(✅), 새 빌드 출시됨(MigrationScreen에 마이그레이션 버튼 포함).

**실행**:
1. 관리자 계정으로 로그인 → MigrationScreen 진입.
2. "차량 PII 마이그레이션 실행" → 확인.
3. 결과(이전 N건 / 스킵 M건) 확인. 스크립트는 청크 배치(200대/배치)로 안전 처리.

**검증**:
- [ ] 일반(비소유자) 계정으로 승인된 차량 문서를 읽어 `sellerPhone`/`sellerEmail`이 **없는지** 확인.
- [ ] 관리자 차량 상세에서 판매자 연락처가 여전히 보이는지(private subdoc 폴백) 확인.
- [ ] 신규 등록 1건 테스트 → 공개 문서엔 PII 없고 private/contact에 존재.

**롤백/주의**:
- 마이그레이션은 공개 문서의 PII 필드를 `deleteField()`로 제거(되돌리기 불가) → 실행 전 Firestore 백업 권장.
- private/contact 생성과 공개 필드 삭제는 같은 배치라 부분 실패 시 해당 차량은 원자적으로 유지.

## 7. 출시 후

- [ ] Crashlytics / Functions 로그 모니터링(첫 24h)
- [ ] 후속 보안 태스크 **#126**(소프트삭제 영구삭제 설계 — 현재 30일 복구가 데이터까지 복구하지 못함) 처리
- [ ] 후순위: #123(Alert/Toast 표준화)
