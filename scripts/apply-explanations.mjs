#!/usr/bin/env node
/**
 * 검토가 끝난 해설을 문제은행에 반영한다.
 *   1) 검토표(Sheets)를 CSV로 내려받는다
 *   2) node scripts/apply-explanations.mjs 검토표.csv [--dry]
 * '검토 결과'가 '승인'인 행만 '해설 초안' 칸의 글(검토 중 고친 글 그대로)로 ex를 바꾸고 revised에 날짜를 적는다.
 * '정답 변경'·'수정 필요'·'보류'는 바꾸지 않고 목록만 보여 준다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './collect/merge.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'content/questions.json');
const [csvPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dry = process.argv.includes('--dry');
if (!csvPath) { console.error('사용법: node scripts/apply-explanations.mjs 검토표.csv [--dry]'); process.exit(1); }

const raw = JSON.parse(readFileSync(FILE, 'utf8'));
const list = Array.isArray(raw) ? raw : raw.questions;
const byId = new Map(list.map((q) => [q.id, q]));
const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const rows = parseCsv(readFileSync(csvPath, 'utf8'));
const held = [];
let applied = 0;
for (const r of rows) {
  const q = byId.get(r['ID']);
  if (!q) { held.push(`${r['ID']}: 문제은행에 없음`); continue; }
  const status = r['검토 결과'];
  if (status === '승인') {
    if (!r['해설 초안']) { held.push(`${q.id}: 해설이 비어 있음`); continue; }
    q.ex = esc(r['해설 초안']);
    q.revised = today;
    applied++;
  } else if (status) {
    held.push(`${q.id}: ${status}${r['검토 의견'] ? ` — ${r['검토 의견']}` : ''}`);
  }
}
console.log(`승인 반영 ${applied}건${dry ? ' (--dry: 저장 안 함)' : ''}`);
if (held.length) { console.log('반영하지 않은 행:'); held.forEach((h) => console.log('  ' + h)); }
if (!dry && applied) writeFileSync(FILE, JSON.stringify(raw, null, 2));
