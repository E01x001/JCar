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

### 광고 ID 주의
Firebase Analytics가 `ACCESS_ADSERVICES_AD_ID`를 끌고 온다. 이게 있으면
Play Console **데이터 보안** 양식에서 광고 ID 수집을 선언해야 하고,
선언과 실제가 다르면 심사에서 반려된다. 선택지는 둘이다:

- Analytics를 쓰되 광고 ID 수집을 정직하게 선언한다
- 광고 ID가 필요 없다면 `blockedPermissions`에
  `com.google.android.gms.permission.AD_ID`를 추가해 제거한다

현재는 제거하지 않은 상태다 — 결정 후 반영할 것.

## Play Console 내부 테스트 업로드

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
