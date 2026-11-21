#!/usr/bin/env node
/**
 * 원자료 수집기 (로컬 실행).
 *   node scripts/collect/collect.mjs info            원자료 CSV → inbox/auto-*.csv(자동) + review/*.csv(검토)
 *   node scripts/collect/collect.mjs auction         온비드 API → tools/auction/data/items.json
 *   node scripts/collect/collect.mjs auction --probe 첫 페이지 원본을 저장하고 필드 이름만 보여준다
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const argVal = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
// --config 다른설정.json (가상 데이터 시험은 demo/collect.config.json)
const cfgPath = argVal('--config') || process.env.BOSANG_COLLECT_CONFIG || 'collect.config.json';
const cfg = JSON.parse(readFileSync(join(ROOT, cfgPath), 'utf8'));
const INFO = infoDir(ROOT);
const [cmd = 'info'] = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--config');
const flag = (f) => process.argv.includes(f);

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

async function info() {
  const projects = loadProjects();
  mkdirSync(join(INFO, 'review'), { recursive: true });
  mkdirSync(join(INFO, 'inbox'), { recursive: true });
  for (const s of cfg.info.sources.filter((x) => x.enabled)) {
    const file = join(ROOT, s.file);
    if (!existsSync(file)) { console.log(`- ${s.id}: 원자료 없음 (${s.file}) — ${s.note || ''}`); continue; }
    const kind = KINDS[s.kind];
    if (!kind) { console.warn(`- ${s.id}: 모르는 kind ${s.kind}`); continue; }
    try {
      const cands = kind(parseCsv(readKoreanText(file)), s);
      const rows = toInboxRows(cands, projects);
      const { auto, review } = splitForReview(rows);
      const reviewPath = join(INFO, 'review', `${s.id}.csv`);
      const approved = approvedOf(reviewPath);
      const promoted = review.filter((r) => approved.has(`${r.date}|${r.title}`));
      const pending = review.filter((r) => !approved.has(`${r.date}|${r.title}`)).map((r) => ({ ...r, 승인: '' }));
      writeFileSync(join(INFO, 'inbox', `auto-${s.id}.csv`), rowsToCsv([...auto, ...promoted]));
      writeFileSync(reviewPath, rowsToCsv([...promoted.map((r) => ({ ...r, 승인: '승인' })), ...pending], ['confidence', 'reason', '승인']));
      console.log(`- ${s.id}: 후보 ${rows.length}건 → 자동 ${auto.length} · 승인 반영 ${promoted.length} · 검토 대기 ${pending.length} (기존 사업에 붙은 것 ${rows.filter((r) => r.matched).length})`);
    } catch (e) { console.warn(`- ${s.id}: ${e.message}`); }
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
  writeFileSync(outPath, JSON.stringify(merged, null, 2));
  console.log(`온비드 ${raw.length}건 → 물건 ${land.length}건 → ${cfg.auction.out} (전체 ${merged.length}건, PNU 표기 ${dialect === 'zero-one' ? '0/1 → 표준으로 변환' : '표준'})`);
  const noPnu = land.filter((x) => !x.pnu).length;
  if (noPnu) console.log(`  PNU 없는 물건 ${noPnu}건 — 주소(시군구·읍면동) 힌트로만 매칭됩니다`);
}

try {
  if (cmd === 'info') await info();
  else if (cmd === 'auction') await auction();
  else throw new Error(`모르는 명령: ${cmd} (info | auction)`);
} catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
