# scripts/

릴리스와 배포를 다루는 스크립트들. **셋 다 "조용히 실패하는" 실수를 막으려고 있다** —
채널이 잘못 박히거나, 네이티브가 바뀐 채 OTA가 나가거나, 업로드가 중간에 깨지는 일은
전부 에러 없이 지나가고 나중에 사용자 쪽에서 드러난다.

## `native-drift.mjs` — OTA로 보내면 안 되는 변경을 막는다

`npm run update:*`가 발행 전에 자동으로 부른다. 직접 부를 일은 거의 없다.

```bash
npm run check:native                  # 지금 네이티브가 바뀌었는지
node scripts/native-drift.mjs record  # 빌드 후 지문 갱신 (build-release가 부른다)
```

`runtimeVersion`을 안 올린 채 네이티브 변경을 OTA로 내보내면, 없는 모듈을 호출하는
JS가 기존 설치본에 배달돼 **전 기기가 죽는다.** 스토어 심사도 없어서 막을 곳이
여기뿐이다. `android/`는 지문에서 뺀다 — CNG에서는 생성물이지 입력이 아니고,
채널이 박혀 있어 채널만 바꿔도 오탐이 난다.

## `build-release.mjs` — 채널을 박고, 박혔는지 확인한다

```bash
npm run build:preview       # 내부 테스트
npm run build:production    # 운영
```

**OTA 채널은 prebuild 때 AndroidManifest로 들어가고 그 뒤로는 OTA로 못 바꾼다.**
채널이 틀린 AAB를 올리면 업데이트가 엉뚱한 쪽으로 가거나 아무것도 안 오는데,
둘 다 조용히 실패한다. 그래서 채널을 인자로 강제하고 빌드 후 매니페스트를 직접
읽어 검증한다.

빌드만 한다. 업로드는 아래가 맡는다.

## `publish-internal.mjs` — Play 내부 테스트 트랙 업로드

```bash
node scripts/publish-internal.mjs --notes "무엇이 바뀌었는지"
node scripts/publish-internal.mjs --dry-run
```

의존성 없이 Node 내장 `crypto`/`fetch`만 쓴다. 서비스 계정 JSON으로 RS256 JWT를
서명해 토큰을 받고 edits 트랜잭션으로 올린다:

```
edits.insert → bundles.upload → tracks.update(internal) → edits.commit
```

`commit` 전까지는 아무것도 반영되지 않는다. 중간에 실패하면 edit이 버려질 뿐
트랙 상태는 그대로다. 이 서비스 계정에는 **테스트 트랙 권한만** 있어 운영 게시는
불가능하다.

`play-service-account*.json`은 gitignore 대상이다.

---

## `migrateConsultationStatus.js` — 실행하지 말 것 (Firestore 시절 유물)

`firebase-admin`으로 **Firestore에 접속하는** 1회성 마이그레이션이다.
2026-08 Supabase 이전으로 그 데이터베이스는 더 이상 없다. 돌려도 접속에서 실패한다.

당시 무엇을 했는지 기록으로만 남긴다: `status` → `consultationStatus` 이름 변경,
`approved` → `confirmed` 값 매핑, 정산 관련 필드 추가.

지금 스키마 변경은 `supabase/migrations/`로 한다. **적용된 마이그레이션은 손대지
말고 새 파일을 더한다.**

---

관련 문서: [OTA vs 스토어 빌드](../docs/OTA_UPDATES.md) ·
[릴리스·서명·업로드](../docs/ANDROID_RELEASE.md)
