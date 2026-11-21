#!/usr/bin/env node
/**
 * 문제은행 원본(content/questions.json)을 검사하고 배포용 파일을 만든다.
 *
 *   node scripts/build-content.mjs              무료 샘플 + 업로드용 묶음 생성
 *   node scripts/build-content.mjs --free=10    과목별 무료 샘플 수 (기본 10)
 *   node scripts/build-content.mjs --local-full 로컬 테스트용 전체 문항도 public/data/questions.json에 복사
 *
 * 결과
 *   public/data/questions.free.json   무료 샘플 (배포됨)
 *   content/out/questionChunks.json    과목별 전체 문항 묶음 (Firestore 업로드용, 배포 안 됨)
 *   public/data/questions.json         --local-full 일 때만 (gitignore, firebase 배포 제외)
 *
 * 형식 오류가 있으면 아무 파일도 쓰지 않고 실패한다.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'content', 'questions.json');
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const FREE_PER_SUBJECT = Number(args.free ?? 10);

const SUBJECT_BY_PREFIX = { civ: '민법', rel: '부동산관계법규', lca: '토지보상법규', prc1: '보상실무1', prc2: '보상실무2' };

export function validate(questions) {
  const errors = [];
  const ids = new Set();
  for (const q of questions) {
    const where = q.id || '(id 없음)';
    if (!/^(civ|rel|lca|prc[12])-\d{3}$/.test(q.id || '')) errors.push(`${where}: ID 형식`);
    if (ids.has(q.id)) errors.push(`${where}: ID 중복`);
    ids.add(q.id);
    const prefix = (q.id || '').split('-')[0];
    if (SUBJECT_BY_PREFIX[prefix] !== q.subject) errors.push(`${where}: 과목(${q.subject})과 ID 접두어(${prefix}) 불일치`);
    if (![1, 2].includes(q.stage)) errors.push(`${where}: stage는 1 또는 2`);
    if (!q.q || !String(q.q).trim()) errors.push(`${where}: 문제 본문 없음`);
    if (q.type === 'mcq') {
      if (!Array.isArray(q.opt) || q.opt.length < 2 || q.opt.length > 5) errors.push(`${where}: 선택지 2~5개`);
      else if (!Number.isInteger(q.a) || q.a < 0 || q.a >= q.opt.length) errors.push(`${where}: 정답 a=${q.a} 범위 밖 (0-based)`);
    } else if (q.type === 'essay') {
      if (!q.model) errors.push(`${where}: 모범답안 없음`);
      if (!Array.isArray(q.keywords) || !q.keywords.length) errors.push(`${where}: 채점 키워드 없음`);
    } else if (q.type !== 'fill') {
      errors.push(`${where}: 알 수 없는 유형 ${q.type}`);
    }
  }
  return errors;
}

/** 과목마다 ID 순으로 앞 n개 (선택형·서술형 섞여 있으면 유형별로 고르게) */
export function pickFree(questions, n) {
  const bySubject = new Map();
  for (const q of [...questions].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (!bySubject.has(q.subject)) bySubject.set(q.subject, []);
    bySubject.get(q.subject).push(q);
  }
  const out = [];
  for (const list of bySubject.values()) {
    const types = [...new Set(list.map((q) => q.type))];
    const per = Math.ceil(n / types.length);
    for (const t of types) out.push(...list.filter((q) => q.type === t).slice(0, per));
  }
  return out;
}

function main() {
  const questions = JSON.parse(readFileSync(SRC, 'utf8'));
  const errors = validate(questions);
  if (errors.length) {
    console.error(`형식 오류 ${errors.length}건 — 파일을 만들지 않았습니다.`);
    errors.slice(0, 50).forEach((e) => console.error('  -', e));
    process.exit(1);
  }

  const free = pickFree(questions, FREE_PER_SUBJECT);
  const chunks = {};
  for (const q of questions) {
    const key = q.id.split('-')[0];
    (chunks[key] ||= []).push(q);
  }

  mkdirSync(join(ROOT, 'public', 'data'), { recursive: true });
  mkdirSync(join(ROOT, 'content', 'out'), { recursive: true });
  writeFileSync(join(ROOT, 'public', 'data', 'questions.free.json'), JSON.stringify(free, null, 1));
  writeFileSync(join(ROOT, 'content', 'out', 'questionChunks.json'), JSON.stringify(chunks));
  if (args['local-full']) writeFileSync(join(ROOT, 'public', 'data', 'questions.json'), JSON.stringify(questions, null, 1));

  console.log(`전체 ${questions.length}문항 검사 통과`);
  console.log(`무료 샘플 ${free.length}문항 → public/data/questions.free.json`);
  console.log(`업로드 묶음 ${Object.keys(chunks).length}개 → content/out/questionChunks.json`);
  if (args['local-full']) console.log('로컬 테스트용 전체 문항 → public/data/questions.json (배포 금지)');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
