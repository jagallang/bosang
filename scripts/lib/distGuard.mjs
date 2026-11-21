// 배포본에 보상경매 물건 데이터가 섞이지 않았는지 검사 (사건번호 형식·물건 파일명)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const TEXT = new Set(['.html', '.js', '.json', '.txt', '.csv', '.xml']);
const CASE_NO = /\d{4}타경\d+/;

export function findAuctionLeaks(dir) {
  const leaks = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (/^items(\.sample)?\.json$/.test(name)) { leaks.push(`${p} (물건 파일)`); continue; }
      if (!TEXT.has(extname(name))) continue;
      if (CASE_NO.test(readFileSync(p, 'utf8'))) leaks.push(`${p} (사건번호)`);
    }
  };
  walk(dir);
  return leaks;
}

export function assertNoAuctionItems(dir) {
  const leaks = findAuctionLeaks(dir);
  if (leaks.length) throw new Error(`배포본에 경매 물건 데이터가 있습니다:\n${leaks.join('\n')}`);
}
