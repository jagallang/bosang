// 빌드 시점에 content/info를 읽는다 (서버 컴포넌트 전용).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectSummary, sortSummaries } from './infoModel.mjs';

const DIR = join(process.cwd(), '..', 'content', 'info');

export const ontology = JSON.parse(readFileSync(join(DIR, 'ontology.json'), 'utf8'));

export function allProjects() {
  return readdirSync(join(DIR, 'projects')).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(DIR, 'projects', f), 'utf8')));
}

/** 정적 사이트라 '오늘'은 빌드한 날이다. 매일 다시 빌드해야 기한이 맞다 */
export const buildDate = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);

export function summaries() {
  const today = buildDate();
  return sortSummaries(allProjects().map((p) => projectSummary(p, ontology, today)));
}
