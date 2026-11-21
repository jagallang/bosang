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

/** 용어별 문제은행 언급 수 (문항 본문·보기·해설에 용어가 그대로 나오는 경우). 문항 내용은 내보내지 않는다 */
export function termQuestionCounts() {
  let qs = [];
  try {
    const raw = JSON.parse(readFileSync(join(process.cwd(), '..', 'content', 'questions.json'), 'utf8'));
    qs = Array.isArray(raw) ? raw : raw.questions || [];
  } catch { return {}; }
  const texts = qs.map((q) => [q.q, ...(q.opt || []), q.ex || '', q.model || ''].join(' ').replace(/\s+/g, ''));
  const counts = {};
  for (const st of ontology.stages) for (const t of st.terms) {
    const key = t.replace(/\s+/g, '');
    counts[t] = texts.filter((x) => x.includes(key)).length;
  }
  return counts;
}
