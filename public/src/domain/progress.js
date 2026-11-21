/**
 * 학습 진도와 Leitner 간격 반복 규칙.
 * 모든 함수는 순수 함수이거나, 넘겨받은 진도 객체만 바꾼다. 날짜(today)는 밖에서 받는다.
 *
 * 진도 구조 (v5):
 * { version: 5, "1": StageProgress, "2": StageProgress }
 * StageProgress = { cards: { [id]: Card }, totalAnswered, totalCorrect, studyDays: number[], exams: ExamRecord[] }
 * ExamRecord = { day, n, avg, pass, subjects: { [과목]: 점수 } }   // 최근 MAX_EXAM_RECORDS개
 * Card = { box 0~5, seen, correct, wrong, lastDay, dueDay }   // day = Unix 일수
 */
import { BOX_INTERVALS, MAX_BOX, STAGE_IDS } from './constants.js';
import { stageOf } from './question.js';

export const PROGRESS_VERSION = 5;
export const dayNumber = (ms) => Math.floor(ms / 86400000);

export const blankCard = () => ({ box: 0, seen: 0, correct: 0, wrong: 0, lastDay: null, dueDay: 0 });

export function blankStageProgress(questions = []) {
  const cards = {};
  for (const q of questions) cards[q.id] = blankCard();
  return { cards, totalAnswered: 0, totalCorrect: 0, studyDays: [], exams: [] };
}

export function blankProgress(bank) {
  const p = { version: PROGRESS_VERSION };
  for (const s of STAGE_IDS) p[s] = blankStageProgress(bank ? bank.stage(s) : []);
  return p;
}

/** 문제은행에 새로 생긴 문항의 카드를 채운다 */
export function ensureCards(progress, bank) {
  for (const q of bank.all) {
    const s = stageOf(q);
    if (!progress[s]) progress[s] = blankStageProgress([]);
    if (!progress[s].cards[q.id]) progress[s].cards[q.id] = blankCard();
  }
  return progress;
}

export const cardOf = (sp, id) => sp.cards[id] || null;
export const boxOf = (sp, id) => sp.cards[id]?.box || 0;

/**
 * 정답/오답을 반영한다. 정답이면 상자 +1(최대 5), 오답이면 상자 1로.
 * @returns {{before:number, after:number}}
 */
export function applyResult(sp, id, ok, today) {
  const c = sp.cards[id];
  if (!c) return { before: 0, after: 0 };
  const before = c.box || 0;
  c.seen++;
  sp.totalAnswered++;
  if (ok) {
    c.correct++;
    sp.totalCorrect++;
    c.box = Math.min(MAX_BOX, before + 1);
  } else {
    c.wrong++;
    c.box = 1;
  }
  c.lastDay = today;
  c.dueDay = today + BOX_INTERVALS[Math.max(0, c.box - 1)];
  return { before, after: c.box };
}

export function markStudied(sp, today) {
  if (!sp.studyDays.includes(today)) sp.studyDays.push(today);
}

export const MAX_EXAM_RECORDS = 30;

/** 모의고사 결과(passFail)를 기록한다. 오래된 것부터 버린다 */
export function recordExam(sp, result, today) {
  if (!Array.isArray(sp.exams)) sp.exams = [];
  const subjects = Object.fromEntries(result.results.map((r) => [r.subject, r.score]));
  const n = result.results.reduce((a, r) => a + r.total, 0);
  const rec = { day: today, n, avg: result.avgScore, pass: result.pass, subjects };
  sp.exams.push(rec);
  if (sp.exams.length > MAX_EXAM_RECORDS) sp.exams.splice(0, sp.exams.length - MAX_EXAM_RECORDS);
  return rec;
}

/** 모의고사 요약: 횟수, 최근·최고 평균, 최근 n개(최신순) */
export function examSummary(sp, recent = 5) {
  const ex = Array.isArray(sp.exams) ? sp.exams : [];
  if (!ex.length) return { count: 0, last: null, best: null, recent: [] };
  const last = ex[ex.length - 1];
  const best = ex.reduce((a, b) => (b.avg > a.avg ? b : a));
  return { count: ex.length, last, best, recent: ex.slice(-recent).reverse() };
}

/** 오늘 또는 어제까지 이어진 연속 학습 일수 */
export function currentStreak(sp, today) {
  const days = new Set(sp.studyDays);
  if (!days.size || (!days.has(today) && !days.has(today - 1))) return 0;
  let d = days.has(today) ? today : today - 1;
  let n = 0;
  while (days.has(d)) { n++; d--; }
  return n;
}

export const accuracyPct = (sp) => (sp.totalAnswered ? Math.round((sp.totalCorrect / sp.totalAnswered) * 100) : 0);

/** 숙련도 = 상자 합 / (문항 수 × 5) */
export function masteryOf(sp, questions) {
  if (!questions.length) return { pct: 0, n: 0, mastered: 0, seen: 0 };
  let sum = 0, mastered = 0, seen = 0;
  for (const q of questions) {
    const c = sp.cards[q.id];
    const box = c?.box || 0;
    sum += box;
    if (box >= MAX_BOX) mastered++;
    if ((c?.seen || 0) > 0) seen++;
  }
  return { pct: Math.round((sum / (questions.length * MAX_BOX)) * 100), n: questions.length, mastered, seen };
}

export const isDue = (card, today) => !card || card.seen === 0 || card.dueDay <= today;

export const dueQuestions = (sp, questions, today) => questions.filter((q) => isDue(sp.cards[q.id], today));

/** 취약: 미학습·상자 2 이하·오답이 정답 이상 */
export const weakQuestions = (sp, questions) =>
  questions.filter((q) => {
    const c = sp.cards[q.id];
    return !c || c.box <= 2 || (c.wrong > 0 && c.wrong >= c.correct);
  });

/** 메뉴 배지용: 아직 오답이 정답 이상인 문항 */
export const unresolvedWrongQuestions = (sp, questions) =>
  questions.filter((q) => {
    const c = sp.cards[q.id];
    return c && c.wrong > 0 && c.wrong >= c.correct;
  });

/** 오답노트: 한 번이라도 틀린 문항, (오답-정답)이 큰 순 */
export function wrongNoteQuestions(sp, questions) {
  return questions
    .filter((q) => (sp.cards[q.id]?.wrong || 0) > 0)
    .sort((a, b) => {
      const ca = sp.cards[a.id], cb = sp.cards[b.id];
      return (cb.wrong - cb.correct) - (ca.wrong - ca.correct);
    });
}
