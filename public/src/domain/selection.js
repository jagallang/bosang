/**
 * 학습 세션에 낼 문항을 고르는 규칙. 난수(rng)는 밖에서 받아 테스트할 수 있게 한다.
 */
import { MAX_BOX, QUEUE_PRACTICE, QUEUE_REVIEW } from './constants.js';
import { difficultyOf, isMcq } from './question.js';
import { boxOf, dueQuestions, weakQuestions } from './progress.js';

export const SessionMode = Object.freeze({
  REVIEW: 'review',
  WEAK: 'weak',
  PRACTICE: 'practice',
  TYPE: 'type',
  EXAM: 'exam',
  WRONG: 'wrong',
});

export function shuffle(list, rng = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 상자가 낮을수록(약할수록) 잘 뽑히는 비복원 가중 추출 */
export function weightedPick(questions, n, sp, rng = Math.random) {
  const items = questions.map((q) => ({ q, w: MAX_BOX + 1 - boxOf(sp, q.id) }));
  const out = [];
  for (let k = 0; k < n && items.length; k++) {
    const total = items.reduce((s, i) => s + i.w, 0);
    const r = rng() * total;
    let acc = 0, pick = items.length - 1;
    for (let i = 0; i < items.length; i++) {
      acc += items[i].w;
      if (r <= acc) { pick = i; break; }
    }
    out.push(items[pick].q);
    items.splice(pick, 1);
  }
  return out;
}

export const filterDifficulty = (questions, diff) => (diff ? questions.filter((q) => difficultyOf(q) === diff) : questions);

/**
 * 학습 큐를 만든다.
 * @param {object} o
 * @param {string} o.mode SessionMode
 * @param {object[]} o.questions 현재 단계의 문항(과목·유형 필터 전)
 * @param {object} o.sp 단계 진도
 * @param {number} o.today
 * @param {boolean} [o.random] 랜덤 모드: 섞기만 한다. 아니면 약한 문항 가중 추출
 * @param {string} [o.subject] PRACTICE 모드의 과목 ('전체' 가능)
 * @param {string} [o.type] TYPE 모드의 유형 (mcq|essay|all)
 * @param {number} [o.difficulty] 0이면 전체
 * @returns {object[]} 문항 배열
 */
export function buildQueue({ mode, questions, sp, today, random = false, subject, type, difficulty = 0, rng = Math.random }) {
  const pickOrShuffle = (pool, limit) => {
    const n = Math.min(limit, pool.length);
    return random ? shuffle(pool, rng).slice(0, n) : weightedPick(pool, n, sp, rng);
  };
  switch (mode) {
    case SessionMode.REVIEW: {
      let pool = filterDifficulty(dueQuestions(sp, questions, today), difficulty);
      pool = random ? shuffle(pool, rng) : pool.slice().sort((a, b) => boxOf(sp, a.id) - boxOf(sp, b.id));
      return pool.slice(0, QUEUE_REVIEW);
    }
    case SessionMode.WEAK:
      return pickOrShuffle(filterDifficulty(weakQuestions(sp, questions), difficulty), QUEUE_REVIEW);
    case SessionMode.PRACTICE: {
      const pool = subject && subject !== '전체' ? questions.filter((q) => q.subject === subject) : questions;
      return pickOrShuffle(filterDifficulty(pool, difficulty), QUEUE_PRACTICE);
    }
    case SessionMode.TYPE: {
      const pool = type && type !== 'all' ? questions.filter((q) => q.type === type) : questions;
      return pickOrShuffle(pool, QUEUE_PRACTICE);
    }
    default:
      return [];
  }
}

/**
 * 과목 균등 모의고사. 선택형(mcq)만 낸다.
 * 25문항·3과목이면 9+8+8. 문항이 부족한 과목은 있는 만큼만 내고 insufficient=true.
 * 문항이 하나도 없는 과목은 몫을 나누지 않는다.
 */
export function buildBalancedExam({ subjects, questions, size, difficulty = 0, rng = Math.random }) {
  const pools = subjects
    .map((s) => ({ s, pool: filterDifficulty(questions.filter((q) => q.subject === s && isMcq(q)), difficulty) }))
    .filter((x) => x.pool.length > 0);
  if (!pools.length) return { questions: [], insufficient: false };
  const base = Math.floor(size / pools.length);
  const remainder = size % pools.length;
  let insufficient = pools.length < subjects.length;
  const picked = [];
  pools.forEach(({ pool }, i) => {
    const want = base + (i < remainder ? 1 : 0);
    const take = Math.min(want, pool.length);
    if (take < want) insufficient = true;
    picked.push(...shuffle(pool, rng).slice(0, take));
  });
  return { questions: shuffle(picked, rng), insufficient };
}
