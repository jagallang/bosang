#!/usr/bin/env node
/**
 * 원자료 수집기 (로컬 실행).
 *   node scripts/collect/collect.mjs info            원자료 CSV → inbox/auto-*.csv(자동) + review/*.csv(검토)
 *   node scripts/collect/collect.mjs auction         온비드 API → tools/auction/data/items.json
 *   node scripts/collect/collect.mjs auction --probe 첫 페이지 원본을 저장하고 필드 이름만 보여준다
 *   node scripts/collect/collect.mjs geo             브이월드 → content/info/geo/projects/<id>.geojson (사업지구 경계)
 * 이어서 `node scripts/collect/run.mjs`가 inbox를 사업 JSON에 합친다 (npm run collect가 둘 다 한다).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './merge.mjs';
import { readKoreanText } from './lib/readText.mjs';
import { eumRowsToCandidates } from './sources/eumGosiCsv.mjs';
import { compPlanRowsToCandidates } from './sources/compPlanCsv.mjs';
import { toInboxRows, rowsToCsv, splitForReview } from './lib/candidates.mjs';
import { fetchAllPages } from './lib/publicDataApi.mjs';
import { onbidItemToAuction, isLand, mergeAuctionItems, pnuDialectOf } from './sources/onbid.mjs';
import { infoDir } from './lib/paths.mjs';
import { loadEnvLocal } from './lib/env.mjs';
import { fetchEumRecent } from './sources/eumGosiWeb.mjs';
import { fetchBoard } from './sources/board.mjs';
import { annotateItems } from './sources/vworld.mjs';
import { findBoundary, toGeoFile } from './sources/vworldGeo.mjs';
import { sigunguKeys } from '../../site/lib/geo.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const argVal = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
// --config 다른설정.json (가상 데이터 시험은 demo/collect.config.json)
const cfgPath = argVal('--config') || process.env.BOSANG_COLLECT_CONFIG || 'collect.config.json';
loadEnvLocal(ROOT);
const cfg = JSON.parse(readFileSync(join(ROOT, cfgPath), 'utf8'));
const INFO = infoDir(ROOT);
const [cmd = 'info'] = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !['--config', '--since'].includes(all[i - 1]));
const flag = (f) => process.argv.includes(f);
const flagVal = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

const KINDS = {
  eumGosiCsv: (rows, s) => eumRowsToCandidates(rows, { since: s.since || cfg.info.since }),
  compPlanCsv: (rows, s) => compPlanRowsToCandidates(rows, { operator: s.operator, sido: s.sido, sigungu: s.sigungu, source: s.id })
    .filter((c) => c.date >= (s.since || cfg.info.since)),
};

const loadProjects = () => {
  const dir = join(INFO, 'projects');
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))) : [];
};

/** 검토 CSV에서 승인 열이 O/승인 인 행 (다시 만들 때 표시를 살린다) */
function approvedOf(path) {
  if (!existsSync(path)) return new Map();
  return new Map(parseCsv(readFileSync(path, 'utf8')).filter((r) => /^(o|O|승인|y|Y)$/.test(r['승인'] || '')).map((r) => [`${r.date}|${r.title}`, r]));
}

/** 후보 → inbox/auto-<id>.csv (자동) + review/<id>.csv (검토), 승인 표시는 살린다 */
function route(id, cands, projects) {
  const rows = toInboxRows(cands, projects);
  const { auto, review } = splitForReview(rows);
  const reviewPath = join(INFO, 'review', `${id}.csv`);
  const approved = approvedOf(reviewPath);
  const promoted = review.filter((r) => approved.has(`${r.date}|${r.title}`));
  const pending = review.filter((r) => !approved.has(`${r.date}|${r.title}`)).map((r) => ({ ...r, 승인: '' }));
  writeFileSync(join(INFO, 'inbox', `auto-${id}.csv`), rowsToCsv([...auto, ...promoted]));
  writeFileSync(reviewPath, rowsToCsv([...promoted.map((r) => ({ ...r, 승인: '승인' })), ...pending], ['confidence', 'reason', '승인']));
  console.log(`- ${id}: 후보 ${rows.length}건 → 자동 ${auto.length} · 승인 반영 ${promoted.length} · 검토 대기 ${pending.length} (기존 사업에 붙은 것 ${rows.filter((r) => r.matched).length})`);
}

