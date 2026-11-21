import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeProgress, toCsv, parseEmails } from '../scripts/lib/orgReport.mjs';

const progress = {
  version: 5,
  1: {
    cards: { a: { box: 5, seen: 3 }, b: { box: 0, seen: 0 }, c: { box: 2, seen: 1 }, d: { box: 1, seen: 2 } },
    totalAnswered: 10, totalCorrect: 7, studyDays: [20000, 20001, 20001, 20003],
  },
  2: { cards: { e: { box: 0, seen: 0 } }, totalAnswered: 0, totalCorrect: 0, studyDays: [] },
};

test('진도 요약: 학습일수·정답률·숙련도·미학습 일수', () => {
  const s = summarizeProgress(progress, 20005);
  assert.equal(s['1'].studyDays, 3);
  assert.equal(s['1'].accuracy, 70);
  assert.equal(s['1'].mastery, 40); // (5+0+2+1)/(4*5)
  assert.equal(s['1'].seenQuestions, 3);
  assert.equal(s['1'].idleDays, 2);
  assert.equal(s['2'].answered, 0);
});

test('CSV: 학습한 단계만 행으로, 미학습자는 한 줄', () => {
  const csv = toCsv([
    { email: 'a@x.kr', until: '2027-11-21', summary: summarizeProgress(progress, 20005) },
    { email: 'b@x.kr', until: '', summary: summarizeProgress(null, 20005) },
  ]);
  assert.equal(csv.charCodeAt(0), 0xfeff, 'BOM으로 시작해야 엑셀에서 한글이 깨지지 않는다');
  const lines = csv.slice(1).trim().split('\n');
  assert.ok(lines[0].startsWith('이메일'));
  assert.equal(lines.length, 3);
  assert.match(lines[1], /^a@x\.kr,2027-11-21,1차,3,10,70,40,/);
  assert.match(lines[2], /^b@x\.kr,무기한,-,0,0/);
});

test('이메일 목록 파싱: 중복·대소문자 정리', () => {
  assert.deepEqual(parseEmails('email\nKim@LH.or.kr,김\nlee@lh.or.kr\nkim@lh.or.kr'), ['kim@lh.or.kr', 'lee@lh.or.kr']);
});
