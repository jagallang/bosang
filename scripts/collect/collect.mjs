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
import { onbidItemToAuction, isLand, mergeAuctionItems } from './sources/onbid.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const cfg = JSON.parse(readFileSync(join(ROOT, 'collect.config.json'), 'utf8'));
const [cmd = 'info'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flag = (f) => process.argv.includes(f);

const KINDS = {
  eumGosiCsv: (rows, s) => eumRowsToCandidates(rows, { since: s.since || cfg.info.since }),
  compPlanCsv: (rows, s) => compPlanRowsToCandidates(rows, { operator: s.operator, sido: s.sido, sigungu: s.sigungu, source: s.id })
    .filter((c) => c.date >= (s.since || cfg.info.since)),
};

const loadProjects = () => {
  const dir = join(ROOT, 'content/info/projects');
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))) : [];
};

/** 검토 CSV에서 승인 열이 O/승인 인 행 (다시 만들 때 표시를 살린다) */
function approvedOf(path) {
  if (!existsSync(path)) return new Map();
  return new Map(parseCsv(readFileSync(path, 'utf8')).filter((r) => /^(o|O|승인|y|Y)$/.test(r['승인'] || '')).map((r) => [`${r.date}|${r.title}`, r]));
}

async function info() {
  const projects = loadProjects();
  mkdirSync(join(ROOT, 'content/info/review'), { recursive: true });
  for (const s of cfg.info.sources.filter((x) => x.enabled)) {
    const file = join(ROOT, s.file);
    if (!existsSync(file)) { console.log(`- ${s.id}: 원자료 없음 (${s.file}) — ${s.note || ''}`); continue; }
    const kind = KINDS[s.kind];
    if (!kind) { console.warn(`- ${s.id}: 모르는 kind ${s.kind}`); continue; }
    try {
      const cands = kind(parseCsv(readKoreanText(file)), s);
      const rows = toInboxRows(cands, projects);
      const { auto, review } = splitForReview(rows);
      const reviewPath = join(ROOT, 'content/info/review', `${s.id}.csv`);
      const approved = approvedOf(reviewPath);
      const promoted = review.filter((r) => approved.has(`${r.date}|${r.title}`));
      const pending = review.filter((r) => !approved.has(`${r.date}|${r.title}`)).map((r) => ({ ...r, 승인: '' }));
      writeFileSync(join(ROOT, 'content/info/inbox', `auto-${s.id}.csv`), rowsToCsv([...auto, ...promoted]));
      writeFileSync(reviewPath, rowsToCsv([...promoted.map((r) => ({ ...r, 승인: '승인' })), ...pending], ['confidence', 'reason', '승인']));
      console.log(`- ${s.id}: 후보 ${rows.length}건 → 자동 ${auto.length} · 승인 반영 ${promoted.length} · 검토 대기 ${pending.length} (기존 사업에 붙은 것 ${rows.filter((r) => r.matched).length})`);
    } catch (e) { console.warn(`- ${s.id}: ${e.message}`); }
  }
}

async function auction() {
  const o = cfg.auction.onbid;
  if (!o.enabled) return console.log('온비드 수집이 꺼져 있습니다 (collect.config.json)');
  if (/확인 필요/.test(o.endpoint) || Object.values(o.params).some((v) => /확인 필요/.test(String(v)))) {
    throw new Error('collect.config.json의 auction.onbid.endpoint / params를 활용가이드 값으로 채워야 합니다');
  }
  const serviceKey = process.env.DATA_GO_KR_KEY;
  if (flag('--probe')) {
    const raw = await fetchAllPages({ endpoint: o.endpoint, params: o.params, serviceKey, rows: 5, maxPages: 1 });
    const dir = join(ROOT, 'tools/auction/data');
    writeFileSync(join(dir, 'probe.json'), JSON.stringify(raw, null, 2));
    console.log(`받은 물건 ${raw.length}건. 필드 이름:\n  ${[...new Set(raw.flatMap(Object.keys))].join('\n  ')}`);
    console.log('원본은 tools/auction/data/probe.json — 이 이름으로 mapping을 고친다');
    return;
  }
  const raw = await fetchAllPages({ endpoint: o.endpoint, params: o.params, serviceKey, rows: o.rows, maxPages: o.maxPages,
    onPage: (p, r) => console.log(`  ${p}쪽 ${r.items.length}건 (전체 ${r.totalCount})`) });
  const fresh = raw.map((x) => onbidItemToAuction(x, o.mapping)).filter(Boolean);
  const land = fresh.filter((x) => isLand(x, o.landWords));
  const unmapped = fresh.filter((x) => !x.address && !x.pnu).length;
  const out = join(ROOT, cfg.auction.out);
  const existing = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : [];
  const merged = mergeAuctionItems(existing, land);
  writeFileSync(out, JSON.stringify(merged, null, 2));
  console.log(`온비드 ${raw.length}건 중 토지 ${land.length}건 → ${cfg.auction.out} (전체 ${merged.length}건)`);
  if (unmapped) console.warn(`주소·PNU가 빈 물건 ${unmapped}건 — mapping의 address/pnu 키를 --probe로 확인하세요`);
}

try {
  if (cmd === 'info') await info();
  else if (cmd === 'auction') await auction();
  else throw new Error(`모르는 명령: ${cmd} (info | auction)`);
} catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
