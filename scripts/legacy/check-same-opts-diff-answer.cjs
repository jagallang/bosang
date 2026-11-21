#!/usr/bin/env node
/**
 * 본문+선택지 동일하지만 정답이 다른 문항 탐지 (오류 가능성)
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

// 본문 + 선택지 기준으로 그룹핑 (정답 제외)
const groups = {};
questions.forEach(q => {
  const key = normalize(q.q) + '###' + normalizeOpts(q.opt);
  if (!groups[key]) groups[key] = [];
  groups[key].push(q);
});

const suspicious = Object.values(groups).filter(g => {
  if (g.length < 2) return false;
  const answers = new Set(g.map(q => q.a));
  return answers.size > 1; // 같은 본문+선택지인데 정답이 다른 경우
});

if (suspicious.length === 0) {
  console.log('✓ 본문+선택지가 같은데 정답이 다른 문항은 없습니다.');
} else {
  console.log(`⚠️ 본문+선택지가 같은데 정답이 다른 문항: ${suspicious.length}건\n`);
  suspicious.forEach((group, idx) => {
    console.log(`━━━ 의심 ${idx + 1} ━━━`);
    group.forEach(q => {
      console.log(`  [${q.id}] 정답: ${q.a + 1}번 | 출처: ${q.o}`);
    });
    console.log(`  Q: ${group[0].q.substring(0, 80)}...`);
    console.log();
  });
}
