# OTA 업데이트 (EAS Update)

JS·에셋 변경을 스토어 심사 없이 내보낸다. 형제 프로젝트 Taxitogether와 같은
구성이되, **빌드 방식이 달라 한 곳이 다르다**(아래 "채널이 박히는 자리").

- EAS 프로젝트: `@e01_68/jcar` · `de9da75a-473d-4d05-9108-42a36bc8221d`
- 업데이트 URL: `https://u.expo.dev/de9da75a-473d-4d05-9108-42a36bc8221d`

---

## 무엇이 OTA로 가고 무엇이 안 가는가

**이 구분을 틀리면 조용히 실패한다.** 네이티브가 바뀐 코드를 OTA로 보내면
업데이트가 적용되지 않거나(런타임 불일치) 적용된 뒤 죽는다.

| 바뀐 것 | 배포 |
|---|---|
| 화면·컴포넌트·훅·서비스 로직 | **OTA** |
| 문구, 스타일, 이미지 에셋 | **OTA** |
| Supabase 쿼리·RPC 호출부 | **OTA** |
| 새 npm 패키지 (네이티브 코드 없음) | **OTA** |
| 새 npm 패키지 (네이티브 모듈 포함) | 스토어 빌드 |
| `app.config.js`의 네이티브 필드 (권한·아이콘·스킴·plugins) | 스토어 빌드 |
| `version` / `versionCode` | 스토어 빌드 |
| Expo SDK 업그레이드 | 스토어 빌드 |

판단이 애매하면 `npx expo prebuild --platform android` 후 `android/`에
변경이 생기는지 본다. 생기면 스토어 빌드다.

> **네이티브가 바뀌면 `app.config.js`의 `runtimeVersion`을 올려야 한다.**
> 올리지 않으면 새 JS가 옛 네이티브 바이너리로 배달되어 죽는다.
> 아래 "런타임 버전" 참고.

---

## 런타임 버전

업데이트가 **어떤 빌드에 배달될지** 정하는 값. 빌드에 박힌 값과 `eas update`
때 계산된 값이 정확히 같아야 배달된다.

```js
runtimeVersion: '2',
```

### `fingerprint` 정책을 쓰지 않는 이유

처음엔 Taxitogether와 같이 `{ policy: 'fingerprint' }`로 했다가 접었다.
지문은 **app.config가 해석된 결과**를 입력으로 삼는데, JCar은 채널을
환경변수로 주입하므로 같은 코드에서도 채널에 따라 지문이 갈렸다:

```
EXPO_UPDATE_CHANNEL=preview   → c1d8ba…
env 없음(production으로 해석)  → df877b…
빌드(117)에 박힌 값            → e4d38f3f…   ← 어느 조합으로도 재현 불가
```

`EXPO_UPDATES_FINGERPRINT_OVERRIDE`는 빌드 시점에만 먹고 `eas update`에서는
무시된다. 즉 한 번 어긋나면 그 빌드에는 **영영 업데이트를 보낼 수 없다.**

자동 계산이 어긋나면 "오류 없이 아무것도 안 오는" 형태로 나타난다.
눈에 보이고 손으로 통제되는 값이 낫다.

### 언제 올리는가

네이티브가 바뀔 때 — 위 표에서 "스토어 빌드" 칸에 해당하는 변경.
숫자를 올린 뒤 새로 빌드해서 올리면, 그때부터 그 런타임을 쓰는 빌드에만
업데이트가 간다. **옛 런타임 빌드는 더 이상 업데이트를 받지 못한다.**

`scripts/build-release.mjs`가 빌드 전에 `strings.xml`을 읽어 런타임을 확인하고,
`file:`로 시작하면(자동 계산 방식) 멈춘다.

---

## 채널이 박히는 자리 (Taxitogether와 다른 점)

Taxitogether는 **EAS Build**로 빌드해서 `eas.json` 프로필의 `channel`이 빌드
서버에서 자동으로 주입된다. 그래서 `app.config.js`에 채널이 없다.

