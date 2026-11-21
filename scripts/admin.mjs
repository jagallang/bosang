#!/usr/bin/env node
/**
 * 관리자 작업 (Firebase Admin SDK). 서비스 계정 키가 필요하다.
 *   export GOOGLE_APPLICATION_CREDENTIALS=~/keys/bosang-admin.json   (저장소에 넣지 말 것)
 *   npm i -D firebase-admin
 *
 *   node scripts/admin.mjs upload-questions          content/out/questionChunks.json → Firestore questionChunks/*
 *   node scripts/admin.mjs grant user@gmail.com 365  이용권 부여 (일수 생략 시 무기한)
 *   node scripts/admin.mjs revoke user@gmail.com     이용권 해제
 *   node scripts/admin.mjs list [--org=기관명]         이용권 목록
 *
 *   기관(B2B)
 *   node scripts/admin.mjs grant-bulk 직원.csv 365 --org=LX   이메일 목록 일괄 개통 (아직 로그인 안 한 사람은 따로 알려 줌)
 *   node scripts/admin.mjs report --org=LX [--out=리포트.csv]  기관 월간 학습 리포트 (엑셀용 CSV)
 *
 *   보상경매(관리자 전용)
 *   node scripts/admin.mjs upload-auction [items.json] [--prune]   기본 tools/auction/data/items.json → auctionItems/*
 *
 * 사용자는 먼저 앱에서 구글 로그인을 한 번 해야 이메일로 찾을 수 있다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { summarizeProgress, toCsv, parseEmails } from './lib/orgReport.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

async function init() {
  const { initializeApp, applicationDefault } = await import('firebase-admin/app');
  const { getFirestore, FieldValue, Timestamp } = await import('firebase-admin/firestore');
  const { getAuth } = await import('firebase-admin/auth');
  initializeApp({ credential: applicationDefault() });
  return { db: getFirestore(), auth: getAuth(), FieldValue, Timestamp };
}

async function uploadQuestions({ db, FieldValue }) {
  const chunks = JSON.parse(readFileSync(join(ROOT, 'content', 'out', 'questionChunks.json'), 'utf8'));
  for (const [key, items] of Object.entries(chunks)) {
    await db.collection('questionChunks').doc(key).set({ items, updatedAt: FieldValue.serverTimestamp() });
    console.log(`questionChunks/${key}: ${items.length}문항`);
  }
}

async function grant({ db, auth, FieldValue, Timestamp }, email, days, org) {
  const user = await auth.getUserByEmail(email);
  const data = { paid: true, email, grantedAt: FieldValue.serverTimestamp() };
  if (org) data.org = org;
  if (days) data.until = Timestamp.fromMillis(Date.now() + Number(days) * 86400000);
  else data.until = FieldValue.delete();
  await db.collection('entitlements').doc(user.uid).set(data, { merge: true });
  console.log(`이용권 부여: ${email} (${days ? `${days}일` : '무기한'})${org ? ` [${org}]` : ''}`);
}

async function grantBulk(ctx, file, days, org) {
  const emails = parseEmails(readFileSync(file, 'utf8'));
  const missing = [];
  for (const email of emails) {
    try { await grant(ctx, email, days, org); }
    catch (e) {
      if (e.code === 'auth/user-not-found') missing.push(email);
      else throw e;
    }
  }
  console.log(`\n완료 ${emails.length - missing.length}명 / 전체 ${emails.length}명`);
  if (missing.length) {
    console.log('아직 학습앱에 로그인하지 않은 사람 (로그인 후 같은 명령을 다시 실행):');
    missing.forEach((m) => console.log('  ' + m));
  }
}

async function report({ db }, org, out) {
  if (!org) throw new Error('--org=기관명 이 필요합니다');
  const ents = await db.collection('entitlements').where('org', '==', org).get();
  const today = Math.floor(Date.now() / 86400000);
  const rows = [];
  for (const d of ents.docs) {
    const e = d.data();
    const p = await db.collection('progress').doc(d.id).get();
    rows.push({
      email: e.email || d.id,
      until: e.until ? e.until.toDate().toISOString().slice(0, 10) : '',
      summary: summarizeProgress(p.exists ? p.data().data : null, today),
    });
  }
  rows.sort((a, b) => a.email.localeCompare(b.email));
  const file = out || `report-${org}-${new Date().toISOString().slice(0, 10)}.csv`;
  writeFileSync(file, toCsv(rows));
  console.log(`${org}: ${rows.length}명 → ${file}`);
}

async function revoke({ db, auth }, email) {
  const user = await auth.getUserByEmail(email);
  await db.collection('entitlements').doc(user.uid).set({ paid: false }, { merge: true });
  console.log(`이용권 해제: ${email}`);
}

async function list({ db }, org) {
  const col = db.collection('entitlements');
  const snap = await (org ? col.where('org', '==', org) : col).get();
  snap.forEach((d) => {
    const e = d.data();
    console.log(`${e.email || d.id}\t${e.paid ? '유효' : '해제'}\t${e.until ? e.until.toDate().toISOString().slice(0, 10) : '무기한'}\t${e.org || ''}`);
  });
}

/** 보상경매 물건 → Firestore auctionItems/* (관리자만 읽는 컬렉션). 파일에 없는 기존 문서는 --prune일 때만 지운다 */
async function uploadAuction({ db, FieldValue }, file, prune) {
  const { itemDocId } = await import('../site/lib/auctionGate.mjs');
  const path = file || join(ROOT, 'tools', 'auction', 'data', 'items.json');
  const items = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(items)) throw new Error(`${path}: 배열이 아닙니다`);
  const col = db.collection('auctionItems');
  const ids = new Set();
  for (const [i, it] of items.entries()) {
    const id = itemDocId(it, i);
    if (ids.has(id)) throw new Error(`문서 id 중복: ${id}`);
    ids.add(id);
    await col.doc(id).set({ ...it, updatedAt: FieldValue.serverTimestamp() });
  }
  console.log(`auctionItems: ${items.length}건 올림 (${path})`);
  if (prune) {
    const snap = await col.get();
    const stale = snap.docs.filter((d) => !ids.has(d.id));
    for (const d of stale) await d.ref.delete();
    console.log(`auctionItems: 파일에 없는 ${stale.length}건 삭제`);
  }
}

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const [cmd, ...rest] = args.filter((a) => !a.startsWith('--'));
const ctx = await init();
if (cmd === 'upload-questions') await uploadQuestions(ctx);
else if (cmd === 'grant') await grant(ctx, rest[0], rest[1], flag('org'));
else if (cmd === 'grant-bulk') await grantBulk(ctx, rest[0], rest[1], flag('org'));
else if (cmd === 'revoke') await revoke(ctx, rest[0]);
else if (cmd === 'list') await list(ctx, flag('org'));
else if (cmd === 'upload-auction') await uploadAuction(ctx, rest[0], args.includes('--prune'));
else if (cmd === 'report') await report(ctx, flag('org'), flag('out'));
else console.log('사용법: node scripts/admin.mjs upload-questions | grant <email> [days] [--org=기관] | grant-bulk <csv> [days] --org=기관 | revoke <email> | list [--org=기관] | report --org=기관 [--out=파일] | upload-auction [파일] [--prune]');
