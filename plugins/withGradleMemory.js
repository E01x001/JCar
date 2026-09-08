/**
 * Gradle JVM 메모리 (config plugin).
 *
 * CNG에서 android/gradle.properties는 생성물이라 직접 고치면 다음 prebuild에서
 * 사라진다. expo-build-properties에는 이 값을 지정하는 옵션이 없다
 * (android 블록에 minSdkVersion·packagingOptions 등은 있지만 gradle.properties를
 * 건드리는 항목은 없다 — 57.0.17 기준 확인). 그래서 플러그인으로 둔다.
 *
 * 왜 올리는가:
 *   기본값 -Xmx2048m -XX:MaxMetaspaceSize=512m으로 릴리스 빌드가 터졌다.
 *   expo-updates의 KSP(Kotlin 심볼 처리)가 Metaspace를 넘겼고
 *   (`e: [ksp] java.lang.AssertionError: Metaspace`), 그 뒤 데몬이
 *   OutOfMemoryError를 반복하며 종료도 못 한 채 CPU만 4시간 태웠다(2026-09-07).
 *
 *   **실패가 조용하다는 것이 이 문제의 고약한 점이다.** 빌드는 2분 만에
 *   죽었는데 프로세스는 살아 있어서, 오래 걸리는 빌드처럼 보였다.
 *
 * Metaspace가 핵심이다(512m -> 2048m). KSP는 클래스 메타데이터를 많이 적재하고
 * 그건 힙이 아니라 Metaspace에 쌓인다. 힙도 요즘 RN 릴리스 빌드에는 2GB가
 * 빠듯해 4GB로 올린다.
 */
const { withGradleProperties } = require('@expo/config-plugins');

const PROPERTIES = {
  'org.gradle.jvmargs':
    '-Xmx4096m -XX:MaxMetaspaceSize=2048m -XX:+HeapDumpOnOutOfMemoryError',
};

const withGradleMemory = (config) =>
  withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(PROPERTIES)) {
      // 기존 항목이 있으면 덮어쓴다. 없으면 추가한다.
      const existing = cfg.modResults.find(
        (item) => item.type === 'property' && item.key === key,
      );

      if (existing) {
        existing.value = value;
      } else {
        cfg.modResults.push({ type: 'property', key, value });
      }
    }

    return cfg;
  });

module.exports = withGradleMemory;
