#!/usr/bin/env node
/**
 * 릴리스 AAB 빌드 — OTA 채널을 명시적으로 박고, 박혔는지 검증한다.
 *
 * 왜 스크립트가 필요한가:
 *   OTA 채널은 prebuild 시점에 AndroidManifest.xml로 들어가고, 그 뒤로는
 *   **OTA로 바꿀 수 없다.** 채널이 틀린 AAB를 올리면 업데이트가 엉뚱한 쪽으로
 *   가거나 아무것도 안 오는데, 둘 다 조용히 실패해서 알아채기 어렵다.
 *   그래서 채널을 인자로 강제하고, 빌드 후 매니페스트를 직접 읽어 확인한다.
 *
 * 사용:
 *   node scripts/build-release.mjs --channel preview      # 내부 테스트용
 *   node scripts/build-release.mjs --channel production   # 운영 배포용
 *   node scripts/build-release.mjs --channel preview --skip-prebuild
 *
 * 빌드만 한다. 업로드는 scripts/publish-internal.mjs가 맡는다.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = resolve(ROOT, 'android/app/src/main/AndroidManifest.xml');
const AAB = resolve(ROOT, 'android/app/build/outputs/bundle/release/app-release.aab');

const VALID_CHANNELS = ['preview', 'production'];

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : process.argv[i + 1];
};
const flag = (name) => process.argv.includes(`--${name}`);

const die = (message) => {
  console.error(`\n오류: ${message}\n`);
  process.exit(1);
};

const run = (cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) { die(`${cmd} 실패 (exit ${r.status})`); }
};

const channel = arg('channel');
if (!VALID_CHANNELS.includes(channel)) {
  die(
    `--channel 을 지정하세요: ${VALID_CHANNELS.join(' | ')}\n` +
    '  preview    내부 테스트 트랙용. eas update --branch preview 를 받는다.\n' +
    '  production 운영 트랙용. eas update --branch production 을 받는다.\n\n' +
    '기본값을 두지 않는 이유: 채널은 바이너리에 박혀 OTA로 못 바꾼다.',
  );
}

console.log(`\n채널: ${channel}\n`);

if (!flag('skip-prebuild')) {
  console.log('prebuild — 네이티브 프로젝트를 app.config.js로부터 다시 만든다');
  run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install'], {
    EXPO_UPDATE_CHANNEL: channel,
  });
}

// prebuild 결과를 믿지 않고 직접 읽는다. 채널이 어긋나면 여기서 멈춘다 —
// 잘못된 AAB를 올린 뒤에 알게 되면 되돌리는 데 릴리스가 한 번 더 든다.
if (!existsSync(MANIFEST)) { die('AndroidManifest.xml 을 찾을 수 없습니다. prebuild가 실패했습니다.'); }
const manifest = readFileSync(MANIFEST, 'utf8');

const headers = /UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY"\s+android:value="([^"]+)"/.exec(manifest);
const enabled = /updates\.ENABLED"\s+android:value="([^"]+)"/.exec(manifest);
const url = /EXPO_UPDATE_URL"\s+android:value="([^"]+)"/.exec(manifest);

if (enabled?.[1] !== 'true') { die('매니페스트에서 expo-updates가 비활성입니다.'); }
if (!url) { die('매니페스트에 EXPO_UPDATE_URL이 없습니다.'); }
if (!headers) { die('매니페스트에 업데이트 채널이 없습니다. EAS Build를 쓰지 않으므로 채널은 app.config.js가 넣어야 합니다.'); }

// android:value 안에서 따옴표는 &quot; 로 이스케이프돼 있다
const baked = /expo-channel-name"?:"?([\w-]+)/.exec(headers[1].replace(/&quot;/g, '"'))?.[1];
if (baked !== channel) {
  die(`매니페스트의 채널이 다릅니다. 요청=${channel} 실제=${baked ?? '(없음)'}`);
}

// 런타임 버전 — 업데이트가 이 빌드에 배달될지 정하는 값.
// strings.xml에 들어가며, eas update 때 계산되는 값과 정확히 같아야 한다.
const STRINGS = resolve(ROOT, 'android/app/src/main/res/values/strings.xml');
const runtime = /name="expo_runtime_version">([^<]+)</.exec(readFileSync(STRINGS, 'utf8'))?.[1];
if (!runtime) { die('strings.xml에 expo_runtime_version이 없습니다.'); }
if (runtime.startsWith('file:')) {
  die(
    `런타임 버전이 자동 계산 방식(${runtime})입니다. app.config.js에서 `
    + 'runtimeVersion을 명시적인 문자열로 두세요 — 자동 계산은 빌드와 '
    + 'eas update 사이에서 값이 갈려 업데이트가 조용히 배달되지 않았습니다.',
  );
}

console.log(`\n확인 — 채널 ${baked} · 런타임 ${runtime} · updates 활성 · ${url[1]}\n`);
// 래퍼는 android/ 안에 있다. cwd가 프로젝트 루트라 경로를 붙여야 한다 —
// 이름만 주면 윈도우에서 "실행할 수 있는 프로그램이 아닙니다"로 죽는다.
const gradlew = resolve(ROOT, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
// gradle에도 같은 채널을 넘긴다. prebuild에만 주면 빌드 중 app.config를
// 다시 해석하는 단계에서 값이 갈린다.
run(`"${gradlew}"`, ['-p', 'android', 'bundleRelease'], { EXPO_UPDATE_CHANNEL: channel });

if (!existsSync(AAB)) { die('AAB가 생성되지 않았습니다.'); }
const mb = (readFileSync(AAB).length / 1024 / 1024).toFixed(1);
console.log(`\n완료 — ${AAB} (${mb} MB, 채널 ${channel}, 런타임 ${runtime})`);
// 이 빌드가 담고 있는 네이티브 상태를 기록한다. 이후 OTA 발행 전에
// 이 값과 비교해, 네이티브가 바뀌었는데 런타임을 안 올린 경우를 막는다.
run('node', ['scripts/native-drift.mjs', 'record']);

console.log('업로드: node scripts/publish-internal.mjs --notes "..."\n');
