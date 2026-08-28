#!/usr/bin/env node
/**
 * 네이티브 변경 감지 — OTA로 보내면 안 되는 변경을 발행 전에 막는다.
 *
 * 왜 필요한가:
 *   runtimeVersion을 명시값으로 두면 배달은 결정적이지만, "네이티브가 바뀌었으니
 *   런타임을 올려야 한다"가 사람이 기억해야 하는 규칙이 된다. 잊으면 없는 네이티브
 *   모듈을 호출하는 JS가 OTA로 배달되고, 스토어 심사도 없어서 전 기기가 죽는다.
 *   그 규칙을 자동으로 강제한다.
 *
 * 어떻게:
 *   빌드할 때 네이티브 입력의 지문을 native-fingerprint.json에 기록한다(record).
 *   발행 전에 다시 계산해서 다르면 멈춘다(check).
 *
 * android/ 를 지문에서 제외하는 이유:
 *   CNG 프로젝트라 android/ 는 app.config + node_modules에서 **생성되는 결과물**이지
 *   입력이 아니다. 게다가 거기엔 채널이 박혀 있어서, 채널만 바꿔 빌드해도
 *   네이티브가 바뀐 것처럼 보이는 오탐이 난다.
 *
 * 채널 환경변수를 지우고 계산하는 이유:
 *   app.config가 EXPO_UPDATE_CHANNEL을 읽으므로 채널에 따라 해석 결과가 갈린다.
 *   기록할 때와 검사할 때 조건이 같아야 하므로 항상 지운 상태로 계산한다.
 *
 * 사용:
 *   node scripts/native-drift.mjs record   # 빌드가 끝난 뒤 (build-release.mjs가 호출)
 *   node scripts/native-drift.mjs check    # eas update 전 (npm run update:* 가 호출)
 */
import { createFingerprintAsync, SourceSkips } from '@expo/fingerprint';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RECORD = resolve(ROOT, 'native-fingerprint.json');

const die = (message) => {
  console.error(`\n${message}\n`);
  process.exit(1);
};

/** app.config.js에서 runtimeVersion을 읽는다 — 기록과 함께 남겨 비교 근거를 만든다 */
const readRuntimeVersion = () => {
  const src = readFileSync(resolve(ROOT, 'app.config.js'), 'utf8');
  const m = /runtimeVersion:\s*'([^']+)'/.exec(src);
  if (!m) {
    die('app.config.js에서 runtimeVersion을 찾지 못했습니다. 명시적인 문자열이어야 합니다.');
  }
  return m[1];
};

const fingerprint = async () => {
  // 채널이 지문에 섞이지 않게 지운 상태로 계산한다
  delete process.env.EXPO_UPDATE_CHANNEL;

  const fp = await createFingerprintAsync(ROOT, {
    platforms: ['android'],
    // android/ 는 생성물이라 입력에서 뺀다(위 주석 참고).
    // 디렉터리 소스 자체를 지우려면 'android'와 'android/**' 둘 다 필요하다.
    ignorePaths: ['android', 'android/**'],
    sourceSkips:
      // npm scripts는 기본 지문 소스지만, 여기서는 잡음이다. postinstall 같은
      // 훅이 네이티브에 영향을 줄 수 있어 Expo가 포함하는 것인데, 우리는
      // 릴리스 명령을 스크립트로 관리하므로 명령을 고칠 때마다 오탐이 난다.
      // 오탐이 반복되면 경고를 무시하게 되고, 그러면 가드가 없는 것만 못하다.
      SourceSkips.PackageJsonScriptsAll
      // 런타임 버전은 별도로 비교한다(기록에 함께 남긴다).
      // 여기 포함하면 "런타임을 올렸다"와 "네이티브가 바뀌었다"가 한 신호로
      // 뭉개져서, 무엇 때문에 막혔는지 알 수 없게 된다.
      | SourceSkips.ExpoConfigRuntimeVersionIfString
      // version/versionCode는 스토어 빌드마다 바뀌지만 네이티브 코드가 아니다.
      | SourceSkips.ExpoConfigVersions,
  });
  return fp.hash;
};

const mode = process.argv[2];

if (mode === 'record') {
  const hash = await fingerprint();
  const runtimeVersion = readRuntimeVersion();
  writeFileSync(
    RECORD,
    `${JSON.stringify({ runtimeVersion, hash, recordedAt: new Date().toISOString() }, null, 2)}\n`,
  );
  console.log(`네이티브 지문 기록 — 런타임 ${runtimeVersion} · ${hash.slice(0, 12)}…`);
  process.exit(0);
}

if (mode === 'check') {
  if (!existsSync(RECORD)) {
    die(
      '네이티브 지문 기록이 없습니다.\n' +
      '  릴리스 빌드를 한 번 하면 만들어집니다: npm run build:preview',
    );
  }

  const record = JSON.parse(readFileSync(RECORD, 'utf8'));
  const runtimeVersion = readRuntimeVersion();
  const hash = await fingerprint();

  if (hash === record.hash && runtimeVersion === record.runtimeVersion) {
    console.log(`네이티브 변경 없음 — 런타임 ${runtimeVersion}. OTA로 보낼 수 있습니다.`);
    process.exit(0);
  }

  if (runtimeVersion !== record.runtimeVersion) {
    die(
      `런타임이 기록과 다릅니다 (기록 ${record.runtimeVersion} → 현재 ${runtimeVersion}).\n` +
      '런타임을 올렸다면 **새로 빌드해서 스토어에 올린 뒤** 발행해야 합니다.\n' +
      '지금 발행하면 그 런타임을 쓰는 빌드가 아직 없어 아무에게도 배달되지 않습니다.\n' +
      '  npm run build:preview  →  node scripts/publish-internal.mjs',
    );
  }

  die(
    '네이티브 입력이 바뀌었습니다. 이 변경은 OTA로 보낼 수 없습니다.\n' +
    `  기록 ${record.hash.slice(0, 12)}… (런타임 ${record.runtimeVersion}, ${record.recordedAt})\n` +
    `  현재 ${hash.slice(0, 12)}…\n\n` +
    '무엇이 바뀌었는지: npx @expo/fingerprint fingerprint:diff\n\n' +
    '네이티브가 정말 바뀌었다면 app.config.js의 runtimeVersion을 올리고 새로 빌드하세요.\n' +
    '그대로 발행하면 없는 네이티브를 호출하는 JS가 기존 설치본에 배달됩니다.',
  );
}

die(
  '사용법: node scripts/native-drift.mjs record | check\n' +
  '  record  빌드 후 네이티브 지문을 기록한다\n' +
  '  check   발행 전 변경 여부를 확인한다',
);
