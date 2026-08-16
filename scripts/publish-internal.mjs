/**
 * 내부 테스트 트랙에 AAB 업로드 (Google Play Developer API).
 *
 * 의존성 없이 Node 내장 crypto/fetch만 쓴다. 서비스 계정 JSON으로 RS256 JWT를
 * 서명해 액세스 토큰을 받고, edits 트랜잭션으로 업로드한다.
 *
 *   edits.insert → bundles.upload → tracks.update(internal) → edits.commit
 *
 * commit 전까지는 아무것도 반영되지 않는다. 중간에 실패하면 edit이 버려질 뿐이라
 * 트랙 상태는 그대로 남는다.
 *
 * 사용법:
 *   node scripts/publish-internal.mjs [--notes "출시 노트"] [--aab <경로>] [--dry-run]
 *
 * 이 서비스 계정에는 '테스트 트랙 출시' 권한만 부여돼 있다 — 프로덕션 게시는 불가능하다.
 */
import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const KEY_FILE = 'play-service-account.json';
const PACKAGE = 'com.jcarnew';
const TRACK = 'internal';
const DEFAULT_AAB = 'android/app/build/outputs/bundle/release/app-release.aab';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const dryRun = args.includes('--dry-run');
const aabPath = flag('aab', DEFAULT_AAB);
const notes = flag('notes', '내부 테스트 빌드');

const die = (msg) => {
  console.error(`\n실패: ${msg}\n`);
  process.exit(1);
};

/** 서비스 계정 JSON → OAuth2 액세스 토큰 */
const getAccessToken = async (key) => {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const b64 = (o) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claim)}`;
  const sig = createSign('RSA-SHA256')
    .update(unsigned)
    .sign(key.private_key, 'base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${sig}`,
    }),
  });
  const json = await res.json();
  if (!res.ok) { die(`토큰 발급 실패 (${res.status}): ${JSON.stringify(json)}`); }
  return json.access_token;
};

const call = async (token, path, { method = 'GET', body, headers = {} } = {}) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body && !headers['Content-Type'] ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body && !Buffer.isBuffer(body) ? JSON.stringify(body) : body,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = json?.error?.message ?? text;
    die(`${method} ${path} → ${res.status}\n${msg}`);
  }
  return json;
};

const main = async () => {
  const key = JSON.parse(await readFile(KEY_FILE, 'utf8')).valueOf();
  const aab = await readFile(aabPath).catch(() =>
    die(`AAB를 찾을 수 없습니다: ${aabPath}\n먼저 'cd android && ./gradlew bundleRelease'를 실행하세요.`)
  );

  console.log(`패키지 : ${PACKAGE}`);
  console.log(`트랙   : ${TRACK}`);
  console.log(`AAB    : ${basename(aabPath)} (${(aab.length / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`계정   : ${key.client_email}`);
  console.log(`노트   : ${notes}`);

  const token = await getAccessToken(key);
  console.log('\n토큰 발급 완료');

  const edit = await call(token, `/applications/${PACKAGE}/edits`, { method: 'POST' });
  console.log(`edit 생성: ${edit.id}`);

  if (dryRun) {
    await call(token, `/applications/${PACKAGE}/edits/${edit.id}`, { method: 'DELETE' });
    console.log('dry-run — edit을 삭제하고 종료합니다. 업로드하지 않았습니다.');
    return;
  }

  console.log('AAB 업로드 중...');
  const uploadRes = await fetch(
    `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE}/edits/${edit.id}/bundles?uploadType=media`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: aab,
    }
  );
  const uploaded = await uploadRes.json();
  if (!uploadRes.ok) {
    die(`업로드 실패 (${uploadRes.status})\n${uploaded?.error?.message ?? JSON.stringify(uploaded)}`);
  }
  const versionCode = uploaded.versionCode;
  console.log(`업로드 완료 — versionCode ${versionCode}`);

  await call(token, `/applications/${PACKAGE}/edits/${edit.id}/tracks/${TRACK}`, {
    method: 'PUT',
    body: {
      track: TRACK,
      releases: [
        {
          status: 'completed',
          versionCodes: [String(versionCode)],
          releaseNotes: [{ language: 'ko-KR', text: notes }],
        },
      ],
    },
  });
  console.log(`${TRACK} 트랙에 배정 완료`);

  await call(token, `/applications/${PACKAGE}/edits/${edit.id}:commit`, { method: 'POST' });
  console.log(`\ncommit 완료 — versionCode ${versionCode}가 ${TRACK} 트랙에 출시되었습니다.`);
};

main().catch((e) => die(e.stack ?? String(e)));
