#!/usr/bin/env node
/**
 * index.html 변환: 인라인 BANK 데이터 제거 → questions.json 로드 방식으로
 * + 이전 코드 리뷰 수정사항 포함:
 *   - BANK3.forEach(q=>q.o=q.o) 제거
 *   - window.storage dead code 제거
 *   - BANK.find() → BANK_MAP 최적화
 *   - toggleRandom() 이벤트 정리
 * + 진도 데이터 마이그레이션 (old ID → new ID)
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const idMap = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'id-migration-map.json'), 'utf8')
);

// s1 → t2의 새 ID로 매핑 (s1은 병합 삭제됨)
const t2NewId = idMap['t2'];
idMap['s1'] = t2NewId;

// ID 매핑을 한 줄 JSON으로
const idMapJson = JSON.stringify(idMap);

// === 1단계: 첫 번째 <script> 블록 (BANK 데이터) 교체 ===
// 패턴: <script> ... QUESTION BANK ... </script> 을 찾아서 로더로 교체

const bankScriptStart = html.indexOf('<script>\n/* ====');
const bankScriptEnd = html.indexOf('</script>', bankScriptStart) + '</script>'.length;

const bankLoader = `<script>
/* ============================== QUESTION BANK (questions.json) ============================== */
let BANK = [];
async function loadQuestions() {
  const resp = await fetch('questions.json');
  BANK = await resp.json();
}
</script>`;

let result = html.substring(0, bankScriptStart) + bankLoader + html.substring(bankScriptEnd);

// === 2단계: ENGINE 스크립트 수정 ===

// 2a. BANK_MAP 생성 시점을 부트 이후로 이동 (BANK이 비어있으므로)
// 기존: const BANK_MAP = Object.fromEntries(BANK.map(q=>[q.id,q]));
// 이 줄이 있으면 제거 (아직 없을 수도 있음 — 이전 수정이 stash에 있었으므로)
result = result.replace(
  /const BANK_MAP = Object\.fromEntries\(BANK\.map\(q=>\[q\.id,q\]\)\);\n?/g,
  ''
);

// 2b. BANK.find() → BANK_MAP[id] 로 교체
result = result.replace(/BANK\.find\(x=>x\.id===id\)/g, 'BANK_MAP[id]');

// 2c. BANK3.forEach(q=>q.o=q.o); 제거 (만약 아직 있으면)
result = result.replace(/BANK3\.forEach\(q=>q\.o=q\.o\);\n?/g, '');

// 2d. window.storage dead code 제거
result = result.replace(
  /const store = \{[\s\S]*?\};/,
  (match) => {
    // store 전체를 간소화
    return `const store = {
  async get(k){
    try{ const v=localStorage.getItem(k); if(v!=null) return JSON.parse(v); }catch(e){}
    return mem[k]||null;
  },
  async set(k,v){
    mem[k]=v;
    try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){}
  }
};`;
  }
);

// 2e. toggleRandom 이벤트 정리
result = result.replace(
  'onchange="toggleRandom()"',
  'onclick="event.stopPropagation();toggleRandom()"'
);

// === 3단계: 부트 시퀀스 수정 ===
// 기존: (async()=>{ await loadProgress(); render(); })();
// 새: questions.json 로드 → ID 마이그레이션 → BANK_MAP 생성 → loadProgress → render

const oldBoot = `/* -------- boot -------- */
(async()=>{ await loadProgress(); render(); })();`;

const newBoot = `/* -------- boot -------- */
let BANK_MAP = {};
const ID_MIGRATION = ${idMapJson};

function migrateProgress(data) {
  if (!data || !data.cards) return data;
  const hasOldIds = Object.keys(data.cards).some(k => !k.match(/^(civ|rel|lca)-\\d{3}$/));
  if (!hasOldIds) return data; // 이미 마이그레이션 됨
  const newCards = {};
  Object.entries(data.cards).forEach(([oldId, card]) => {
    const newId = ID_MIGRATION[oldId];
    if (newId) newCards[newId] = card;
    // 매핑 없는 ID는 삭제 (병합됨)
  });
  data.cards = newCards;
  data.version = 4; // 마이그레이션 완료 표시
  return data;
}

(async()=>{
  await loadQuestions();
  BANK_MAP = Object.fromEntries(BANK.map(q=>[q.id,q]));
  await loadProgress();
  // 진도 마이그레이션
  if (P && P.version < 4) {
    P = migrateProgress(P);
    // 새 문항 ID가 없으면 추가
    BANK.forEach(q=>{ if(!P.cards[q.id]) P.cards[q.id]={box:0,seen:0,correct:0,wrong:0,lastDay:null,dueDay:0}; });
    await saveProgress();
  }
  render();
})();`;

result = result.replace(oldBoot, newBoot);

// === 4단계: STORE_KEY 버전 올리기 (v3 → v4는 안 함, 호환성 유지) ===
// 기존 키를 유지해야 마이그레이션이 동작함

// === 5단계: blankProgress 버전 업데이트 ===
result = result.replace(
  'return {cards, totalAnswered:0, totalCorrect:0, studyDays:[], version:3};',
  'return {cards, totalAnswered:0, totalCorrect:0, studyDays:[], version:4};'
);

// === 검증 ===
// BANK 데이터가 여전히 인라인으로 남아있는지 확인
if (result.includes('const BANK = [')) {
  console.error('ERROR: 인라인 BANK 데이터가 아직 남아있습니다!');
  process.exit(1);
}
if (result.includes('const BANK2 = [')) {
  console.error('ERROR: 인라인 BANK2 데이터가 아직 남아있습니다!');
  process.exit(1);
}

// 결과 저장
fs.writeFileSync(path.join(__dirname, '..', 'index.html'), result, 'utf8');

const oldLines = html.split('\n').length;
const newLines = result.split('\n').length;
console.log(`✓ index.html 변환 완료`);
console.log(`  이전: ${oldLines}줄`);
console.log(`  이후: ${newLines}줄`);
console.log(`  제거: ${oldLines - newLines}줄 (인라인 문제 데이터)`);
