import { test } from 'node:test';
import assert from 'node:assert/strict';

import { QuestionBank, sourceLabel } from '../public/src/domain/question.js';
import {
  applyResult, blankStageProgress, currentStreak, masteryOf, weakQuestions, dueQuestions, wrongNoteQuestions,
} from '../public/src/domain/progress.js';
import { SessionMode, buildBalancedExam, buildQueue, shuffle, weightedPick } from '../public/src/domain/selection.js';
import { KeywordCheck, essayScore, examPoints, nextKeywordCheck, passFail } from '../public/src/domain/grading.js';
import { normalizeProgress } from '../public/src/domain/migration.js';
import { EssayPhase, StudySession } from '../public/src/domain/session.js';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const mcq = (id, subject, stage = 1, a = 0) => ({ id, subject, stage, type: 'mcq', q: id, opt: ['1', '2', '3', '4', '5'], a, ex: '' });
const essayQ = (id) => ({ id, subject: '보상실무1', stage: 2, type: 'essay', q: id, model: 'm', keywords: [{ term: 'a', weight: 1 }, { term: 'b', weight: 3 }] });

const BANK = new QuestionBank([
  ...Array.from({ length: 10 }, (_, i) => mcq(`civ-${String(i + 1).padStart(3, '0')}`, '민법')),
  ...Array.from({ length: 10 }, (_, i) => mcq(`rel-${String(i + 1).padStart(3, '0')}`, '부동산관계법규')),
  ...Array.from({ length: 10 }, (_, i) => mcq(`lca-${String(i + 1).padStart(3, '0')}`, '토지보상법규')),
  ...Array.from({ length: 6 }, (_, i) => mcq(`prc1-${String(i + 1).padStart(3, '0')}`, '보상실무1', 2)),
  ...Array.from({ length: 6 }, (_, i) => essayQ(`prc1-${String(i + 101).padStart(3, '0')}`)),
]);

test('Leitner: 정답이면 상자 +1, 오답이면 1, 다음 복습일 계산', () => {
  const sp = blankStageProgress(BANK.stage('1'));
  assert.deepEqual(applyResult(sp, 'civ-001', true, 100), { before: 0, after: 1 });
  assert.equal(sp.cards['civ-001'].dueDay, 101);
  applyResult(sp, 'civ-001', true, 101);
  applyResult(sp, 'civ-001', true, 103);
  assert.equal(sp.cards['civ-001'].box, 3);
  assert.equal(sp.cards['civ-001'].dueDay, 107);
  assert.deepEqual(applyResult(sp, 'civ-001', false, 107), { before: 3, after: 1 });
  assert.equal(sp.totalAnswered, 4);
  assert.equal(sp.totalCorrect, 3);
  for (let i = 0; i < 10; i++) applyResult(sp, 'civ-002', true, 200);
  assert.equal(sp.cards['civ-002'].box, 5);
});

test('연속 학습일: 오늘 또는 어제까지 이어진 날만 센다', () => {
  assert.equal(currentStreak({ studyDays: [8, 9, 10] }, 10), 3);
  assert.equal(currentStreak({ studyDays: [8, 9] }, 10), 2);
  assert.equal(currentStreak({ studyDays: [7, 8] }, 10), 0);
  assert.equal(currentStreak({ studyDays: [] }, 10), 0);
});

test('숙련도·복습·취약·오답노트 조회', () => {
  const qs = BANK.stage('1');
  const sp = blankStageProgress(qs);
  assert.equal(masteryOf(sp, qs).pct, 0);
  applyResult(sp, 'civ-001', true, 10);
  assert.equal(dueQuestions(sp, qs, 10).some((q) => q.id === 'civ-001'), false);
  assert.equal(dueQuestions(sp, qs, 11).some((q) => q.id === 'civ-001'), true);
  applyResult(sp, 'civ-002', false, 10);
  applyResult(sp, 'civ-003', false, 10);
  applyResult(sp, 'civ-003', false, 10);
  assert.deepEqual(wrongNoteQuestions(sp, qs).map((q) => q.id), ['civ-003', 'civ-002']);
  assert.equal(weakQuestions(sp, qs).length, 30);
});

test('가중 추출은 중복 없이 n개, 섞기는 원소를 보존', () => {
  const qs = BANK.stage('1');
  const sp = blankStageProgress(qs);
  const picked = weightedPick(qs, 15, sp, seeded(3));
  assert.equal(new Set(picked.map((q) => q.id)).size, 15);
  assert.deepEqual(shuffle(qs, seeded(5)).map((q) => q.id).sort(), qs.map((q) => q.id).sort());
});

test('학습 큐: 과목·유형 필터와 개수 제한', () => {
  const qs = BANK.stage('2');
  const sp = blankStageProgress(qs);
  const essays = buildQueue({ mode: SessionMode.TYPE, type: 'essay', questions: qs, sp, today: 1, rng: seeded() });
  assert.ok(essays.length === 6 && essays.every((q) => q.type === 'essay'));
  const civ = buildQueue({ mode: SessionMode.PRACTICE, subject: '민법', questions: BANK.stage('1'), sp: blankStageProgress(BANK.stage('1')), today: 1, random: true, rng: seeded() });
  assert.ok(civ.length === 10 && civ.every((q) => q.subject === '민법'));
  const review = buildQueue({ mode: SessionMode.REVIEW, questions: BANK.stage('1'), sp: blankStageProgress(BANK.stage('1')), today: 1 });
  assert.equal(review.length, 20);
});

