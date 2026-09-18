#!/usr/bin/env node
/**
 * 엄격한 병합 대상 탐지: 본문 + 선택지 집합 + 정답 모두 동일한 쌍만 추출
 * 수동 확인용 목록 출력
 */
const fs = require('fs');
const path = require('path');

const questions = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'all-questions.json'), 'utf8')
);

function normalize(text) {
  return text.replace(/\s+/g, '').replace(/[·…""''「」,.\-()\[\]]/g, '').toLowerCase();
}

function normalizeOpts(opts) {
  return opts.map(o => normalize(o)).join('||');
}

// 본문 + 선택지 + 정답 기준으로 그룹핑
const groups = {};
questions.forEach(q => {
  const key = normalize(q.q) + '###' + normalizeOpts(q.opt) + '###' + q.a;
  if (!groups[key]) groups[key] = [];
  groups[key].push(q);
});

const dupes = Object.values(groups).filter(g => g.length > 1);

console.log(`=== 엄격한 완전 중복 (본문+선택지+정답 동일) ===`);
console.log(`병합 대상 그룹: ${dupes.length}건\n`);

let totalRemovable = 0;

dupes.forEach((group, idx) => {
  console.log(`━━━ 그룹 ${idx + 1} (${group.length}문항 → 1문항으로 병합, ${group.length - 1}개 삭제) ━━━`);

  group.forEach(q => {
    const exLen = q.ex ? q.ex.length : 0;
    console.log(`  [${q.id}] 출처: ${q.o} | 과목: ${q.subject} | 해설 길이: ${exLen}자`);
  });

  // 해설이 더 긴 쪽 추천
  const best = group.reduce((a, b) => (a.ex || '').length >= (b.ex || '').length ? a : b);
  const others = group.filter(q => q.id !== best.id);

  console.log(`  ▶ 남길 문항: [${best.id}] (해설 ${best.ex.length}자)`);
  console.log(`  ▶ 삭제 대상: ${others.map(q => `[${q.id}]`).join(', ')}`);
  console.log(`  Q: ${group[0].q.substring(0, 100)}${group[0].q.length > 100 ? '...' : ''}`);
  console.log(`  정답: ${group[0].a + 1}번`);
  console.log();

  totalRemovable += group.length - 1;
});

console.log(`\n=== 요약 ===`);
console.log(`병합 가능: ${dupes.length}그룹, 삭제 가능: ${totalRemovable}문항`);
console.log(`병합 후 예상 문항 수: ${questions.length} → ${questions.length - totalRemovable}`);

// 병합 맵 출력 (다음 단계에서 사용)
const mergeMap = {};
dupes.forEach(group => {
  const best = group.reduce((a, b) => (a.ex || '').length >= (b.ex || '').length ? a : b);
  const others = group.filter(q => q.id !== best.id);
  mergeMap[best.id] = {
    keep: best.id,
    remove: others.map(q => q.id),
    sources: group.map(q => ({ id: q.id, origin: q.o }))
  };
});

fs.writeFileSync(
  path.join(__dirname, 'merge-map.json'),
  JSON.stringify(mergeMap, null, 2),
  'utf8'
);
console.log(`\n✓ merge-map.json 저장`);