JCar은 **로컬 gradle**로 빌드한다. 채널이 자동으로 안 들어가므로
`app.config.js`가 직접 넣는다:

```js
const UPDATE_CHANNEL = process.env.EXPO_UPDATE_CHANNEL || 'production';
updates: { requestHeaders: { 'expo-channel-name': UPDATE_CHANNEL } }
```

**채널은 prebuild 때 AndroidManifest.xml에 박히고, 그 뒤로 OTA로는 못 바꾼다.**
채널을 바꾸려면 다시 빌드해서 스토어에 올려야 한다.

기본값이 `production`인 이유 — 채널을 빠뜨렸을 때
운영 빌드에 `preview`가 박히면 실사용자가 검증 안 된 업데이트를 받고(위험),
내부 빌드에 `production`이 박히면 테스터가 운영 업데이트를 받는다(불편).
덜 위험한 쪽으로 기울였다.

---

## 채널 구성

| 채널 | Play 트랙 | 받는 브랜치 |
|---|---|---|
| `preview` | 내부 테스트 | `preview` |
| `production` | 운영 | `production` |

트랙마다 채널이 다르므로 **Play의 "승격(promote)"을 쓸 수 없다.** 승격하면
내부 테스트 AAB에 박힌 `preview` 채널이 그대로 운영으로 넘어간다.
운영 배포는 `--channel production`으로 **따로 빌드**해야 한다.

---

## 배포 절차

### JS만 바뀐 경우 — OTA

```bash
npm test && npm run lint          # 게이트를 건너뛰지 않는다. 심사가 없다는 뜻은
                                  # 잘못 나가도 막아줄 사람이 없다는 뜻이다.
npm run update:preview            # 내부 테스터에게 먼저
# 기기에서 확인한 뒤
npm run update:production         # 운영으로
```

`version`/`versionCode`는 **올리지 않는다.** 올리면 스토어 버전과 어긋난다.

### 네이티브가 바뀐 경우 — 스토어 빌드

```bash
# app.config.js에서 version / versionCode 올린 뒤
npm run build:preview                                   # 채널 검증 + AAB 빌드
node scripts/publish-internal.mjs --notes "..."         # 내부 테스트 업로드
```

`build-release.mjs`는 빌드 전에 AndroidManifest를 직접 읽어 **채널·updates 활성·URL이
의도대로 박혔는지 확인하고, 어긋나면 멈춘다.** 잘못된 AAB를 올린 뒤 알게 되면
되돌리는 데 릴리스가 한 번 더 든다.

---

## 롤백

```bash
eas update:list --branch production        # 이전 업데이트 확인
eas update:republish --group <GROUP_ID>    # 그 버전을 다시 내보낸다
```

`update:republish`가 실질적인 롤백이다. 이미 받은 기기는 다음 실행 때 되돌아간다.
**앱을 켜 봐야 적용되므로 즉시 전원 회수는 불가능하다** — OTA의 한계다.
심각하면 롤백 + 스토어 빌드를 함께 준비한다.

---

## 동작 방식

`checkAutomatically: 'ON_LOAD'` · `fallbackToCacheTimeout: 5000`

앱 시작 시 업데이트를 확인하되 최대 5초만 기다린다. 그 안에 못 받으면 기존
번들로 그냥 뜨고, 받은 업데이트는 **다음 실행부터** 적용된다.
업데이트 때문에 앱이 안 켜지는 상황을 만들지 않는다.

즉 사용자는 보통 **앱을 두 번 켜야** 새 버전을 본다. 급하면 앱 안에서
`Updates.fetchUpdateAsync()` → `reloadAsync()`로 즉시 적용할 수 있지만,
현재는 붙이지 않았다.

---

## 확인

```bash
eas channel:list                    # 채널과 연결된 브랜치
eas update:list --branch preview    # 내보낸 업데이트
```

기기에서 실제로 받는지는 반드시 한 번 확인한다. 설정이 맞아 보여도 채널이나
런타임 지문이 어긋나면 **오류 없이 아무것도 오지 않는다.**
