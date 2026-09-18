#!/usr/bin/env node
/**
 * 1단계: 기존 BANK 데이터에서 전체 문항 추출 + 중복 탐지
 *
 * 실행: node scripts/extract-and-detect-dupes.js
 * 출력:
 *   - scripts/all-questions.json (전체 문항 원본 덤프)
 *   - scripts/duplicates-report.txt (중복 탐지 결과)
 */

const fs = require('fs');
const path = require('path');

// index.html에서 스크립트 부분만 추출해서 BANK 데이터 로드
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// <script> 태그 내부의 JS만 추출
const scriptBlocks = [];
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  scriptBlocks.push(match[1]);
}

// 첫 번째 스크립트 블록이 문제 은행 (BANK ~ BANK5 + push)
// const → var 변환하여 eval에서 접근 가능하게
const bankScript = scriptBlocks[0].replace(/\bconst\b/g, 'var');

// eval로 BANK 데이터 로드 (안전: 로컬 하드코딩 데이터만 포함)
eval(bankScript);

console.log(`총 문항 수: ${BANK.length}`);
console.log(`- 원본 BANK (1차 시험 기출): 75문항 중 push 전 25+25+25 = 75`);

// 과목별 통계
const subjects = {};
BANK.forEach(q => {
  if (!subjects[q.subject]) subjects[q.subject] = [];
  subjects[q.subject].push(q);
});
console.log('\n=== 과목별 문항 수 ===');
Object.entries(subjects).forEach(([s, qs]) => {
  console.log(`  ${s}: ${qs.length}문항`);
});

// 전체 문항 JSON 덤프
fs.writeFileSync(
  path.join(__dirname, 'all-questions.json'),
  JSON.stringify(BANK, null, 2),
  'utf8'
);
console.log(`\n✓ all-questions.json 저장 (${BANK.length}문항)`);

// === 중복 탐지 ===
// 방법: 문제 본문(q)을 정규화 후 유사도 비교
function normalize(text) {
  return text
    .replace(/\s+/g, '')        // 공백 제거
    .replace(/[·…""''「」]/g, '') // 특수문자 제거
    .replace(/[,.\-()]/g, '')    // 구두점 제거
    .toLowerCase();
}

// 정확한 일치 + 부분 일치 탐지
const groups = [];        // 중복 그룹
const matched = new Set(); // 이미 매칭된 ID

// 1단계: 정규화된 본문 완전 일치
const normMap = {};
BANK.forEach(q => {
  const n = normalize(q.q);
  if (!normMap[n]) normMap[n] = [];
  normMap[n].push(q);
});

const exactDupes = Object.values(normMap).filter(g => g.length > 1);
exactDupes.forEach(group => {
  groups.push({ type: 'exact', items: group });
  group.forEach(q => matched.add(q.id));
});

// 2단계: 자카드 유사도 기반 부분 일치 (n-gram)
function ngrams(text, n = 3) {
  const normalized = normalize(text);
  const set = new Set();
  for (let i = 0; i <= normalized.length - n; i++) {
    set.add(normalized.substring(i, i + n));
  }
  return set;
}

function jaccard(setA, setB) {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// 미매칭 문항들 사이 유사도 검사
const unmatched = BANK.filter(q => !matched.has(q.id));
const THRESHOLD = 0.6; // 60% 이상 유사하면 후보

for (let i = 0; i < BANK.length; i++) {
  if (matched.has(BANK[i].id)) continue;
  const ngramsI = ngrams(BANK[i].q);
  const similar = [];

  for (let j = i + 1; j < BANK.length; j++) {
    if (matched.has(BANK[j].id)) continue;
    // 같은 과목 내에서만 비교
    if (BANK[i].subject !== BANK[j].subject) continue;

    const ngramsJ = ngrams(BANK[j].q);
    const sim = jaccard(ngramsI, ngramsJ);

    if (sim >= THRESHOLD) {
      similar.push({ q: BANK[j], sim });
    }
  }

  if (similar.length > 0) {
    const group = [BANK[i], ...similar.map(s => s.q)];
    groups.push({
      type: 'similar',
      similarity: similar.map(s => Math.round(s.sim * 100) + '%'),
      items: group
    });
    group.forEach(q => matched.add(q.id));
  }
}

// 리포트 생성
let report = `=== 중복 탐지 결과 ===\n`;
report += `총 문항: ${BANK.length}\n`;
report += `중복 그룹: ${groups.length}건\n`;
report += `중복에 포함된 문항: ${[...matched].length}개\n`;
report += `고유 문항 (중복 없음): ${BANK.length - [...matched].length}개\n\n`;

groups.forEach((g, idx) => {
  report += `━━━ 그룹 ${idx + 1} (${g.type}${g.similarity ? ', 유사도: ' + g.similarity.join('/') : ''}) ━━━\n`;
  g.items.forEach(q => {
    report += `  [${q.id}] ${q.subject} / 출처: ${q.o}\n`;
    report += `  Q: ${q.q.substring(0, 80)}${q.q.length > 80 ? '...' : ''}\n`;
    report += `  정답: ${q.a + 1}번\n\n`;
  });
});

// 정답 불일치 경고 (같은 그룹 내에서 정답이 다른 경우)
report += `\n=== 주의: 정답 불일치 그룹 ===\n`;
let mismatchCount = 0;
groups.forEach((g, idx) => {
  const answers = new Set(g.items.map(q => q.a));
  if (answers.size > 1) {
    mismatchCount++;
    report += `⚠️ 그룹 ${idx + 1}: 정답이 다릅니다!\n`;
    g.items.forEach(q => {
      report += `  [${q.id}] 정답 ${q.a + 1}번 — ${q.q.substring(0, 50)}...\n`;
    });
    report += `\n`;
  }
});
if (mismatchCount === 0) {
  report += `(없음 — 모든 중복 그룹의 정답이 일치합니다)\n`;
}

// ID 체계 분석
report += `\n=== 기존 ID 체계 분석 ===\n`;
const idPatterns = {};
BANK.forEach(q => {
  const prefix = q.id.replace(/\d+$/, '');
  if (!idPatterns[prefix]) idPatterns[prefix] = [];
  idPatterns[prefix].push(q.id);
});
Object.entries(idPatterns).sort((a, b) => b[1].length - a[1].length).forEach(([prefix, ids]) => {
  report += `  ${prefix}*: ${ids.length}문항 (${ids.slice(0, 5).join(', ')}${ids.length > 5 ? '...' : ''})\n`;
});

fs.writeFileSync(path.join(__dirname, 'duplicates-report.txt'), report, 'utf8');
console.log(`\n✓ duplicates-report.txt 저장`);
console.log(`\n${report}`);
