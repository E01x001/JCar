#!/usr/bin/env node
/**
 * 옛 Firestore(jcarnew-696b6) 차량을 Supabase로 옮긴다 — 1회성 이식.
 *
 * 기본은 dry-run이다. 읽기 쿼리만 하고, 무엇이 어느 테이블에 몇 건 들어갈지와
 * 검증 결과를 보여준 뒤 실행할 SQL을 파일로 남긴다. --apply를 줘야 실제로 쓴다.
 *
 *   node scripts/import-legacy-vehicles.mjs --data <원본.json> --owner <email>
 *   node scripts/import-legacy-vehicles.mjs --data <원본.json> --owner <email> --apply
 *
 * 원본 파일(콘솔에서 읽어 옮겨 적은 것)에는 차량 소유자명·차량번호·차대번호가
 * 들어 있다. **저장소에 두지 않는다.** 이 스크립트도 화면에 그 값들을 찍지 않는다.
 *
 * 결정 사항 (2026-09-12):
 *   - 소유주는 --owner 계정이다(seller_id = current_owner_id, 관리자 소유 아님).
 *   - 상태는 일반 등록과 같다: approved · listed · 숨김 없음. 실사진이 없어
 *     노출 조건(실사진 1장 이상)을 못 채우므로 사진을 올리기 전엔 보이지 않는다.
 *   - 옛 price는 판매가가 아니라 **신차가격**이다(2005년식 모닝이 920만 원) →
 *     vehicle_pricing.new_car_price. 판매가는 비워 '가격 미정'으로 둔다.
 *   - 판매자 연락처는 새 소유주 프로필 값이다. 옛 등록자의 전화·이메일은
 *     쓸 곳이 없는 제3자 개인정보라 옮기지 않는다.
 *   - 중복은 **차대번호로만** 가린다. 영업용 번호판은 차가 바뀌어도 이어져서,
 *     차량번호가 같아도 다른 차일 수 있다(실제로 한 건 있었다).
 *   - 이미 Supabase에 있는 차는 새로 넣지 않고 **빈 칸만** 채운다.
 *
 * 안전장치:
 *   - 전체를 DO 블록 하나로 실행한다 → 전부 성공하거나 전부 취소된다.
 *   - 차량 테이블에 INSERT 트리거가 있으면 멈춘다(알림이 나갈 수 있다).
 *   - 다시 돌려도 안전하다. 이미 들어간 차대번호는 '빈 칸 채우기'로 분류돼
 *     COALESCE로만 쓰므로 아무것도 덮지 않는다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const REF = 'thorgkxpbhsttgskhepu';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 일반 등록과 같은 값 — VehicleRegistrationScreen의 payload, DB 기본값과 일치한다 */
const LISTING = { status: 'approved', deal_stage: 'listed', hidden: false, is_admin_owned: false };

/** Firestore 필드 → vehicles 컬럼. 차량번호(regiNumber)는 따로 다룬다. */
const SPEC = {
  vehicleName: 'vehicle_name',
  subModel: 'sub_model',
  manufacturer: 'manufacturer',
  year: 'year',
  driveType: 'drive_type',
  fuelType: 'fuel_type',
  cc: 'cc',
  transmission: 'transmission',
  fuelEco: 'fuel_eco',
  fuelTank: 'fuel_tank',
  seats: 'seats',
  battery: 'battery',
  frontTire: 'front_tire',
  rearTire: 'rear_tire',
  engineOilLiter: 'engine_oil_liter',
  wiperInfo: 'wiper_info',
  vehicleType: 'vehicle_type',
  imageUrl: 'catalog_image_url', // 조회처 카탈로그 이미지. 실사진(image_urls)이 아니다.
};

const REQUIRED = ['vehicle_no', 'vehicle_name', 'manufacturer'];

// ── 입력 ────────────────────────────────────────────────────────────────

