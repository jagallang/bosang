#!/usr/bin/env node
/**
 * npm run demo 결과를 한 장짜리 HTML로 묶는다 (공유·확인용). 보상경매 툴 코드를 그대로 번들해 넣는다.
 *   ESBUILD=/경로/esbuild node scripts/demo/artifact.mjs  → demo/out/artifact.html
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../collect/merge.mjs';
import { onbidItems } from './fixtures.mjs';
import { decodeKorean } from '../collect/lib/readText.mjs';
import { currentStage, openDeadlines, findProjectsByParcel, regionHints } from '../../site/lib/infoModel.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const O = join(ROOT, 'demo/out');
const J = (p) => JSON.parse(readFileSync(p, 'utf8'));
const ontology = J(join(ROOT, 'content/info/ontology.json'));
const index = J(join(O, 'info/index.json'));
const items = J(join(O, 'items.json'));
const csv = (p) => parseCsv(decodeKorean(readFileSync(p)));
const today = '2026-11-21';

const eumRaw = csv(join(O, 'sources/토지이음_고시목록.csv')).length;
const compRaw = csv(join(O, 'sources/경북개발공사_보상계획공고.csv')).length;
const auto = readdirSync(join(O, 'info/inbox')).filter((f) => f.startsWith('auto-')).flatMap((f) => csv(join(O, 'info/inbox', f)));
const review = readdirSync(join(O, 'info/review')).flatMap((f) => csv(join(O, 'info/review', f)));
const match = items.map((it) => { const h = findProjectsByParcel(index.projects, it); return h.length ? { k: 'hit', p: h[0].project.id } : regionHints(index.projects, it.address).length ? { k: 'near', p: regionHints(index.projects, it.address)[0].id } : { k: 'miss' }; });
const stat = {
  eumRaw, compRaw, auto: auto.length, review: review.length, projects: index.projects.length,
  parcels: index.projects.reduce((a, p) => a + (p.parcels || []).length, 0),
  onbidRaw: onbidItems().length, items: items.length,
  hit: match.filter((m) => m.k === 'hit').length, near: match.filter((m) => m.k === 'near').length, miss: match.filter((m) => m.k === 'miss').length,
  noPnu: items.filter((x) => !x.pnu).length, share: items.filter((x) => x.share).length,
};
const projects = index.projects.map((p) => {
  const st = currentStage(p, ontology);
  const last = [...p.notices].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return { id: p.id, name: p.name, region: [p.region?.sido, p.region?.sigungu].filter(Boolean).join(' '), operator: p.operator || '', order: st?.order || 0, stage: st?.name || '-',
    last: last ? `${last.date} ${last.title}` : '', deadline: openDeadlines(p, today)[0] || null, parcels: (p.parcels || []).length, notices: p.notices.length,
    hit: match.filter((m) => m.k === 'hit' && m.p === p.id).length, near: match.filter((m) => m.k === 'near' && m.p === p.id).length };
}).sort((a, b) => b.order - a.order);

const bundle = execFileSync(process.env.ESBUILD || 'esbuild', [join(ROOT, 'tools/auction/app.js'), '--bundle', '--format=esm', '--minify'], { encoding: 'utf8' });
const css = readFileSync(join(ROOT, 'tools/auction/style.css'), 'utf8');
const data = { ontology, index, items };
const stages = ontology.stages.map((s) => s.name);
const safe = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

const html = readFileSync(join(ROOT, 'scripts/demo/artifact.template.html'), 'utf8')
  .replace('/*TOOL_CSS*/', () => css)
  .replace('/*DATA*/', () => `const DATA=${safe(data)};const STAT=${safe(stat)};const PROJECTS=${safe(projects)};const REVIEW=${safe(review.map((r) => ({ date: r.date, title: r.title, reason: r.reason })))};const STAGES=${safe(stages)};`)
  .replace('/*TOOL_JS*/', () => bundle.replace(/<\/script/g, '<\\/script'));
writeFileSync(join(O, 'artifact.html'), html);
console.log(`demo/out/artifact.html (${Math.round(html.length / 1024)} KB)`, stat);
