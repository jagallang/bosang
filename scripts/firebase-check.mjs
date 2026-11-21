#!/usr/bin/env node
// 배포 전 점검: 설정·규칙·파일이 맞는지 확인하고 남은 일을 알려 준다 (네트워크 사용 안 함)
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWebConfig } from './lib/webConfig.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ok = (m) => console.log(`✓ ${m}`);
const todo = [];
const need = (m) => { todo.push(m); console.log(`✗ ${m}`); };

let web = null;
try { web = loadWebConfig(root); } catch (e) { need(e.message); }
if (web) ok(`웹앱 설정 (${web.from}) — 프로젝트 ${web.projectId}`); else if (!todo.length) need('firebase.web.json이 없습니다 (firebase.web.example.json 참고)');
if (web && !web.siteUrl) need('firebase.web.json에 siteUrl(배포 주소)이 없어 sitemap이 비어 있게 됩니다');

const fj = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8'));
fj.hosting?.public === 'dist' ? ok('firebase.json hosting.public = dist') : need('firebase.json hosting.public이 dist가 아닙니다');
fj.firestore?.rules && existsSync(join(root, fj.firestore.rules)) ? ok('Firestore 규칙 파일') : need('Firestore 규칙 파일이 없습니다');

existsSync(join(root, 'content/out/questionChunks.json'))
  ? ok('유료 문항 묶음 content/out/questionChunks.json (npm run content로 생성)')
  : need('npm run content 를 실행해 유료 문항 묶음을 만드세요');
process.env.GOOGLE_APPLICATION_CREDENTIALS && existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  ? ok('서비스 계정 키 (관리자 명령용)')
  : need('관리자 명령(문항 업로드·이용권)에 쓸 서비스 계정 키 경로를 GOOGLE_APPLICATION_CREDENTIALS에 넣으세요');

const legal = readFileSync(join(root, 'site/lib/site.js'), 'utf8');
/legalDraft:\s*true/.test(legal) ? need('약관이 아직 초안 표시(legalDraft: true) 상태입니다') : ok('약관 확정');
/regNo:\s*''/.test(legal) ? need('사업자 정보(site/lib/site.js business)가 비어 있습니다') : ok('사업자 정보');

console.log(todo.length ? `\n남은 일 ${todo.length}개. docs/FIREBASE.md 순서대로 진행하세요.` : '\n배포 준비 완료: npm run deploy');
process.exit(0);