const parseArgs = (argv) => {
  const out = { apply: false, sqlOut: join(tmpdir(), 'jcar-legacy-import.sql') };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') { out.apply = true; }
    else if (a === '--data') { out.data = argv[++i]; }
    else if (a === '--owner') { out.owner = argv[++i]; }
    else if (a === '--sql-out') { out.sqlOut = argv[++i]; }
    else { throw new Error(`알 수 없는 인자: ${a}`); }
  }
  if (!out.data || !out.owner) { throw new Error('--data 와 --owner 가 필요합니다'); }
  return out;
};

// ── DB ──────────────────────────────────────────────────────────────────

const query = async (sql) => {
  const token = readFileSync(resolve(ROOT, '.supabase-access-token'), 'utf8').trim();
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // 관리 API 앞단(Cloudflare)이 기본 UA를 막는다(1010). curl UA는 통과한다.
      'User-Agent': 'curl/8.0',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) { throw new Error(`쿼리 실패 ${res.status}: ${text.slice(0, 400)}`); }
  return JSON.parse(text);
};

/** SQL 문자열 리터럴. 값에 든 작은따옴표는 두 번 쓴다. */
const lit = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

const sqlValue = (v) => {
  if (v === null || v === undefined) { return 'null'; }
  if (typeof v === 'number') { return String(v); }
  if (typeof v === 'boolean') { return v ? 'true' : 'false'; }
  return lit(v);
};

// ── 값 정리 ─────────────────────────────────────────────────────────────

const clean = (v) => {
  if (v === null || v === undefined) { return null; }
  const s = String(v).trim();
  return s === '' ? null : s;
};

