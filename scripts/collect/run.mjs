#!/usr/bin/env node
// 보상정보 수집: 켜진 어댑터를 돌려 content/info/projects/*.json에 합치고 검증한다.
//   node scripts/collect/run.mjs           수집 + 합치기
//   node scripts/collect/run.mjs --check   검증만
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADAPTERS } from './adapters.mjs';
import { mergeInto, rowToNotice } from './merge.mjs';
import { validateProject, normalizePnu, normalizeAddress, sigunguOfAddress } from '../../site/lib/infoModel.mjs';
import { infoDir, isDemo } from './lib/paths.mjs';
import { parseCsv } from './merge.mjs';
import { existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const INFO = infoDir(ROOT);
const DIR = join(INFO, 'projects');
const ontology = JSON.parse(readFileSync(join(ROOT, 'content/info/ontology.json'), 'utf8'));

mkdirSync(DIR, { recursive: true });
const load = () => Object.fromEntries(readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => { const p = JSON.parse(readFileSync(join(DIR, f), 'utf8')); return [p.id, p]; }));

const projects = load();
if (!process.argv.includes('--check')) {
  for (const a of ADAPTERS(INFO).filter((x) => x.enabled())) {
    try {
      const rows = await a.fetch();
      for (const r of rows) {
        const item = rowToNotice(r);
        projects[item.projectId] = mergeInto(projects[item.projectId], item);
      }
      console.log(`${a.name}: ${rows.length}건`);
    } catch (e) { console.warn(`${a.name}: ${e.message}`); }
  }
  mergeParcels(projects);
  if (isDemo()) for (const p of Object.values(projects)) p.sample = true; // 가상 데이터는 화면에 '예시'로 보인다
}

/** inbox/parcels/*.csv (열: project_id 또는 project_name, pnu, address) → 사업의 parcels */
function mergeParcels(projects) {
  const dir = join(INFO, 'inbox/parcels');
  if (!existsSync(dir)) return;
  const byName = new Map(Object.values(projects).map((p) => [String(p.name).replace(/\s+/g, ''), p]));
  let n = 0, miss = 0;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.csv'))) {
    for (const r of parseCsv(readFileSync(join(dir, f), 'utf8'))) {
      const p = projects[r.project_id] || byName.get(String(r.project_name || '').replace(/\s+/g, ''));
      if (!p) { miss++; continue; }
      p.parcels ||= [];
      const dup = p.parcels.some((x) => (r.pnu && normalizePnu(x.pnu) === normalizePnu(r.pnu)) || (r.address && normalizeAddress(x.address) === normalizeAddress(r.address)));
      if (!dup && (r.pnu || r.address)) { p.parcels.push({ ...(r.pnu ? { pnu: normalizePnu(r.pnu) } : {}), ...(r.address ? { address: r.address } : {}) }); n++; }
    }
  }
  // 도 단위 고시는 시군구가 비어 있다 → 필지 주소에서 가장 많이 나온 시군구로 채운다
  for (const p of Object.values(projects)) {
    if (p.region?.sigungu || !p.parcels?.length) continue;
    const count = {};
    for (const x of p.parcels) { const sg = sigunguOfAddress(x.address, p.region?.sido); if (sg) count[sg] = (count[sg] || 0) + 1; }
    const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
    if (best) { p.region ||= {}; p.region.sigungu = best[0]; }
  }
  console.log(`필지: ${n}개 추가${miss ? `, 사업을 못 찾은 행 ${miss}개` : ''}`);
}

let bad = 0;
for (const p of Object.values(projects)) {
  const errs = validateProject(p, ontology);
  if (errs.length) { bad++; console.error(`✗ ${p.id}: ${errs.join(', ')}`); continue; }
  if (!process.argv.includes('--check')) writeFileSync(join(DIR, `${p.id}.json`), JSON.stringify(p, null, 2) + '\n');
}
// 툴·외부용 묶음 (생성물, 커밋 안 함)
writeFileSync(join(INFO, 'index.json'), JSON.stringify({ generatedAt: new Date().toISOString(), projects: Object.values(projects) }));
console.log(`사업 ${Object.keys(projects).length}개, 오류 ${bad}개`);
process.exit(bad ? 1 : 0);
