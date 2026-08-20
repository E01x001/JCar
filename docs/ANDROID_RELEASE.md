# 안드로이드 릴리스 빌드 · Play Console 내부 테스트

> Expo(CNG) 기준. `android/`는 생성물이므로 여기 적힌 설정은 전부
> `app.config.js`와 `plugins/`에서 관리한다. `android/`를 직접 고치면 다음
> `expo prebuild`에서 사라진다.

## 빌드

```bash
npx expo prebuild --platform android   # app.config.js → android/ 재생성
cd android && ./gradlew bundleRelease  # → app/build/outputs/bundle/release/app-release.aab
```

APK가 필요하면 `./gradlew assembleRelease`. Play 업로드는 **AAB**를 쓴다.

## 서명

릴리스 서명은 `plugins/withReleaseSigning.js`가 배선한다.
키와 비밀번호는 저장소에 없다:

```
.native-secrets/key.jks          # 릴리스 키스토어
.native-secrets/key.properties   # storePassword / keyPassword / keyAlias
```

둘 다 gitignore 대상이다. **이 파일을 잃어버리면 기존 앱을 업데이트할 수 없다** —
Play는 같은 키로 서명된 빌드만 업데이트로 받는다. 별도 백업 필수.

키가 없는 환경에서는 release도 debug 키로 서명되게 폴백해 뒀다(빌드는 통과).
그러므로 **업로드 전에 서명 주체를 반드시 확인한다**:

```bash
unzip -p android/app/build/outputs/bundle/release/app-release.aab 'META-INF/*.RSA' \
  | openssl pkcs7 -inform DER -print_certs -noout | head -2
```

`O=JcarPlatform, CN=Jinyong, Jeong`이 나와야 한다.
`CN=Android Debug`가 나오면 debug 키로 서명된 것이니 업로드하면 안 된다.

## 버전 관리

`app.config.js`의 `android.versionCode`를 **업로드할 때마다 1씩 올린다.**
Play는 같은 versionCode를 두 번 받지 않는다. `versionName`은 사용자에게 보이는
표시용이라 의미 있는 변화가 있을 때만 올리면 된다.

## 권한

앱이 요청하는 권한은 최종 병합 매니페스트 기준으로 확인한다:

```bash
grep uses-permission android/app/build/intermediates/merged_manifests/release/**/AndroidManifest.xml
```

의존성이 끌고 온 미사용 권한은 `app.config.js`의 `android.blockedPermissions`로
제거한다. 현재 제거 중인 것: `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`
(오디오 녹음·오버레이를 쓰지 않는데 Play가 용도 소명을 요구하는 권한들).
제거 확인됨 — 최종 병합 매니페스트에 나타나지 않는다.

### 광고 ID — 제거됨
Firebase Analytics가 광고 관련 권한을 끌고 온다. 광고를 쓰지 않으므로 전부 차단했다.
이름이 비슷한 **별개의 권한 두 종류**라 하나만 막으면 나머지가 남는다:

- `com.google.android.gms.permission.AD_ID` — Play 데이터 보안의 광고 ID 판정 기준
- `android.permission.ACCESS_ADSERVICES_AD_ID` / `..._ATTRIBUTION` — Privacy Sandbox 계열

셋 다 `blockedPermissions`에 있고, 최종 병합 매니페스트에서 사라진 것을 확인했다.
따라서 **데이터 보안 양식에서 광고 ID 수집을 "아니오"로 답할 수 있다.**
`analytics().logEvent` 이벤트 로깅은 이 권한들 없이도 정상 동작한다.

매니페스트에 남는 `<uses-library android:name="android.ext.adservices" required="false"/>`는
권한이 아니라 선택적 라이브러리 선언이라 판정에 영향이 없다.

## 자동 업로드 (Play Developer API)

```bash
node scripts/publish-internal.mjs --notes "출시 노트"
node scripts/publish-internal.mjs --dry-run     # 인증·권한만 검증, 업로드 안 함
```

의존성 없이 Node 내장 모듈만 쓴다. 흐름은
`edits.insert → bundles.upload → tracks.update(internal) → edits.commit`이며,
commit 전에는 아무것도 반영되지 않으므로 중간 실패는 트랙에 영향을 주지 않는다.

인증: `play-service-account.json` (gitignore 대상).
서비스 계정 `play-publisher@jcar-3e090.iam.gserviceaccount.com`에는
**Jcar 앱의 테스트 트랙 출시 권한만** 부여돼 있다 — 이 키로 프로덕션 게시는 불가능하다.

versionCode는 업로드 때마다 `app.config.js`에서 올려야 한다. Play는 같은 값을 두 번 받지 않는다.

### Play 앱 서명과 구글 로그인 (중요)

Play App Signing이 켜져 있으면 **사용자가 설치하는 앱은 Google이 다시 서명한다.**
따라서 구글 로그인이 확인하는 지문은 우리 업로드 키가 아니라 **Google의 앱 서명 키**다.

