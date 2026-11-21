// 빌드 때 경매 물건을 비밀번호로 암호화해 dist/auction/vault.json에 넣는다
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { seal } from '../../site/lib/vault.mjs';

export async function writeVault(root, dist, password, { log = console.log } = {}) {
  if (!password) { log('ℹ AUCTION_PASSWORD 없음 → 보상경매는 아무도 못 엽니다'); return null; }
  const real = join(root, 'tools', 'auction', 'data', 'items.json');
  const sample = join(root, 'tools', 'auction', 'data', 'items.sample.json');
  const file = existsSync(real) ? real : sample;
  const items = JSON.parse(readFileSync(file, 'utf8'));
  const data = { source: file === real ? '내 물건' : '예시 물건 (items.json을 만들면 그걸 씁니다)', sealedAt: new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10), items };
  writeFileSync(join(dist, 'auction', 'vault.json'), JSON.stringify(await seal(data, password)));
  log(`✓ 보상경매 금고: ${items.length}건 암호화 (${file === real ? 'items.json' : '예시'})`);
  return data;
}