test('모의고사: 1차는 9+8+8 균등, 선택형만', () => {
  const { questions, insufficient } = buildBalancedExam({ subjects: BANK.subjects('1'), questions: BANK.stage('1'), size: 25, rng: seeded() });
  assert.equal(insufficient, false);
  const count = (s) => questions.filter((q) => q.subject === s).length;
  assert.deepEqual([count('민법'), count('부동산관계법규'), count('토지보상법규')], [9, 8, 8]);
});

test('모의고사: 2차는 서술형을 빼고, 문항 없는 과목(보상실무2)은 부족 안내', () => {
  const { questions, insufficient } = buildBalancedExam({ subjects: BANK.subjects('2'), questions: BANK.stage('2'), size: 20, rng: seeded() });
  assert.ok(questions.every((q) => q.type === 'mcq'));
  assert.equal(questions.length, 6);
  assert.equal(insufficient, true);
});

test('서술형 채점: 가중 합계, 확신 없음은 0점', () => {
  const kws = [{ term: 'a', weight: 1 }, { term: 'b', weight: 3 }];
  assert.equal(essayScore(kws, { 1: KeywordCheck.CHECKED }), 75);
  assert.equal(essayScore(kws, { 0: KeywordCheck.CHECKED, 1: KeywordCheck.UNSURE }), 25);
  assert.equal(nextKeywordCheck(KeywordCheck.NONE), KeywordCheck.CHECKED);
  assert.equal(nextKeywordCheck(KeywordCheck.CHECKED), KeywordCheck.UNSURE);
  assert.equal(nextKeywordCheck(KeywordCheck.UNSURE), KeywordCheck.NONE);
});

test('과락 판정: 40점 미만 과목이 있으면 불합격, 문항 없는 과목은 제외', () => {
  const qs = [mcq('a', '민법'), mcq('b', '민법'), mcq('c', '토지보상법규'), mcq('d', '토지보상법규')];
  const r = passFail({ subjects: ['민법', '부동산관계법규', '토지보상법규'], questions: qs, answers: { a: 0, b: 0, c: 0, d: 1 } });
  assert.equal(r.results.length, 2);
  assert.equal(r.avgScore, 75);
  assert.equal(r.pass, true);
  const r2 = passFail({ subjects: ['민법', '토지보상법규'], questions: qs, answers: { a: 0, b: 0, c: 1, d: 1 } });
  assert.equal(r2.anyFailed, true);
  assert.equal(r2.pass, false);
  assert.equal(examPoints(19, 23), 83);
  assert.equal(examPoints(25, 25), 100);
});

test('진도 마이그레이션: v3 옛 ID → v5 단계 분리, 새 문항 카드 채움', () => {
  const v3 = { cards: { m1: { box: 3, seen: 4, correct: 3, wrong: 1, lastDay: 5, dueDay: 9 }, junk: { box: 1 } }, totalAnswered: 4, totalCorrect: 3, studyDays: [5] };
  const p = normalizeProgress(v3, BANK);
  assert.equal(p.version, 5);
  assert.equal(p['1'].cards['civ-001'].box, 3);
  assert.equal(p['1'].cards.junk, undefined);
  assert.equal(p['1'].totalAnswered, 4);
  assert.ok(p['2'].cards['prc1-001']);
  const fresh = normalizeProgress(null, BANK);
  assert.equal(Object.keys(fresh['1'].cards).length, 30);
  const v5 = normalizeProgress({ version: 5, '1': { cards: null }, '2': { cards: {}, studyDays: [] } }, BANK);
  assert.equal(v5['1'].cards['civ-001'].box, 0);
});

test('세션: 서술형 힌트는 문항마다 따로', () => {
  const s = new StudySession({ queue: ['prc1-101', 'prc1-102'], mode: 'type' });
  s.revealHint(0);
  s.revealHint(1);
  assert.equal(s.essay().hints.size, 2);
  s.revealModelAnswer();
  s.toggleKeyword(1);
  s.setEssayScore(75);
  assert.equal(s.essay().phase, EssayPhase.GRADED);
  assert.ok(s.advance());
  assert.equal(s.essay().hints.size, 0);
  assert.equal(s.essay().phase, EssayPhase.SHEET);
  assert.equal(s.advance(), false);
  assert.throws(() => new StudySession({ queue: [], mode: 'x' }));
});

test('출처 표기', () => {
  assert.equal(sourceLabel({ source: [{ type: '기출', year: 2022, no: 3 }] }), '2022년 출제 유형');
  assert.equal(sourceLabel({ source: [{ type: '기출' }] }), '출제 유형');
  assert.equal(sourceLabel({ source: [{ type: '정선', no: 1 }] }), '정선');
  assert.equal(QuestionBank.merge([mcq('civ-002', '민법')], [mcq('civ-001', '민법')]).all[0].id, 'civ-001');
});
