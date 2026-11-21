import { DEFAULT_DIFF, STAGES } from './constants.js';

export const QuestionType = Object.freeze({ MCQ: 'mcq', ESSAY: 'essay', FILL: 'fill' });

export const stageOf = (q) => String(q.stage || 1);
export const difficultyOf = (q) => q.diff || DEFAULT_DIFF;
export const isMcq = (q) => q.type === QuestionType.MCQ;
export const isEssay = (q) => q.type === QuestionType.ESSAY;

/** 문항 카드에 보이는 출처 표기: "기출 2022 3번" 또는 "정선" */
export function sourceLabel(q) {
  const s = q.source && q.source[0];
  if (!s) return '';
  // 시행기관이 기출을 공개하지 않으므로 회차·번호는 드러내지 않고 출제 연도 유형으로만 표시한다
  if (s.year) return `${s.year}년 출제 유형`;
  return s.type === '기출' ? '출제 유형' : s.type || '';
}

export function sourceYearLabel(q) {
  const s = q.source && q.source[0];
  return s && s.year ? `${s.year}년` : '';
}

/**
 * 문제은행. 문항 배열을 감싸 ID·단계·과목별 조회를 제공한다.
 * 문항 객체는 읽기 전용으로 다룬다.
 */
export class QuestionBank {
  constructor(questions = []) {
    this.all = Object.freeze([...questions]);
    this._byId = new Map(this.all.map((q) => [q.id, q]));
    this._byStage = new Map();
    for (const q of this.all) {
      const s = stageOf(q);
      if (!this._byStage.has(s)) this._byStage.set(s, []);
      this._byStage.get(s).push(q);
    }
  }

  get size() { return this.all.length; }
  get(id) { return this._byId.get(id) || null; }
  has(id) { return this._byId.has(id); }

  stage(stageId) { return this._byStage.get(String(stageId)) || []; }

  subjects(stageId) { return STAGES[String(stageId)]?.subjects || []; }

  bySubject(stageId, subject) {
    const list = this.stage(stageId);
    return subject && subject !== '전체' ? list.filter((q) => q.subject === subject) : list;
  }

  byType(stageId, type) {
    const list = this.stage(stageId);
    return type && type !== 'all' ? list.filter((q) => q.type === type) : list;
  }

  hasType(stageId, type) { return this.stage(stageId).some((q) => q.type === type); }

  /** 같은 ID는 뒤에 온 문항이 이긴다 (무료 샘플 → 유료 전체 순으로 합칠 때 사용) */
  static merge(...lists) {
    const map = new Map();
    for (const list of lists) for (const q of list || []) map.set(q.id, q);
    return new QuestionBank([...map.values()].sort(compareId));
  }
}

/** civ-001, civ-002 … 과목 접두어, 일련번호 순 */
export function compareId(a, b) {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
