/**
 * 학습 세션 엔티티: 문항 큐, 현재 위치, 답, 세션 통계, 서술형 문항별 진행 상태.
 */
import { KeywordCheck, nextKeywordCheck } from './grading.js';

export const EssayPhase = Object.freeze({ SHEET: 'sheet', REVEALED: 'revealed', GRADED: 'graded' });

export class StudySession {
  /**
   * @param {object} o
   * @param {string[]} o.queue 문항 ID 배열
   * @param {string} o.mode SessionMode
   * @param {string|null} [o.subject]
   * @param {string|null} [o.type]
   * @param {boolean} [o.examMode]
   * @param {boolean} [o.insufficient] 모의고사 문항 부족 안내
   */
  constructor({ queue, mode, subject = null, type = null, examMode = false, insufficient = false }) {
    if (!queue || !queue.length) throw new Error('빈 세션은 만들 수 없습니다.');
    this.queue = queue.slice();
    this.mode = mode;
    this.subject = subject;
    this.type = type;
    this.examMode = examMode;
    this.insufficient = insufficient;
    this.idx = 0;
    /** @type {Object<string, number>} 선택형 답 (0-based) 또는 서술형 점수 */
    this.answers = {};
    this.correctCount = 0;
    this.levelUp = 0;
    this.levelDown = 0;
    /** 서술형 문항별 상태. 문항이 바뀌면 힌트·체크가 섞이지 않는다 */
    this._essay = new Map();
    this.finished = false;
  }

  get currentId() { return this.queue[this.idx]; }
  get total() { return this.queue.length; }
  get position() { return this.idx + 1; }
  get isLast() { return this.idx + 1 >= this.queue.length; }
  get progressPct() { return Math.round((this.position / this.total) * 100); }

  answerOf(id = this.currentId) { return this.answers[id]; }
  isAnswered(id = this.currentId) { return this.answers[id] !== undefined; }

  setAnswer(value, id = this.currentId) { this.answers[id] = value; }

  /** @returns {boolean} 다음 문항으로 갔으면 true, 마지막이면 false */
  advance() {
    if (this.isLast) return false;
    this.idx++;
    return true;
  }

  back() {
    if (this.idx > 0) this.idx--;
  }

  /** 상자 변화와 정오를 세션 통계에 반영 */
  recordOutcome(ok, { before, after }) {
    if (ok) {
      this.correctCount++;
      if (after > before) this.levelUp++;
    } else if (after < before) {
      this.levelDown++;
    }
  }

  get accuracyPct() { return Math.round((this.correctCount / this.total) * 100); }

  // ---- 서술형 ----
  essay(id = this.currentId) {
    if (!this._essay.has(id)) this._essay.set(id, { phase: EssayPhase.SHEET, hints: new Set(), checks: {} });
    return this._essay.get(id);
  }

  revealHint(i) { this.essay().hints.add(i); }

  revealModelAnswer() {
    const e = this.essay();
    e.phase = EssayPhase.REVEALED;
    e.checks = {};
  }

  toggleKeyword(i) {
    const e = this.essay();
    e.checks[i] = nextKeywordCheck(e.checks[i] || KeywordCheck.NONE);
  }

  setEssayScore(score) {
    this.essay().phase = EssayPhase.GRADED;
    this.setAnswer(score);
  }
}
