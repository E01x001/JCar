/**
 * release 서명 배선 (config plugin).
 *
 * CNG에서 android/는 생성물이라 expo prebuild가 build.gradle을 기본 템플릿으로
 * 되돌린다. 기본 템플릿의 release 빌드는 **debug 키스토어로 서명**하므로,
 * 그대로 두면 Play Console이 거부하고 기존 앱과 서명 키도 달라진다.
 * 그래서 서명 설정을 android/ 안이 아니라 이 플러그인에 둔다.
 *
 * 키스토어와 비밀번호는 저장소에 없다(.native-secrets/, gitignore 대상).
 * 파일이 없으면 release도 debug 서명으로 조용히 물러난다 — 키가 없는 환경에서
 * 디버그 빌드나 CI까지 실패하지 않게 하기 위해서다. 대신 Play에 올릴 AAB는
 * 반드시 키가 있는 환경에서 만들어야 한다.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

// rootProject는 android/ 이므로 저장소 루트는 한 단계 위다
const SIGNING_BLOCK = `
        release {
            def secretsDir = rootProject.file('../.native-secrets')
            def propsFile = new File(secretsDir, 'key.properties')
            def storeFileCandidate = new File(secretsDir, 'key.jks')
            if (propsFile.exists() && storeFileCandidate.exists()) {
                def props = new Properties()
                propsFile.withInputStream { props.load(it) }
                storeFile storeFileCandidate
                storePassword props['storePassword']
                keyAlias props['keyAlias']
                keyPassword props['keyPassword']
            }
        }
`;

const withReleaseSigning = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;

    if (gradle.includes('.native-secrets')) {
      return cfg; // 이미 적용됨 (prebuild 재실행 등)
    }

    // 1) signingConfigs에 release 추가 — debug 블록 바로 뒤에 끼운다
    const anchor = `            keyPassword 'android'
        }
`;
    if (!gradle.includes(anchor)) {
      throw new Error(
        'withReleaseSigning: signingConfigs.debug 블록을 찾지 못했습니다. ' +
          'Expo 템플릿이 바뀌었을 수 있으니 plugins/withReleaseSigning.js를 갱신하세요.'
      );
    }
    gradle = gradle.replace(anchor, anchor + SIGNING_BLOCK);

    // 2) release 빌드타입이 release 서명을 쓰도록 — 키가 없으면 storeFile이
    //    비어 있어 Gradle이 서명을 건너뛰므로 debug로 명시적 폴백을 둔다
    const buildTypeAnchor = `        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;
    if (!gradle.includes(buildTypeAnchor)) {
      throw new Error(
        'withReleaseSigning: release buildType을 찾지 못했습니다. ' +
          'plugins/withReleaseSigning.js를 갱신하세요.'
      );
    }
    gradle = gradle.replace(
      buildTypeAnchor,
      `        release {
            signingConfig signingConfigs.release.storeFile != null
                ? signingConfigs.release
                : signingConfigs.debug`
    );

    cfg.modResults.contents = gradle;
    return cfg;
  });

module.exports = withReleaseSigning;
