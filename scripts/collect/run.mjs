#!/usr/bin/env node
// 보상정보 수집: 켜진 어댑터를 돌려 content/info/projects/*.json에 합치고 검증한다.
//   node scripts/collect/run.mjs           수집 + 합치기
//   node scripts/collect/run.mjs --check   검증만
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADAPTERS } from './adapters.mjs';
import { mergeInto, rowToNotice } from './merge.mjs';
import { validateProject } from '../../site/lib/infoModel.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = join(ROOT, 'content/info/projects');
const ontology = JSON.parse(readFileSync(join(ROOT, 'content/info/ontology.json'), 'utf8'));

mkdirSync(DIR, { recursive: true });
const load = () => Object.fromEntries(readdirSync(DIR).filter((f) => f.endsWith('.json'))
  .map((f) => { const p = JSON.parse(readFileSync(join(DIR, f), 'utf8')); return [p.id, p]; }));

const projects = load();
if (!process.argv.includes('--check')) {
  for (const a of ADAPTERS(ROOT).filter((x) => x.enabled())) {
    try {
      const rows = await a.fetch();
      for (const r of rows) {
        const item = rowToNotice(r);
        projects[item.projectId] = mergeInto(projects[item.projectId], item);
      }
      console.log(`${a.name}: ${rows.length}건`);
    } catch (e) { console.warn(`${a.name}: ${e.message}`); }
  }
}

let bad = 0;
for (const p of Object.values(projects)) {
  const errs = validateProject(p, ontology);
  if (errs.length) { bad++; console.error(`✗ ${p.id}: ${errs.join(', ')}`); continue; }
  if (!process.argv.includes('--check')) writeFileSync(join(DIR, `${p.id}.json`), JSON.stringify(p, null, 2) + '\n');
}
// 툴·외부용 묶음 (생성물, 커밋 안 함)
writeFileSync(join(ROOT, 'content/info/index.json'), JSON.stringify({ generatedAt: new Date().toISOString(), projects: Object.values(projects) }));
console.log(`사업 ${Object.keys(projects).length}개, 오류 ${bad}개`);
process.exit(bad ? 1 : 0);
