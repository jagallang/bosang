import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { StudyService } from '../public/src/application/StudyService.js';
import { CompositeQuestionRepository, HybridProgressRepository } from '../public/src/infrastructure/repositories.js';
import { validate } from '../scripts/build-content.mjs';

const realBank = JSON.parse(readFileSync(new URL('../content/questions.json', import.meta.url)));

function memoryRepos(questions, saved = null) {
  const state = { saved, stage: null, saves: 0 };
  return {
    state,
    questions: { loadAll: async () => questions },
    progress: { load: async () => state.saved, save: async (p) => { state.saved = JSON.parse(JSON.stringify(p)); state.saves++; } },
    preferences: { getStage: async () => state.stage, setStage: async (s) => { state.stage = s; } },
  };
}

const makeService = async (questions = realBank, saved = null) => {
  const r = memoryRepos(questions, saved);
  let seed = 7;
  const svc = new StudyService({
    questions: r.questions, progress: r.progress, preferences: r.preferences,
    clock: { today: () => 20000 },
    rng: () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646,
  });
  await svc.load();
  return { svc, r };
};

test('실제 문제은행은 형식 검사를 통과한다', () => {
  assert.deepEqual(validate(realBank), []);
});

test('불러오기: 400문항, 1차부터, 진도 저장', async () => {
  const { svc, r } = await makeService();
  assert.equal(svc.bank.size, 400);
  assert.equal(svc.stage, '1');
  const o = svc.overview();
  assert.equal(o.total, 264);
  assert.equal(o.dueCount, 264);
  assert.equal(r.state.saves, 1);
});

test('선택형 풀이: 정답 반영, 중복 답 무시, 저장', async () => {
  const { svc, r } = await makeService();
  const s = svc.startSession({ mode: 'practice', subject: '민법' });
  const q = svc.question(s.currentId);
  const res = await svc.answerChoice(s, q.a);
  assert.equal(res.ok, true);
  assert.equal(await svc.answerChoice(s, 0), null);
  assert.equal(svc.card(q.id).box, 1);
  assert.equal(s.correctCount, 1);
  assert.equal(r.state.saved['1'].cards[q.id].box, 1);
});

test('2차 모의고사는 선택형만 내고, 보상실무2 없이도 합격 판정이 된다', async () => {
  const { svc } = await makeService();
  await svc.switchStage('2');
  const s = svc.startExam();
  assert.ok(s.queue.every((id) => svc.question(id).type === 'mcq'));
  assert.equal(s.insufficient, true);
  s.queue.forEach((id) => s.setAnswer(svc.question(id).a, id));
  const report = await svc.submitExam(s);
  assert.equal(report.points, 100);
  assert.equal(report.passFail.pass, true);
  assert.deepEqual(report.passFail.results.map((x) => x.subject), ['보상실무1']);
  const o = svc.overview();
  assert.equal(o.exams.count, 1);
  assert.equal(o.exams.last.avg, 100);
  assert.equal(o.exams.last.pass, true);
});

test('서술형: 키워드 체크 → 채점 → 상자 반영', async () => {
  const { svc } = await makeService();
  await svc.switchStage('2');
  const s = svc.startSession({ mode: 'type', type: 'essay' });
  const q = svc.question(s.currentId);
  s.revealModelAnswer();
  q.keywords.forEach((_, i) => s.toggleKeyword(i));
  const { score, ok } = await svc.gradeEssay(s);
  assert.equal(score, 100);
  assert.equal(ok, true);
  assert.equal(svc.card(q.id).box, 1);
});

test('단계 초기화와 저장된 진도 이어받기', async () => {
  const first = await makeService();
  const s = first.svc.startSession({ mode: 'review' });
  await first.svc.answerChoice(s, 0);
  const again = await makeService(realBank, first.r.state.saved);
  assert.equal(again.svc.stageProgress().totalAnswered, 1);
  await again.svc.resetStage();
  assert.equal(again.svc.stageProgress().totalAnswered, 0);
});

test('문제은행 합치기: 선택 저장소 실패는 무시, 같은 ID는 뒤가 이김', async () => {
  const repo = new CompositeQuestionRepository([
    { repo: { loadAll: async () => [{ id: 'civ-001', v: 'free' }] } },
    { repo: { loadAll: async () => { throw new Error('permission-denied'); } }, optional: true },
    { repo: { loadAll: async () => [{ id: 'civ-001', v: 'paid' }, { id: 'civ-002' }] } },
  ]);
  const out = await repo.loadAll();
  assert.equal(out.length, 2);
  assert.equal(out.find((q) => q.id === 'civ-001').v, 'paid');
});

test('하이브리드 진도: 원격 우선, 원격 실패 시 기기 진도, 저장은 몰아서', async () => {
  const local = { v: { local: true }, load: async () => local.v, save: async (p) => { local.v = p; } };
  const remote = { v: null, n: 0, load: async () => remote.v, save: async (p) => { remote.v = p; remote.n++; } };
  const h = new HybridProgressRepository(remote, local, { remoteDelayMs: 50 });
  assert.deepEqual(await h.load(), { local: true });
  await h.save({ a: 1 });
  await h.save({ a: 2 });
  assert.equal(remote.n, 0);
  await h.flush();
  assert.equal(remote.n, 1);
  assert.deepEqual(remote.v, { a: 2 });
  assert.deepEqual(await h.load(), { a: 2 });
});
