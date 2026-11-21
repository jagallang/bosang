/**
 * 채점 규칙: 선택형 정답 판정, 서술형 키워드 채점, 모의고사 점수와 과락 판정.
 */
import { AVERAGE_PASS_SCORE, ESSAY_PASS_SCORE, SUBJECT_FAIL_SCORE } from './constants.js';

export const KeywordCheck = Object.freeze({ NONE: 'none', CHECKED: 'checked', UNSURE: 'unsure' });

/** 미체크 → 체크 → 확신 없음 → 미체크 */
export function nextKeywordCheck(state) {
  if (state === KeywordCheck.CHECKED) return KeywordCheck.UNSURE;
  if (state === KeywordCheck.UNSURE) return KeywordCheck.NONE;
  return KeywordCheck.CHECKED;
}

export const isCorrectChoice = (q, choice) => choice === q.a;

/** 체크한 키워드 가중치 합 / 전체 가중치 합 × 100. '확신 없음'은 점수에 넣지 않는다 */
export function essayScore(keywords = [], checks = {}) {
  let earned = 0, total = 0;
  keywords.forEach((kw, i) => {
    const w = kw.weight || 1;
    total += w;
    if (checks[i] === KeywordCheck.CHECKED) earned += w;
  });
  return total ? Math.round((earned / total) * 100) : 0;
}

export const essayPassed = (score) => score >= ESSAY_PASS_SCORE;

/** 100점 만점 환산. 문항 수가 100의 약수가 아니어도 만점이 100이 되게 반올림한다 */
export const examPoints = (correct, total) => (total ? Math.round((correct / total) * 100) : 0);

/**
 * 과목별 점수, 평균, 과락, 합격 판정.
 * 출제되지 않은 과목(문항 0)은 판정에서 뺀다. (예: 보상실무2 문항 준비 중)
 * @param {{subjects:string[], questions:object[], answers:Object<string,number>}} o
 */
export function passFail({ subjects, questions, answers }) {
  const per = new Map(subjects.map((s) => [s, { total: 0, correct: 0 }]));
  for (const q of questions) {
    if (!per.has(q.subject)) per.set(q.subject, { total: 0, correct: 0 });
    const d = per.get(q.subject);
    d.total++;
    if (isCorrectChoice(q, answers[q.id])) d.correct++;
  }
  const results = [...per.entries()]
    .filter(([, d]) => d.total > 0)
    .map(([subject, d]) => {
      const score = Math.round((d.correct / d.total) * 100);
      return { subject, score, total: d.total, correct: d.correct, failed: score < SUBJECT_FAIL_SCORE };
    });
  const avgScore = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  const anyFailed = results.some((r) => r.failed);
  return { results, avgScore, anyFailed, pass: avgScore >= AVERAGE_PASS_SCORE && !anyFailed };
}
