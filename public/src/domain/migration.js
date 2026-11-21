/**
 * 저장된 진도를 현재 형식(v5)으로 바꾼다.
 * v3: 평면 cards (옛 ID: m1, t2, s3 …) → v4: 새 ID (civ-001 …) → v5: 단계별 분리
 */
import { LEGACY_ID_MAP } from './legacyIdMap.js';
import { PROGRESS_VERSION, blankProgress, blankStageProgress, ensureCards } from './progress.js';

const CURRENT_ID = /^(civ|rel|lca|prc[12])-\d{3}$/;

export function migrateLegacyIds(data) {
  if (!data || !data.cards) return data;
  if (!Object.keys(data.cards).some((k) => !CURRENT_ID.test(k))) return data;
  const cards = {};
  for (const [oldId, card] of Object.entries(data.cards)) {
    const id = LEGACY_ID_MAP[oldId] || (CURRENT_ID.test(oldId) ? oldId : null);
    if (id) cards[id] = card;
  }
  return { ...data, cards, version: 4 };
}

function migrateFlatToV5(data) {
  const d = migrateLegacyIds(data);
  return {
    version: PROGRESS_VERSION,
    '1': {
      cards: d.cards || {},
      totalAnswered: d.totalAnswered || 0,
      totalCorrect: d.totalCorrect || 0,
      studyDays: Array.isArray(d.studyDays) ? d.studyDays : [],
    },
    '2': blankStageProgress([]),
  };
}

const validStage = (s) => s && typeof s.cards === 'object' && s.cards !== null;

/**
 * 어떤 버전의 저장 데이터든 v5로 정규화하고, 새 문항 카드를 채운다.
 * @param {object|null} saved 저장소에서 읽은 값
 * @param {import('./question.js').QuestionBank} bank
 */
export function normalizeProgress(saved, bank) {
  let p;
  if (saved && saved.version >= PROGRESS_VERSION && saved['1'] && saved['2']) {
    p = { ...saved };
    for (const s of ['1', '2']) {
      if (!validStage(p[s])) p[s] = blankStageProgress([]);
      if (!Array.isArray(p[s].studyDays)) p[s].studyDays = [];
      if (!Array.isArray(p[s].exams)) p[s].exams = [];
      p[s].totalAnswered ||= 0;
      p[s].totalCorrect ||= 0;
    }
  } else if (saved && (saved.cards || saved.version)) {
    p = migrateFlatToV5(saved);
  } else {
    p = blankProgress(bank);
  }
  return ensureCards(p, bank);
}
