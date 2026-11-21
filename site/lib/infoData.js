// 빌드 시점에 content/info를 읽는다 (서버 컴포넌트 전용).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectSummary, sortSummaries } from './infoModel.mjs';
import { sigunguKeys, centroidOf } from './geo.mjs';

const BASE = join(process.cwd(), '..', 'content', 'info');
// BOSANG_INFO_DIR: 가상 데이터로 빌드해 볼 때 (저장소 루트 기준 경로)
const DIR = process.env.BOSANG_INFO_DIR ? join(process.cwd(), '..', process.env.BOSANG_INFO_DIR) : BASE;

export const ontology = JSON.parse(readFileSync(join(BASE, 'ontology.json'), 'utf8'));

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

// ── 지도 ──────────────────────────────────────────────

const GEO = join(process.cwd(), '..', 'content', 'info', 'geo');

/**
 * 지도에 올릴 사업지구. 경계 정밀도: boundary(지구 경계) > parcels(필지) > sigungu(시군구 범위, 경계 미수집)
 */
export function mapItems() {
  const sg = JSON.parse(readFileSync(join(GEO, 'sigungu.json'), 'utf8'));
  const byId = new Map(summaries().map((s) => [s.id, s]));
  return allProjects().map((p) => {
    const s = byId.get(p.id);
    const file = join(GEO, 'projects', `${p.id}.geojson`);
    let geometries, precision, source;
    if (existsSync(file)) {
      const fc = JSON.parse(readFileSync(file, 'utf8'));
      geometries = fc.features.map((f) => f.geometry);
      precision = fc.precision || 'boundary';
      source = `${fc.source || ''}${fc.checkedAt ? ` (${fc.checkedAt})` : ''}`;
    } else {
      const keys = sigunguKeys(p.region, sg.items);
      geometries = keys.map((k) => sg.items[k].geometry);
      precision = 'sigungu';
      source = `${sg.source} — ${keys.map((k) => sg.items[k].name).join('·')}`;
    }
    const center = geometries.length ? centroidOf(geometries) : null;
    return {
      id: p.id, name: p.name, type: s.type, sample: s.sample,
      region: `${s.sido} ${s.sigungu}`.trim(),
      stage: s.stage, daysLeft: s.nextDeadline ? s.nextDeadline.daysLeft : null,
      precision, source, center, geometries,
    };
  }).filter((x) => x.center);
}
