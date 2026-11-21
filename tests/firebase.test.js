import test from 'node:test';
import assert from 'node:assert/strict';
import { fakeFirebase } from './support/fakeFirebase.js';
import {
  FirebaseAuthService, FirestoreEntitlementService, FirestoreQuestionRepository, FirestoreProgressRepository,
} from '../public/src/infrastructure/firebase/firebaseAdapters.js';
import { AccessService } from '../public/src/application/AccessService.js';
import { CompositeQuestionRepository } from '../public/src/infrastructure/repositories.js';

const DAY = 86400000;
const free = { loadAll: async () => [{ id: 'civ-001', v: 'free' }, { id: 'lca-001', v: 'free' }] };

function setup() {
  const f = fakeFirebase();
  f.admin.set('questionChunks/civ', { items: [{ id: 'civ-001', v: 'paid' }, { id: 'civ-002', v: 'paid' }] });
  f.admin.set('questionChunks/lca', { items: [{ id: 'lca-001', v: 'paid' }, { id: 'lca-002', v: 'paid' }] });
  const auth = new FirebaseAuthService(f.fb);
  const access = new AccessService({ auth, entitlement: new FirestoreEntitlementService(f.fb) });
  return { f, auth, access };
}

/** main.js의 repositoriesFor와 같은 조립 */
const questionsFor = (state, fb) => new CompositeQuestionRepository([
  { repo: free },
  ...(state.paid ? [{ repo: new FirestoreQuestionRepository(fb), optional: true }] : []),
]);

test('비로그인: 무료 문항만, 이용권 없음', async () => {
  const { f, access } = setup();
  const s = await access.init();
  assert.equal(s.user, null);
  assert.equal(s.paid, false);
  assert.deepEqual((await questionsFor(s, f.fb).loadAll()).map((q) => q.id), ['civ-001', 'lca-001']);
});

test('로그인했지만 이용권 없음: 유료 문항 읽기는 규칙이 막는다', async () => {
  const { f, access } = setup();
  await access.init();
  f.login({ uid: 'u1', email: 'a@x.kr' });
  const s = await access.refresh();
  assert.equal(s.paid, false);
  await assert.rejects(new FirestoreQuestionRepository(f.fb).loadAll(), /permission-denied/);
});

test('이용권 있음: 무료+유료 합쳐 400문항처럼, 같은 id는 유료본이 이긴다', async () => {
  const { f, access } = setup();
  await access.init();
  f.login({ uid: 'u1', email: 'a@x.kr' });
  f.admin.set('entitlements/u1', { paid: true, until: f.admin.ts(Date.now() + 30 * DAY) });
  const s = await access.refresh();
  assert.equal(s.paid, true);
  assert.ok(s.until instanceof Date);
  const qs = await questionsFor(s, f.fb).loadAll();
  assert.deepEqual(qs.map((q) => q.id).sort(), ['civ-001', 'civ-002', 'lca-001', 'lca-002']);
  assert.equal(qs.find((q) => q.id === 'civ-001').v, 'paid');
});

test('만료된 이용권은 무료로 돌아간다', async () => {
  const { f, access } = setup();
  await access.init();
  f.login({ uid: 'u1' });
  f.admin.set('entitlements/u1', { paid: true, until: f.admin.ts(Date.now() - DAY) });
  assert.equal((await access.refresh()).paid, false);
  await assert.rejects(new FirestoreQuestionRepository(f.fb).loadAll(), /permission-denied/);
});

test('진도: 본인 것만 저장·읽기, 다른 사람 것은 거부', async () => {
  const { f } = setup();
  f.login({ uid: 'u1' });
  const mine = new FirestoreProgressRepository(f.fb, 'u1');
  await mine.save({ version: 5, 1: { cards: {} } });
  assert.deepEqual(await mine.load(), { version: 5, 1: { cards: {} } });
  assert.deepEqual(Object.keys(f.admin.get('progress/u1')).sort(), ['data', 'updatedAt']);
  await assert.rejects(new FirestoreProgressRepository(f.fb, 'u2').save({}), /permission-denied/);
  await assert.rejects(new FirestoreProgressRepository(f.fb, 'u2').load(), /permission-denied/);
});

test('로그인 상태 변화가 AccessService로 전달된다', async () => {
  const { f, access } = setup();
  await access.init();
  const seen = [];
  access.onChange((u) => seen.push(u?.uid ?? null));
  f.login({ uid: 'u9', email: 'z@x.kr', displayName: 'Z' });
  await access.signOut();
  assert.deepEqual(seen, ['u9', null]);
});

test('빌드 시 학습앱 config.js에 firebase 설정을 넣는다', async () => {
  const { readFileSync } = await import('node:fs');
  const { injectAppConfig } = await import('../scripts/lib/webConfig.mjs');
  const src = readFileSync(new URL('../public/src/config.js', import.meta.url), 'utf8');
  const out = injectAppConfig(src, { apiKey: 'AIzaTEST', authDomain: 'p.firebaseapp.com', projectId: 'p', appId: '1:2:web:3' });
  const mod = await import(`data:text/javascript,${encodeURIComponent(out)}`);
  assert.equal(mod.config.mode, 'firebase');
  assert.deepEqual(mod.config.firebase, { apiKey: 'AIzaTEST', authDomain: 'p.firebaseapp.com', projectId: 'p', appId: '1:2:web:3' });
  assert.equal(mod.config.freeQuestionsUrl, 'data/questions.free.json', '다른 설정은 그대로');
});