const daysAgo = (n) => new Date(Date.now() + 9 * 3600000 - n * 86400000).toISOString().slice(0, 10);

async function info() {
  const projects = loadProjects();
  mkdirSync(join(INFO, 'review'), { recursive: true });
  mkdirSync(join(INFO, 'inbox'), { recursive: true });
  for (const s of cfg.info.sources.filter((x) => x.enabled)) {
    const file = join(ROOT, s.file);
    if (!existsSync(file)) { console.log(`- ${s.id}: 원자료 없음 (${s.file}) ${s.note || ''}`); continue; }
    const kind = KINDS[s.kind];
    if (!kind) { console.warn(`- ${s.id}: 모르는 kind ${s.kind}`); continue; }
    try { route(s.id, kind(parseCsv(readKoreanText(file)), s), projects); }
    catch (e) { console.warn(`- ${s.id}: ${e.message}`); }
  }
  // 웹 원천: 1단계 지정고시(토지이음), 2단계 보상 공고(게시판). 실패해도 나머지는 계속
  for (const w of (cfg.info.web || []).filter((x) => x.enabled)) {
    try {
      const since = flagVal('--since') || daysAgo(w.sinceDays ?? 7);
      const cands = w.kind === 'eumWeb'
        ? await fetchEumRecent({ since, sido: w.sido, base: w.base, listSize: w.listSize, maxPages: w.maxPages, delayMs: w.delayMs, log: console.log })
        : w.kind === 'board' ? await fetchBoard(w, { delayMs: w.delayMs, log: console.log })
        : (() => { throw new Error(`모르는 kind ${w.kind}`); })();
      route(w.id, cands, projects);
    } catch (e) { console.warn(`- ${w.id}: ${e.message}`); }
  }
}

async function auction() {
  const o = cfg.auction.onbid;
  if (!o.enabled) return console.log('온비드 수집이 꺼져 있습니다');
  if (/확인 필요/.test(o.endpoint)) throw new Error('auction.onbid.endpoint를 채워야 합니다');
  const serviceKey = process.env.DATA_GO_KR_KEY;
  const sets = o.paramSets?.length ? o.paramSets : [{}];
  const outPath = join(ROOT, cfg.auction.out);
  mkdirSync(dirname(outPath), { recursive: true });
  if (flag('--probe')) {
    const raw = await fetchAllPages({ endpoint: o.endpoint, params: { ...o.params, ...sets[0] }, serviceKey, rows: 5, maxPages: 1 });
    writeFileSync(join(dirname(outPath), 'probe.json'), JSON.stringify(raw, null, 2));
    console.log(`받은 물건 ${raw.length}건. 필드 이름:\n  ${[...new Set(raw.flatMap(Object.keys))].join('\n  ')}`);
    console.log(`원본은 ${join(dirname(cfg.auction.out), 'probe.json')} — 이름이 다르면 config의 mapping에 넣는다`);
    return;
  }
  const raw = [];
  for (const set of sets) {
    const got = await fetchAllPages({ endpoint: o.endpoint, params: { ...o.params, ...set }, serviceKey, rows: o.rows, maxPages: o.maxPages,
      onPage: (p, r) => console.log(`  ${JSON.stringify(set)} ${p}쪽 ${r.items.length}건 (전체 ${r.totalCount})`) });
    raw.push(...got);
  }
  const dialect = pnuDialectOf(raw);
  const fresh = raw.map((x) => onbidItemToAuction(x, o.mapping, { dialect })).filter(Boolean);
  const land = fresh.filter((x) => isLand(x, o.landWords));
  const existing = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : [];
  const merged = mergeAuctionItems(existing, land);
  await zoningFor(merged);
  writeFileSync(outPath, JSON.stringify(merged, null, 2));
  console.log(`온비드 ${raw.length}건 → 물건 ${land.length}건 → ${cfg.auction.out} (전체 ${merged.length}건, PNU 표기 ${dialect === 'zero-one' ? '0/1 → 표준으로 변환' : '표준'})`);
  const noPnu = land.filter((x) => !x.pnu).length;
  if (noPnu) console.log(`  PNU 없는 물건 ${noPnu}건 — 주소(시군구·읍면동) 힌트로만 매칭됩니다`);
}

