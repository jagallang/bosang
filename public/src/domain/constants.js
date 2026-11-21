/**
 * 시험 규칙과 학습 알고리즘 상수.
 * 도메인 계층: DOM·저장소·네트워크를 모른다.
 */

export const STAGES = Object.freeze({
  '1': Object.freeze({ subjects: ['민법', '부동산관계법규', '토지보상법규'], label: '1차 시험', examSize: 25 }),
  '2': Object.freeze({ subjects: ['보상실무1', '보상실무2'], label: '2차 시험', examSize: 20 }),
});
export const STAGE_IDS = Object.freeze(['1', '2']);
export const DEFAULT_STAGE = '1';

export const SUBJECT_COLOR = Object.freeze({
  민법: '#3A5BA0',
  부동산관계법규: '#8A6D1F',
  토지보상법규: '#2E7D57',
  보상실무1: '#6B4C9A',
  보상실무2: '#C97539',
});

/** Leitner 상자별 다음 복습까지 일수. box 1 → 1일, box 5 → 16일 */
export const BOX_INTERVALS = Object.freeze([1, 2, 4, 8, 16]);
export const MAX_BOX = 5;

export const QUEUE_REVIEW = 20;
export const QUEUE_PRACTICE = 15;

/** 서술형 키워드 달성률이 이 값 이상이면 정답으로 본다 */
export const ESSAY_PASS_SCORE = 80;
/** 과목 과락 기준 점수, 합격 평균 점수 */
export const SUBJECT_FAIL_SCORE = 40;
export const AVERAGE_PASS_SCORE = 60;

export const DEFAULT_DIFF = 2;
export const DIFFICULTY_LABEL = Object.freeze({ 1: '기초', 2: '표준', 3: '심화' });

export const CHOICE_MARKS = Object.freeze(['①', '②', '③', '④', '⑤']);

export const isStageId = (s) => STAGE_IDS.includes(String(s));
