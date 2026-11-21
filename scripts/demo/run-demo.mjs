#!/usr/bin/env node
/**
 * 가상 데이터로 수집 → 합치기 → 보상경매 물건까지 한 번에 돌린다. 결과는 demo/out/ (커밋 안 함).
 *   npm run demo            데이터만
 *   npm run demo -- --site  가상 데이터로 사이트까지 빌드 (dist/, 배포 금지)
 * 실제 데이터(content/info, tools/auction/data)는 건드리지 않는다.
 */
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eumRows, compPlanRows, parcelRows, onbidItems, toCsv, eumWebRows, landUseFixture } from './fixtures.mjs';
import { startMockOnbid } from './mockOnbid.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'demo/out');
const INFO = 'demo/out/info';

rmSync(OUT, { recursive: true, force: true });
for (const d of ['sources', 'info/projects', 'info/inbox/parcels']) mkdirSync(join(OUT, d), { recursive: true });

// 원자료: 토지이음은 EUC-KR로 (포털 파일과 같게), 보상계획은 UTF-8 BOM으로
const eucKr = (s) => Buffer.from(execFileSync('iconv', ['-f', 'utf-8', '-t', 'euc-kr'], { input: s }));
try { writeFileSync(join(OUT, 'sources/토지이음_고시목록.csv'), eucKr(toCsv(eumRows()))); }
catch { writeFileSync(join(OUT, 'sources/토지이음_고시목록.csv'), toCsv(eumRows())); }
writeFileSync(join(OUT, 'sources/경북개발공사_보상계획공고.csv'), '﻿' + toCsv(compPlanRows()));
writeFileSync(join(OUT, 'info/inbox/parcels/가상-토지조서.csv'), toCsv(parcelRows()));

const items = onbidItems();
const mock = await startMockOnbid(items, { eumRows: eumWebRows(), landUse: landUseFixture() });
const cfg = JSON.parse(readFileSync(join(ROOT, 'demo/collect.config.json'), 'utf8'));
cfg.auction.onbid.endpoint = mock.url;
cfg.info.web = [{ id: 'eum-web', kind: 'eumWeb', enabled: true, sido: '경기도', sinceDays: 7, listSize: 3, maxPages: 10, delayMs: 0, base: `${mock.origin}/web/gs/gv/gvGosiList.jsp` }];
cfg.auction.vworld = { enabled: true, domain: 'localhost', delayMs: 0, endpoint: `${mock.origin}/ned/data/getLandUseAttr` };
writeFileSync(join(OUT, 'collect.config.json'), JSON.stringify(cfg, null, 2));

const env = { ...process.env, BOSANG_INFO_DIR: INFO, DATA_GO_KR_KEY: 'demo-key', VWORLD_KEY: 'demo-vworld-key' };
// 가짜 서버가 이 프로세스 안에 있으므로 자식 프로세스는 비동기로 돌린다 (동기 실행이면 서버가 응답을 못 한다)
const run = (args) => new Promise((ok, fail) => {
  console.log(`\n$ node ${args.join(' ')}`);
  spawn('node', args, { cwd: ROOT, env, stdio: 'inherit' }).on('exit', (c) => (c ? fail(new Error(`${args[0]} 종료 코드 ${c}`)) : ok()));
});
try {
  await run(['scripts/collect/collect.mjs', 'info', '--config', 'demo/out/collect.config.json']);
  await run(['scripts/collect/run.mjs']);
  await run(['scripts/collect/collect.mjs', 'auction', '--config', 'demo/out/collect.config.json']);
} finally { await mock.close(); }

console.log(`\n가짜 온비드 서버 호출 ${mock.log.length}회 (원본 물건 ${items.length}건 중 토지·매각·인터넷 조건으로 걸러 받음)`);
if (process.argv.includes('--site')) {
  console.log('\n$ 가상 데이터로 사이트 빌드');
  execFileSync('node', ['scripts/build-all.mjs'], { cwd: ROOT, env, stdio: 'inherit' });
  console.log('⚠ dist/는 가상 데이터입니다. 배포 전 npm run build로 다시 만드세요.');
}
console.log(`\n결과: demo/out/info/projects/*.json, demo/out/items.json
보상경매 툴: npm run tool → http://127.0.0.1:8090/tools/auction/?demo`);
