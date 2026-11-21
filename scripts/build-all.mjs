// 배포본 조립: dist/ = 사이트(site/out) + 퀴즈앱(public/ → dist/app/)
// 사용: node scripts/build-all.mjs   (전체 문항 questions.json은 넣지 않는다)
import { execSync } from 'node:child_process';
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { loadWebConfig, injectAppConfig } from './lib/webConfig.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const web = loadWebConfig(root);
if (web?.siteUrl && !process.env.SITE_URL) process.env.SITE_URL = web.siteUrl;
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });

run('node scripts/build-content.mjs');
run('node scripts/collect/run.mjs --check');
if (!existsSync(join(root, 'site/node_modules'))) run('npm ci', join(root, 'site'));
run('node scripts/build-fonts.mjs');
run('npx next build', join(root, 'site'));

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
cpSync(join(root, 'site/out'), dist, { recursive: true });
cpSync(join(root, 'public'), join(dist, 'app'), {
  recursive: true,
  filter: (src) => !src.endsWith(join('data', 'questions.json')),
});
// Firebase 설정이 있으면 학습앱을 firebase 모드로 (원본 public/은 local 그대로 둔다)
if (web) {
  const cfgPath = join(dist, 'app', 'src', 'config.js');
  writeFileSync(cfgPath, injectAppConfig(readFileSync(cfgPath, 'utf8'), web));
  console.log(`✓ 학습앱 firebase 모드 (${web.from}, 프로젝트 ${web.projectId})`);
} else {
  console.log('ℹ Firebase 설정 없음 → 학습앱은 local 모드(무료 샘플)로 빌드');
}

// 비공개 툴·원본 데이터가 배포본에 섞이지 않았는지 확인
for (const bad of ['tools', 'content', join('app', 'data', 'questions.json')]) {
  if (existsSync(join(dist, bad))) throw new Error(`배포본에 들어가면 안 되는 경로: ${bad}`);
}
console.log('✓ dist/ 준비 완료 — 사이트 / , 학습앱 /app/');