/** 브이월드로 물건마다 사업지구 포함 여부를 붙인다 (키가 없으면 건너뜀) */
async function zoningFor(items) {
  const v = cfg.auction.vworld || {};
  if (v.enabled === false) return;
  if (!process.env.VWORLD_KEY) return console.log('브이월드 판정 건너뜀 (VWORLD_KEY 없음)');
  await annotateItems(items, { key: process.env.VWORLD_KEY, domain: process.env.VWORLD_DOMAIN || v.domain || 'localhost', endpoint: v.endpoint || undefined }, { delayMs: v.delayMs ?? 200, log: console.log });
}

async function zoning() {
  const outPath = join(ROOT, cfg.auction.out);
  if (!existsSync(outPath)) throw new Error(`${cfg.auction.out}이 없습니다. 먼저 auction 수집`);
  const items = JSON.parse(readFileSync(outPath, 'utf8'));
  await zoningFor(items);
  writeFileSync(outPath, JSON.stringify(items, null, 2));
}

/** 사업지구 경계: 이미 있는 파일은 건너뛴다 (--force 로 다시 받기) */
async function geo() {
  const g = cfg.geo || {};
  if (!process.env.VWORLD_KEY) throw new Error('VWORLD_KEY 환경변수(브이월드 인증키)가 없습니다 (.env.local)');
  const sigungu = JSON.parse(readFileSync(join(ROOT, 'content', 'info', 'geo', 'sigungu.json'), 'utf8')).items;
  const outDir = join(ROOT, 'content', 'info', 'geo', 'projects');
  mkdirSync(outDir, { recursive: true });
  const opts = { key: process.env.VWORLD_KEY, domain: process.env.VWORLD_DOMAIN || cfg.auction?.vworld?.domain || 'localhost' };
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const projDir = join(INFO, 'projects');
  let found = 0, missing = 0, skipped = 0;
  for (const f of readdirSync(projDir).filter((x) => x.endsWith('.json'))) {
    const p = JSON.parse(readFileSync(join(projDir, f), 'utf8'));
    const out = join(outDir, `${p.id}.geojson`);
    if (existsSync(out) && !flag('--force') && !g.overwrite) { skipped++; continue; }
    const keys = sigunguKeys(p.region, sigungu);
    if (!keys.length) { console.log(`  ? ${p.name}: 시군구를 찾지 못함 (${p.region?.sido} ${p.region?.sigungu})`); missing++; continue; }
    const b = keys.map((k) => sigungu[k].bbox);
    const bbox = [Math.min(...b.map((x) => x[0])), Math.min(...b.map((x) => x[1])), Math.max(...b.map((x) => x[2])), Math.max(...b.map((x) => x[3]))];
    try {
      const r = await findBoundary(p, { bbox, layerMap: g.layers || {}, opts });
      if (r) { writeFileSync(out, JSON.stringify(toGeoFile(p, r, { today }))); found++; console.log(`  ✓ ${p.name}: ${r.precision === 'parcels' ? '필지' : '지구 경계'} ${r.features.length}개 (${r.layer})`); }
      else { missing++; console.log(`  - ${p.name}: 경계 못 찾음 → 지도에는 시군구 범위로 표시`); }
    } catch (e) { missing++; console.log(`  ✗ ${p.name}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, g.delayMs ?? 300));
  }
  console.log(`경계 ${found}곳 저장, ${missing}곳 못 찾음, ${skipped}곳은 이미 있어 건너뜀 → content/info/geo/projects/`);
}

try {
  if (cmd === 'geo') await geo();
  else if (cmd === 'info') await info();
  else if (cmd === 'zoning') await zoning();
  else if (cmd === 'auction') await auction();
  else throw new Error(`모르는 명령: ${cmd} (info | auction | zoning | geo)`);
} catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
