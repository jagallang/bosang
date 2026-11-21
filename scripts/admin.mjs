#!/usr/bin/env node
/**
 * 관리자 작업 (Firebase Admin SDK). 서비스 계정 키가 필요하다.
 *   export GOOGLE_APPLICATION_CREDENTIALS=~/keys/bosang-admin.json   (저장소에 넣지 말 것)
 *   npm i -D firebase-admin
 *
 *   node scripts/admin.mjs upload-questions          content/out/questionChunks.json → Firestore questionChunks/*
 *   node scripts/admin.mjs grant user@gmail.com 365  이용권 부여 (일수 생략 시 무기한)
 *   node scripts/admin.mjs revoke user@gmail.com     이용권 해제
 *   node scripts/admin.mjs list                      이용권 목록
 *
 * 사용자는 먼저 앱에서 구글 로그인을 한 번 해야 이메일로 찾을 수 있다.
 */
import { readFileSync } from 'node:fs';
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

async function grant({ db, auth, FieldValue, Timestamp }, email, days) {
  const user = await auth.getUserByEmail(email);
  const data = { paid: true, email, grantedAt: FieldValue.serverTimestamp() };
  if (days) data.until = Timestamp.fromMillis(Date.now() + Number(days) * 86400000);
  else data.until = FieldValue.delete();
  await db.collection('entitlements').doc(user.uid).set(data, { merge: true });
  console.log(`이용권 부여: ${email} (${days ? `${days}일` : '무기한'})`);
}

async function revoke({ db, auth }, email) {
  const user = await auth.getUserByEmail(email);
  await db.collection('entitlements').doc(user.uid).set({ paid: false }, { merge: true });
  console.log(`이용권 해제: ${email}`);
}

async function list({ db }) {
  const snap = await db.collection('entitlements').get();
  snap.forEach((d) => {
    const e = d.data();
    console.log(`${e.email || d.id}\t${e.paid ? '유효' : '해제'}\t${e.until ? e.until.toDate().toISOString().slice(0, 10) : '무기한'}`);
  });
}

const [cmd, ...rest] = process.argv.slice(2);
const ctx = await init();
if (cmd === 'upload-questions') await uploadQuestions(ctx);
else if (cmd === 'grant') await grant(ctx, rest[0], rest[1]);
else if (cmd === 'revoke') await revoke(ctx, rest[0]);
else if (cmd === 'list') await list(ctx);
else console.log('사용법: node scripts/admin.mjs upload-questions | grant <email> [days] | revoke <email> | list');
