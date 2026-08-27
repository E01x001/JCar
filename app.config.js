/**
 * Expo 앱 설정 (RN CLI android/ios 폴더를 대체).
 *
 * android/ ios/ 는 `npx expo prebuild`가 이 파일로부터 생성한다(CNG).
 * 따라서 네이티브 폴더를 직접 수정하지 말 것 — prebuild 시 덮어써진다.
 * 네이티브 변경이 필요하면 config plugin이나 아래 설정으로 표현한다.
 *
 * 릴리즈 서명 키스토어는 .native-secrets/ 에 보관하며 EAS Build에 등록해 쓴다.
 */

const IS_DEV = process.env.APP_VARIANT === 'development';

// OTA 업데이트 채널. **네이티브 바이너리에 박히므로 빌드 시점에 정해진다** —
// 나중에 OTA로는 못 바꾼다. 그래서 빌드 스크립트(scripts/build-release.mjs)가
// 명시적으로 넘기게 하고, 빌드 후 AndroidManifest에 제대로 들어갔는지 검증한다.
//
// 기본값이 production인 이유: 실수로 채널이 빠졌을 때
//   운영 빌드에 preview가 박히면 → 실사용자가 검증 안 된 업데이트를 받는다 (위험)
//   내부 빌드에 production이 박히면 → 테스터가 운영 업데이트를 받는다 (불편)
// 둘 중 덜 위험한 쪽으로 기운다.
const UPDATE_CHANNEL = process.env.EXPO_UPDATE_CHANNEL || 'production';