```
앱 서명 키  SHA-1: 0B:BB:62:63:69:2F:BD:46:0C:DD:4C:36:E2:0C:9A:2D:93:B4:69:42
                   (Owner: CN=Android, O=Google Inc.)
업로드 키   SHA-1: 07:DD:37:20:FC:32:3B:5E:BB:7A:31:4B:44:8E:87:82:A4:4E:B3:77
                   (.native-secrets/key.jks — 2026-08-19 재설정 승인)
```

2026-08-20까지 `google-services.json`에는 업로드 키·로컬 키스토어 3종만 있고
**앱 서명 키가 빠져 있었다.** 이 상태로는 로컬 빌드에서는 구글 로그인이 되지만
**Play에서 설치하면 실패한다** — 테스터가 첫 화면에서 막힌다.

Firebase Console → 프로젝트 설정 → Android 앱(com.jcarnew) → SHA 인증서 지문에
앱 서명 키 SHA-1을 추가하고 `google-services.json`을 다시 받아 교체했다.
**앱 서명 키를 바꾸거나 새 앱을 만들면 이 절차를 반드시 다시 밟아야 한다.**

지문은 비밀이 아니다 — 공개 인증서의 해시이며 Play Console에도 그대로 노출된다.

### 업로드 키 이력 (중요)
Play 앱 서명이 켜져 있어 **앱 서명 키는 Google이 보관**한다. 우리가 관리하는 건 업로드 키뿐이다.

2026-08-17 시점에 등록된 업로드 키(SHA-1 `02:4E:35:...`, 2025-05 이전 생성)를
**분실한 상태로 확인**했다. 보유 중인 키스토어 3개(`.native-secrets/key.jks`,
`~/.android/key.jks`, `~/.android/release.keystore`)는 전부 2025-11 생성으로 지문이 다르다.
업로드 시 다음 오류가 난다:

```
The Android App Bundle was signed with the wrong key.
Found: SHA1: 07:DD:37:...  expected: SHA1: 02:4E:35:...
```

→ `.native-secrets/key.jks`(SHA-1 `07:DD:37:...`)를 새 업로드 키로 등록하는
**업로드 키 재설정을 요청**해야 한다. 승인 후에는 위 스크립트가 그대로 동작한다.

## 앱 아이콘 (어댑티브 아이콘 주의)

안드로이드 어댑티브 아이콘은 **108dp 캔버스를 그린 뒤 런처가 가운데 72dp만 잘라서**
보여준다(안전 영역은 66dp). 따라서 `adaptiveIcon.foregroundImage`에는
**여백이 있는 별도 파일**을 줘야 한다.

```js
icon: './src/assets/icon.png',              // 꽉 찬 1080x1080 (일반/웹용)
adaptiveIcon: {
  foregroundImage: './src/assets/adaptive-icon.png',  // 66.7%로 축소 + 투명 여백
  backgroundColor: '#194399',                          // icon.png의 실제 배경색
}
```

두 값을 같은 파일로 두면 로고가 **108/72 = 약 1.5배 확대**돼 보인다.
Expo 이전 직후 실제로 이 상태였다(RN CLI 시절에는 `ic_launcher.png` 192x192와
`ic_launcher_adaptive_fore.png` 432x432가 별도 파일이었다).

전경 파일 생성은 `icon.png`를 66.7%로 축소해 투명 캔버스 가운데 배치하면 된다.
검증: prebuild 후 생성물의 알파 bbox가 캔버스의 약 66.7%인지 확인한다.

```bash
python -c "from PIL import Image; im=Image.open('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.webp').convert('RGBA'); bb=im.getchannel('A').getbbox(); print(bb, im.size)"
# 기대: (72, 72, 360, 360) (432, 432)
```

배경색도 아이콘의 실제 색과 맞춰야 한다. 다르면 전경에 투명 여백이 생기는 순간
이음매로 드러난다.

## Play Console 내부 테스트 업로드 (수동)

1. Play Console → 해당 앱 → 테스트 → **내부 테스트**
2. 새 버전 만들기 → `app-release.aab` 업로드
3. 출시 노트 입력(내부 테스트도 필수)
4. 테스터 목록에 이메일 추가 → 저장 → 검토 → 출시
5. 테스터에게 옵트인 링크 전달. 설치까지 몇 분 걸릴 수 있다

**첫 업로드라면** 앱 서명 방식을 먼저 정해야 한다. Play 앱 서명을 쓰면
업로드 키와 앱 서명 키가 분리되어 키 분실 위험이 줄지만, 한 번 정하면
되돌리기 어렵다.

## 이번 이전(Expo SDK 57)에서 확인된 것 / 안 된 것

**확인됨** — 릴리스 AAB 빌드 성공, 릴리스 키 서명 정상.
컴파일 단계에서 걸러지는 문제(네이티브 모듈 누락, manifest·gradle·proguard 오류)는 없다.

**미확인** — 실기기 런타임. 아래는 네이티브 전용이라 웹 검증으로 담보되지 않으며,
내부 테스트 설치 후 가장 먼저 확인해야 한다:

- FCM 푸시 수신 (포그라운드 / 백그라운드 / 종료 상태)
- 알림 탭 → 딥링크 화면 이동
- 구글 로그인 (네이티브 ID 토큰 교환 경로)
- Crashlytics 리포트 전송
- 이미지 선택·업로드 (expo-image-picker로 교체된 경로)
