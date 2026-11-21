import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { itemDocId } from '../site/lib/auctionGate.mjs';
import { seal, open } from '../site/lib/vault.mjs';
import { findAuctionLeaks } from '../scripts/lib/distGuard.mjs';

test('금고: 맞는 비밀번호로만 열린다', async () => {
  const data = { items: [{ case: '예시 2026타경0001' }] };
  const v = await seal(data, 'correct-horse-9', { iterations: 1000 });
  assert.ok(!JSON.stringify(v).includes('타경'));
  assert.deepEqual(await open(v, 'correct-horse-9'), data);
  assert.equal(await open(v, 'wrong-password'), null);
  await assert.rejects(seal(data, 'short'));
});

test('문서 id에 / 가 들어가지 않는다', () => {
  assert.equal(itemDocId({ case: '수원지법 2026타경 1234/1' }), '수원지법_2026타경_1234_1');
  assert.equal(itemDocId({ id: 's1' }), 's1');
  assert.equal(itemDocId({}, 3), 'item-3');
});

test('규칙: auctionItems는 관리자만', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(rules, /match \/auctionItems\/\{id\}\s*\{\s*allow read, write: if isAdmin\(\);\s*\}/);
});

test('배포본 검사: 물건 파일·사건번호를 찾아낸다', () => {
  const d = mkdtempSync(join(tmpdir(), 'dist-'));
  mkdirSync(join(d, 'auction'));
  writeFileSync(join(d, 'auction', 'index.html'), '<p>관리자 전용</p>');
  assert.deepEqual(findAuctionLeaks(d), []);
  writeFileSync(join(d, 'x.js'), 'var a="2026타경1234"');
  writeFileSync(join(d, 'items.json'), '[]');
  assert.equal(findAuctionLeaks(d).length, 2);
});
