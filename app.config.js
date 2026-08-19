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

export default {
  expo: {
    name: 'J-Car',
    slug: 'jcar',
    version: '1.0.3',
    orientation: 'portrait',
    icon: './src/assets/icon.png',
    userInterfaceStyle: 'light',
    // 딥링크 스킴 — 이메일 인증/비밀번호 재설정 후 앱으로 복귀하는 경로
    scheme: 'jcar',
    newArchEnabled: true,

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
      versionCode: 103,
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
        foregroundImage: './src/assets/icon.png',
        backgroundColor: '#1A2B5C',
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
        // eas init 실행 시 프로젝트 ID가 채워진다
      },
    },
  },
};
