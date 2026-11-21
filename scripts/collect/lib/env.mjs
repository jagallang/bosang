// 저장소 루트의 .env.local(커밋 안 함)을 읽어 process.env에 넣는다. 이미 있는 값은 덮지 않는다
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
export function loadEnvLocal(root) {
  const p = join(root, '.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
