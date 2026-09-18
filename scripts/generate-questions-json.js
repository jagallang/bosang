#!/usr/bin/env node
/**
 * questions.json 생성:
 * - s1 삭제 (t2와 완전 중복, t2의 해설이 더 충실)
 * - 새 ID 체계: civ-001, rel-001, lca-001 (3자리 고정)
 * - source 필드 추가 (기존 출처 보존)
 * - article 필드 빈 값으로 생성
 * - 기존 ID → 새 ID 매핑 테이블 출력 (진도 마이그레이션용)
 */
const fs = require('fs');
const path = require('path');

const questions = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'all-questions.json'), 'utf8')
);

// 병합: s1 삭제, t2에 s1의 source 병합
const REMOVE_IDS = new Set(['s1']);
const MERGE_SOURCE = { 't2': [{ type: '기출', origin: '정선 1' }] };

const SUBJECT_CODE = {
  '민법': 'civ',
  '부동산관계법규': 'rel',
  '토지보상법규': 'lca'
};

// 과목별 카운터
const counters = { civ: 0, rel: 0, lca: 0 };

// 기존 ID → 새 ID 매핑
const idMap = {};

const output = [];

questions.forEach(q => {
  if (REMOVE_IDS.has(q.id)) return; // 병합으로 삭제

  const code = SUBJECT_CODE[q.subject];
  counters[code]++;
  const newId = `${code}-${String(counters[code]).padStart(3, '0')}`;

  idMap[q.id] = newId;

  // source 파싱: 기존 o 필드에서 출처 정보 추출
  const sources = parseSource(q.o, q.id);

  // 병합된 문항의 추가 source
  if (MERGE_SOURCE[q.id]) {
    MERGE_SOURCE[q.id].forEach(s => sources.push(s));
  }

  const entry = {
    id: newId,
    q: q.q,
    opt: q.opt,
    a: q.a,
    ex: q.ex,
    subject: q.subject,
    article: null, // 추후 수동 입력
    source: sources,
    revised: null  // 추후 검토일 입력
  };

  // diff 필드가 있으면 보존
  if (q.diff) entry.diff = q.diff;

  output.push(entry);
});

function parseSource(origin, id) {
  const sources = [];

  if (typeof origin === 'number') {
    // 순수 숫자: 기출 문항번호
    sources.push({ type: '기출', year: 2022, no: origin });
  } else if (/^2018\s+\d+$/.test(String(origin))) {
    const no = parseInt(String(origin).replace('2018', '').trim());
    sources.push({ type: '기출', year: 2018, no });
  } else if (/^정선\s*\d+$/.test(String(origin))) {
    const no = parseInt(String(origin).replace('정선', '').trim());
    sources.push({ type: '정선', no });
  } else if (origin === '교재') {
    sources.push({ type: '교재' });
  } else {
    sources.push({ type: 'unknown', raw: String(origin) });
  }

  return sources;
}

// 저장
fs.writeFileSync(
  path.join(__dirname, '..', 'questions.json'),
  JSON.stringify(output, null, 2),
  'utf8'
);

fs.writeFileSync(
  path.join(__dirname, 'id-migration-map.json'),
  JSON.stringify(idMap, null, 2),
  'utf8'
);

// 통계
console.log('=== questions.json 생성 완료 ===');
console.log(`총 문항: ${output.length} (265 - 1 병합 = 264)`);
console.log();
console.log('과목별 분포:');
Object.entries(SUBJECT_CODE).forEach(([subject, code]) => {
  const count = output.filter(q => q.subject === subject).length;
  console.log(`  ${subject} (${code}): ${count}문항 [${code}-001 ~ ${code}-${String(counters[code]).padStart(3, '0')}]`);
});

console.log();
console.log('난이도별 분포:');
const diffLabels = { 1: '기초', 2: '표준', 3: '심화', undefined: '미지정(표준 기본값)' };
const diffCounts = {};
output.forEach(q => {
  const d = q.diff || '미지정';
  diffCounts[d] = (diffCounts[d] || 0) + 1;
});
Object.entries(diffCounts).forEach(([d, n]) => {
  console.log(`  ${diffLabels[d] || d}: ${n}문항`);
});

console.log();
console.log('출처별 분포:');
const srcTypes = {};
output.forEach(q => {
  q.source.forEach(s => {
    const key = s.type + (s.year ? ` ${s.year}` : '');
    srcTypes[key] = (srcTypes[key] || 0) + 1;
  });
});
Object.entries(srcTypes).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => {
  console.log(`  ${t}: ${n}건`);
});

console.log();
console.log('✓ questions.json 저장 (프로젝트 루트)');
console.log('✓ id-migration-map.json 저장 (scripts/)');
console.log();
console.log('=== ID 매핑 샘플 (처음 10개) ===');
Object.entries(idMap).slice(0, 10).forEach(([old, newId]) => {
  console.log(`  ${old} → ${newId}`);
});