const toInt = (v) => {
  const s = clean(v);
  if (s === null) { return null; }
  const n = Number.parseInt(s.replace(/,/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};

/** 컬럼 타입에 맞게 바꾼다. 원본은 전부 문자열로 저장돼 있었다. */
const castFor = (type) => {
  if (['integer', 'bigint', 'smallint'].includes(type)) { return toInt; }
  if (['numeric', 'real', 'double precision'].includes(type)) {
    return (v) => {
      const s = clean(v);
      const n = s === null ? NaN : Number(s);
      return Number.isFinite(n) ? n : null;
    };
  }
  return clean;
};

const labelOf = (f) => `${clean(f?.year) ?? '????'} ${clean(f?.vehicleName) ?? '(차명 없음)'}`;
const manwon = (n) => `${Math.round(n / 10000).toLocaleString('ko-KR')}만원`;

// ── 본체 ────────────────────────────────────────────────────────────────

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const src = JSON.parse(readFileSync(args.data, 'utf8'));
  const excludeByVin = new Map((src.exclude ?? []).map((e) => [e.vin, e.reason]));

  const problems = [];
  const warnings = [];

  // 1. 소유주 · 스키마 · 트리거
  const [owner] = await query(
    `select id, role, status, account_status, profile_completed
       from public.profiles where lower(email) = lower(${lit(args.owner)})`,
  );
  if (!owner) {
    problems.push(`소유주 계정이 없다: ${args.owner}`);
  } else {
    if (owner.status !== 'active') { problems.push(`소유주 계정이 활성 상태가 아니다 (${owner.status})`); }
    if (owner.account_status) { problems.push(`소유주 계정이 탈퇴 처리 중이다 (${owner.account_status})`); }
    if (!owner.profile_completed) { problems.push('소유주 프로필이 완성되지 않았다(이름·전화 없음)'); }
  }

  const cols = await query(
    `select column_name, data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'vehicles'`,
  );
  const typeOf = Object.fromEntries(cols.map((c) => [c.column_name, c.data_type]));
  for (const col of [...Object.values(SPEC), 'vehicle_no', ...Object.keys(LISTING)]) {
    if (!typeOf[col]) { problems.push(`vehicles에 ${col} 컬럼이 없다`); }
  }

  // tgtype & 4 = INSERT 트리거
  const insertTriggers = await query(
    `select c.relname as tbl, t.tgname
       from pg_trigger t
       join pg_class c on c.oid = t.tgrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ('vehicles', 'vehicle_pricing', 'vehicle_private_contact')
        and not t.tgisinternal
        and (t.tgtype & 4) <> 0`,
  );
  for (const t of insertTriggers) {
    const msg = `${t.tbl}에 INSERT 트리거 ${t.tgname}가 있다`;
    if (t.tbl === 'vehicles') { problems.push(`${msg} — 알림이 나갈 수 있다`); }
    else { warnings.push(msg); }
  }

  // 2. 분류: 빈 문서 · 결정에 따른 제외 · 차대번호 중복
  const excluded = [];
  const candidates = [];
  for (const d of src.docs) {
    const f = d.fields;
    if (!f || Object.keys(f).length === 0) {
      excluded.push({ label: `(빈 문서 ${d.docId.slice(0, 6)}…)`, reason: '필드가 없다' });
      continue;
    }
    const vin = clean(f.vin);
    if (!vin) {
      excluded.push({ label: labelOf(f), reason: '차대번호가 없어 중복을 가릴 수 없다' });
      continue;
    }
    if (excludeByVin.has(vin)) {
      excluded.push({ label: labelOf(f), reason: excludeByVin.get(vin) });
      continue;
    }
    candidates.push({ docId: d.docId, f, vin });
  }

  // 같은 차대번호면 가장 먼저 등록된 문서 하나만 남긴다(원래 등록일을 보존).
  const byVin = new Map();
  candidates.sort((a, b) => String(a.f.createdAt).localeCompare(String(b.f.createdAt)));
  for (const c of candidates) {
    if (byVin.has(c.vin)) {
      excluded.push({ label: labelOf(c.f), reason: '중복 — 같은 차대번호, 먼저 등록된 문서를 남김' });
    } else {
      byVin.set(c.vin, c);
    }
  }

  // 3. 이미 Supabase에 있는 차 (차대번호 기준)
  const vins = [...byVin.keys()];
  const existing = vins.length === 0 ? [] : await query(
    `select vin, vehicle_id from public.vehicle_private_contact
      where vin in (${vins.map(lit).join(', ')})`,
  );
  const existingByVin = new Map(existing.map((r) => [r.vin, r.vehicle_id]));

  // 4. 행 만들기
  const inserts = [];
  const backfills = [];
  for (const c of byVin.values()) {
    const row = { vehicle_no: clean(c.f.regiNumber) };
    for (const [key, col] of Object.entries(SPEC)) {
      row[col] = c.f[key] === undefined ? null : castFor(typeOf[col])(c.f[key]);
    }
    const newCarPrice = toInt(c.f.price);

    if (existingByVin.has(c.vin)) {
      backfills.push({ c, row, newCarPrice, vehicleId: existingByVin.get(c.vin) });
      continue;
    }

    for (const col of REQUIRED) {
      if (!row[col]) { problems.push(`${labelOf(c.f)}: 필수 칸 ${col}이 비었다`); }
    }
    if (row.year !== null && (row.year < 1980 || row.year > new Date().getFullYear() + 1)) {
      problems.push(`${labelOf(c.f)}: 연식이 이상하다 (${row.year})`);
    }
    if (newCarPrice !== null && newCarPrice <= 0) {
      problems.push(`${labelOf(c.f)}: 신차가격이 0 이하다`);
    }
    inserts.push({ id: randomUUID(), c, row, newCarPrice });
  }

  // 빈 칸 채우기: 지금 DB에서 비어 있는 칸만 고른다
  for (const b of backfills) {
    const specCols = Object.values(SPEC);
    const [cur] = await query(
      `select ${specCols.join(', ')},
              (select p.new_car_price from public.vehicle_pricing p where p.vehicle_id = v.id) as new_car_price
         from public.vehicles v where v.id = ${lit(b.vehicleId)}`,
    );
    b.fill = specCols.filter((col) => (cur[col] === null || cur[col] === '') && b.row[col] !== null);
    b.fillPrice = cur.new_car_price === null && b.newCarPrice !== null;
  }

  // 차량번호가 기존 차와 겹치지만 차대번호는 다른 경우 — 막지는 않고 알린다
  const insertPlates = inserts.map((i) => i.row.vehicle_no).filter(Boolean);
  if (insertPlates.length > 0) {
    const [{ n }] = await query(
      `select count(*)::int as n from public.vehicles where vehicle_no in (${insertPlates.map(lit).join(', ')})`,
    );
    if (n > 0) { warnings.push(`차량번호가 기존 차와 같은 것이 ${n}건 있다(차대번호가 달라 다른 차로 처리)`); }
  }

  // 5. SQL
  const vehicleCols = [
    'id', 'vehicle_no', ...Object.values(SPEC),
    ...Object.keys(LISTING), 'seller_id', 'current_owner_id', 'created_at', 'updated_at',
  ];
  const stmts = [];
  for (const i of inserts) {
    const values = vehicleCols.map((col) => {
      if (col === 'id') { return lit(i.id); }
      if (col === 'seller_id' || col === 'current_owner_id') { return lit(owner?.id); }
      if (col === 'created_at') { return `${lit(i.c.f.createdAt)}::timestamptz`; }
      if (col === 'updated_at') { return 'now()'; }
      if (col in LISTING) { return sqlValue(LISTING[col]); }
      return sqlValue(i.row[col]);
    });
    stmts.push(`insert into public.vehicles (${vehicleCols.join(', ')})\n  values (${values.join(', ')});`);
    if (i.newCarPrice !== null) {
      stmts.push(`insert into public.vehicle_pricing (vehicle_id, new_car_price) values (${lit(i.id)}, ${i.newCarPrice});`);
    }
    // 판매자 연락처는 새 소유주 프로필에서 가져온다(값을 스크립트에 싣지 않는다)
    stmts.push(
      `insert into public.vehicle_private_contact
  (vehicle_id, seller_id, seller_name, seller_phone, seller_email, owner_name, regi_number, vin)
  select ${lit(i.id)}, p.id, p.name, p.phone_number, p.email,
         ${lit(clean(i.c.f.ownerName))}, ${lit(i.row.vehicle_no)}, ${lit(i.c.vin)}
    from public.profiles p where p.id = ${lit(owner?.id)};`,
    );
  }
  for (const b of backfills) {
    if (b.fill.length > 0) {
      const sets = b.fill.map((col) => `${col} = coalesce(${col}, ${sqlValue(b.row[col])})`);
      stmts.push(`update public.vehicles set ${sets.join(', ')}, updated_at = now() where id = ${lit(b.vehicleId)};`);
    }
    if (b.fillPrice) {
      stmts.push(
        `insert into public.vehicle_pricing (vehicle_id, new_car_price) values (${lit(b.vehicleId)}, ${b.newCarPrice})
  on conflict (vehicle_id) do update
    set new_car_price = coalesce(public.vehicle_pricing.new_car_price, excluded.new_car_price);`,
      );
    }
  }
  const body = stmts.join('\n\n');
  if (body.includes('$import$')) { problems.push('값에 DO 블록 구분자가 들어 있다'); }
  const sql = `-- 옛 Firestore 차량 이식 (${src.source})\n-- 개인정보(소유자명·차량번호·차대번호)가 들어 있다. 검토 후 지울 것.\ndo $import$\nbegin\n${body}\nend\n$import$;\n`;
  writeFileSync(args.sqlOut, sql, 'utf8');

  // 6. 보고 (개인정보는 찍지 않는다)
  const mode = args.apply ? 'APPLY' : 'DRY-RUN (아무것도 쓰지 않습니다)';
  console.log(`\n옛 Firestore 차량 이식 — ${mode}`);
  console.log(`원본: ${src.source} · 문서 ${src.docs.length}건`);
  if (owner) {
    console.log(`소유주: ${args.owner} — ${owner.role} · ${owner.status} · 프로필 ${owner.profile_completed ? '완성' : '미완성'}`);
  }
  console.log(`상태: ${LISTING.status} · ${LISTING.deal_stage} · 숨김 ${LISTING.hidden ? '있음' : '없음'} (일반 등록과 같음)`);

  console.log(`\n새로 추가 (${inserts.length}대)`);
  for (const i of inserts) {
    const r = i.row;
    const price = i.newCarPrice !== null ? `신차가격 ${manwon(i.newCarPrice)}` : '신차가격 없음';
    console.log(`  + ${labelOf(i.c.f)} · ${r.fuel_type ?? '-'} · ${r.cc ?? '-'}cc · ${price} · 원래 등록 ${String(i.c.f.createdAt).slice(0, 10)}`);
  }

  console.log(`\n기존 차 빈 칸 채우기 (${backfills.length}대)`);
  for (const b of backfills) {
    const what = [...b.fill, ...(b.fillPrice ? ['신차가격'] : [])];
    console.log(`  ~ ${labelOf(b.c.f)} — ${what.length > 0 ? what.join(', ') : '채울 칸 없음'}`);
  }

  console.log(`\n제외 (${excluded.length}건)`);
  for (const e of excluded) { console.log(`  - ${e.label} — ${e.reason}`); }

  const priceRows = inserts.filter((i) => i.newCarPrice !== null).length;
  const bfVehicles = backfills.filter((b) => b.fill.length > 0).length;
  const bfPrice = backfills.filter((b) => b.fillPrice).length;
  console.log('\n반영될 행');
  console.log(`  vehicles                 +${inserts.length}${bfVehicles ? `  (빈 칸 채우기 ${bfVehicles})` : ''}`);
  console.log(`  vehicle_pricing          +${priceRows} 신차가격${bfPrice ? `  (빈 칸 채우기 ${bfPrice})` : ''} · 판매가는 비움`);
  console.log(`  vehicle_private_contact  +${inserts.length}`);

  console.log('\n검증');
  console.log(`  ${owner ? '✓' : '✗'} 소유주 계정`);
  console.log(`  ${insertTriggers.some((t) => t.tbl === 'vehicles') ? '✗' : '✓'} 차량 테이블에 INSERT 트리거 없음 — 알림 안 나감`);
  console.log(`  ${problems.some((p) => p.includes('필수 칸')) ? '✗' : '✓'} 필수 칸(차량번호·차명·제조사)`);
  console.log(`  ✓ 이식 대상끼리 차대번호 중복 없음 (중복 ${excluded.filter((e) => e.reason.startsWith('중복')).length}건은 제외됨)`);
  for (const w of warnings) { console.log(`  ⚠ ${w}`); }
  for (const p of problems) { console.log(`  ✗ ${p}`); }
  console.log(`\nSQL: ${args.sqlOut}  (개인정보 포함 — 검토 후 지울 것)`);

  if (problems.length > 0) {
    console.log('\n문제가 있어 멈춘다.');
    process.exit(1);
  }

  if (!args.apply) {
    console.log('\ndry-run이다. 실제로 쓰려면 --apply');
    return;
  }

  // 7. 반영 — DO 블록 하나라 전부 성공하거나 전부 취소된다
  await query(sql);
  const ids = inserts.map((i) => lit(i.id)).join(', ');
  const [check] = await query(
    `select (select count(*)::int from public.vehicles where id in (${ids || 'null'})) as vehicles,
            (select count(*)::int from public.vehicle_pricing where vehicle_id in (${ids || 'null'})) as pricing,
            (select count(*)::int from public.vehicle_private_contact where vehicle_id in (${ids || 'null'})) as contact`,
  );
  console.log(`\n반영 완료 — vehicles ${check.vehicles} · vehicle_pricing ${check.pricing} · vehicle_private_contact ${check.contact}`);
};

main().catch((e) => {
  console.error(`\n실패: ${e.message}`);
  process.exit(1);
});