export default {
  expo: {
    name: 'J-Car',
    slug: 'jcar',
    version: '1.0.18',
    orientation: 'portrait',
    icon: './src/assets/icon.png',
    userInterfaceStyle: 'light',
    // 딥링크 스킴 — 이메일 인증/비밀번호 재설정 후 앱으로 복귀하는 경로
    scheme: 'jcar',
    newArchEnabled: true,

    // ── OTA 업데이트 (EAS Update) ──────────────────────────────────────
    // JS/에셋 변경은 스토어 심사 없이 내보낸다. 네이티브가 바뀌면(모듈 추가,
    // 권한, app.config의 네이티브 필드) OTA로 못 보내고 스토어 빌드가 필요하다.
    //
    // runtimeVersion — 업데이트가 어떤 빌드에 배달될지 정하는 값.
    // 빌드에 박힌 값과 `eas update` 때 계산된 값이 **정확히 같아야** 배달된다.
    //
    // 'fingerprint' 정책을 먼저 썼다가 접었다. 지문은 app.config가 해석된 결과에
    // 의존하는데, 우리는 채널을 환경변수로 주입하므로 같은 코드에서도
    // 채널에 따라 지문이 갈렸다(preview c1d8ba… / production df877b…).
    // 게다가 빌드 시점 지문(e4d38f3f…)을 나중에 재현할 수 없었고,
    // EXPO_UPDATES_FINGERPRINT_OVERRIDE는 eas update에서 무시된다.
    // 자동 계산이 어긋나면 **오류 없이 업데이트가 안 오는** 형태로 나타나므로,
    // 눈에 보이고 손으로 통제되는 값이 낫다.
    //
    // 규칙: 네이티브가 바뀌면(모듈 추가·권한·plugins·SDK) 이 값을 올린다.
    //       올리지 않으면 새 JS가 옛 네이티브 바이너리로 배달될 수 있다.
    //       docs/OTA_UPDATES.md 참고.
    runtimeVersion: '2',

    updates: {
      url: 'https://u.expo.dev/de9da75a-473d-4d05-9108-42a36bc8221d',
      // EAS Build가 아니라 로컬 gradle로 빌드하므로 채널이 자동으로 안 박힌다.
      // 이 헤더가 없으면 업데이트를 받아올 채널을 몰라 **조용히 아무것도 안 온다.**
      requestHeaders: { 'expo-channel-name': UPDATE_CHANNEL },
      // 앱 시작 시 확인하되, 받아오는 동안 기다리지 않는다(최대 5초).
      // 실패해도 기존 번들로 그냥 뜬다 — 업데이트 때문에 앱이 안 켜지면 안 된다.
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 5000,
    },

    splash: {
      image: './src/assets/logo.png',
      resizeMode: 'contain',
      backgroundColor: '#1A2B5C', // theme.colors.primary.dark
    },

    assetBundlePatterns: ['**/*'],

    android: {
      package: IS_DEV ? 'com.jcarnew.dev' : 'com.jcarnew',
      // 사이드로드(GitHub Releases APK)로 배포된 마지막 빌드가 1.0.1/101이었다.
      // 버전이 뒤로 가지 않도록 그 위에서 이어간다. Play 업로드마다 1씩 올릴 것.
      versionCode: 118,
      googleServicesFile: './google-services.json',
      // 의존성이 끌고 온 미사용 권한 — Play 심사에서 용도 소명을 요구하므로 제거한다.
      // 앱에 오디오 녹음도, 다른 앱 위에 그리는 오버레이도 없다(화면 내 모달만 쓴다).
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.SYSTEM_ALERT_WINDOW',
        // Firebase Analytics가 끌고 오는 광고 관련 권한. 광고를 쓰지 않으므로 전부 제거한다 —
        // 남겨두면 Play 데이터 보안 양식에 광고 ID 수집을 선언해야 한다.
        // 이벤트 로깅(analytics().logEvent)은 이것들 없이도 동작한다.
        'com.google.android.gms.permission.AD_ID',        // Play 데이터 보안 판정 기준
        'android.permission.ACCESS_ADSERVICES_AD_ID',      // Privacy Sandbox — 별개 권한
        'android.permission.ACCESS_ADSERVICES_ATTRIBUTION',
      ],
      adaptiveIcon: {
        // 전경은 icon.png와 **다른 파일**이어야 한다.
        // 어댑티브 아이콘은 108dp 캔버스 중 가운데 72dp만 보이고 안전영역은 66dp다.
        // 꽉 찬 이미지를 전경으로 주면 108dp에 그린 뒤 72dp로 잘려 로고가 ~1.5배 커 보인다.
        // adaptive-icon.png는 icon.png를 66.7%로 축소해 투명 여백을 둔 것으로,
        // Expo 이전 전(RN CLI)의 ic_launcher_adaptive_fore.png와 같은 비율이다.
        foregroundImage: './src/assets/adaptive-icon.png',
        // icon.png의 실제 배경색. 이전 값 #1A2B5C는 아이콘 색과 달라
        // 전경에 투명 여백이 생기는 순간 이음매로 드러난다.
        backgroundColor: '#194399',
      },
      permissions: [
        'android.permission.POST_NOTIFICATIONS', // FCM (Android 13+)
        'android.permission.CAMERA',
        'android.permission.READ_MEDIA_IMAGES',
      ],
    },

    ios: {
      bundleIdentifier: 'com.jcarnew',
      supportsTablet: false,
      infoPlist: {
        NSCameraUsageDescription: '차량 사진을 촬영하기 위해 카메라를 사용합니다.',
        NSPhotoLibraryUsageDescription: '차량 사진을 선택하기 위해 사진 보관함에 접근합니다.',
      },
    },

    // Vercel 배포 대상.
    // output: 'static'(정적 사전렌더)은 expo-router 전용이라 react-navigation을
    // 쓰는 이 앱에서는 'single'(SPA)이 맞다.
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './src/assets/icon.png',
    },

    plugins: [
      // Pretendard 번들 — 기존 react-native.config.js의 에셋 링크를 대체
      [
        'expo-font',
        {
          fonts: [
            './src/assets/fonts/Pretendard-Regular.ttf',
            './src/assets/fonts/Pretendard-Medium.ttf',
            './src/assets/fonts/Pretendard-SemiBold.ttf',
            './src/assets/fonts/Pretendard-Bold.ttf',
            './src/assets/fonts/Pretendard-ExtraBold.ttf',
          ],
        },
      ],
      'expo-splash-screen',
      [
        'expo-image-picker',
        {
          photosPermission: '차량 사진을 선택하기 위해 사진 보관함에 접근합니다.',
          cameraPermission: '차량 사진을 촬영하기 위해 카메라를 사용합니다.',
        },
      ],
      // FCM·Crashlytics·Analytics는 Firebase 유지(하이브리드) — config plugin으로 네이티브 배선
      '@react-native-firebase/app',
      '@react-native-firebase/messaging',
      '@react-native-firebase/crashlytics',
      '@react-native-firebase/analytics',
      '@react-native-google-signin/google-signin',
      // release 서명 — prebuild가 build.gradle을 덮어써도 유지되도록 플러그인으로 배선
      './plugins/withReleaseSigning',
      // RNFirebase는 iOS에서 use_frameworks(static)를 요구한다
      [
        'expo-build-properties',
        {
          ios: { useFrameworks: 'static' },
        },
      ],
    ],

    extra: {
      eas: {
        projectId: 'de9da75a-473d-4d05-9108-42a36bc8221d',
      },
    },
  },
};
