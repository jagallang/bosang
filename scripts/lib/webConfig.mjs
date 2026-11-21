// Firebase 웹앱 설정 읽기: FIREBASE_WEB_CONFIG 환경변수(JSON) 또는 저장소 루트의 firebase.web.json
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const REQUIRED = ['apiKey', 'authDomain', 'projectId', 'appId'];

export function loadWebConfig(root) {
  let raw = process.env.FIREBASE_WEB_CONFIG;
  let from = 'FIREBASE_WEB_CONFIG';
  if (!raw && existsSync(join(root, 'firebase.web.json'))) { raw = readFileSync(join(root, 'firebase.web.json'), 'utf8'); from = 'firebase.web.json'; }
  if (!raw) return null;
  const cfg = JSON.parse(raw);
  const missing = REQUIRED.filter((k) => !cfg[k]);
  if (missing.length) throw new Error(`${from}에 ${missing.join(', ')} 값이 없습니다`);
  return { ...cfg, from };
}

/** 학습앱 config.js 원본에 firebase 모드와 설정값을 넣은 내용을 돌려준다 */
export function injectAppConfig(source, cfg) {
  const fb = Object.fromEntries(REQUIRED.map((k) => [k, cfg[k]]));
  const block = `firebase: ${JSON.stringify(fb, null, 4).replace(/\n}/, '\n  }')},`;
  const out = source
    .replace(/mode:\s*'local',/, "mode: 'firebase',")
    .replace(/firebase:\s*\{[\s\S]*?\},/, block);
  if (!out.includes("mode: 'firebase'") || !out.includes(cfg.apiKey)) throw new Error('config.js 형식이 바뀌어 설정을 넣지 못했습니다');
  return out;
}
