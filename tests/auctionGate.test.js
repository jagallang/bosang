import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseWebConfig, gateState, itemDocId } from '../site/lib/auctionGate.mjs';
import { findAuctionLeaks } from '../scripts/lib/distGuard.mjs';

const cfg = { apiKey: 'k', authDomain: 'a', projectId: 'p', appId: 'i' };

test('설정이 없거나 깨지면 닫힘', () => {
  assert.equal(parseWebConfig(''), null);
  assert.equal(parseWebConfig(undefined), null);
  assert.equal(parseWebConfig('{bad'), null);
  assert.equal(parseWebConfig(JSON.stringify({ ...cfg, appId: '' })), null);
  assert.deepEqual(parseWebConfig(JSON.stringify(cfg)), cfg);
});

test('관리자로 확인된 경우에만 열림', () => {
  assert.equal(gateState({ configured: false, authReady: true, user: { uid: 'u' }, admin: true }), 'unconfigured');
  assert.equal(gateState({ configured: true, authReady: false }), 'loading');
  assert.equal(gateState({ configured: true, authReady: true, user: null }), 'signed-out');
  assert.equal(gateState({ configured: true, authReady: true, user: { uid: 'u' }, admin: null }), 'checking');
  assert.equal(gateState({ configured: true, authReady: true, user: { uid: 'u' }, admin: false }), 'denied');
  assert.equal(gateState({ configured: true, authReady: true, user: { uid: 'u' }, admin: 'yes' }), 'denied');
  assert.equal(gateState({ configured: true, authReady: true, user: { uid: 'u' }, admin: true }), 'open');
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
