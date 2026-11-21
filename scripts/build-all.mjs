// 배포본 조립: dist/ = 사이트(site/out) + 퀴즈앱(public/ → dist/app/)
// 사용: node scripts/build-all.mjs   (전체 문항 questions.json은 넣지 않는다)
import { execSync } from 'node:child_process';
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });

run('node scripts/build-content.mjs');
if (!existsSync(join(root, 'site/node_modules'))) run('npm ci', join(root, 'site'));
run('npx next build', join(root, 'site'));

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
cpSync(join(root, 'site/out'), dist, { recursive: true });
cpSync(join(root, 'public'), join(dist, 'app'), {
  recursive: true,
  filter: (src) => !src.endsWith(join('data', 'questions.json')),
});
console.log('✓ dist/ 준비 완료 — 사이트 / , 학습앱 /app/');
