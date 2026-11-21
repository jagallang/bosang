// 분류된 후보 → inbox CSV 행. 기존 사업과 이름이 같으면 그 사업에 붙인다
import { normName, projectIdOf } from './classify.mjs';

const COLS = ['project_id', 'project_name', 'type', 'operator', 'sido', 'sigungu', 'date', 'stage', 'title', 'url', 'period_from', 'period_to', 'source'];
const cell = (v) => { const t = v == null ? '' : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };

export function toInboxRows(cands, projects) {
  const byName = new Map(projects.map((p) => [normName(p.name), p]));
  return cands.map((c) => {
    const hit = byName.get(normName(c.projectName));
    return {
      project_id: hit ? hit.id : projectIdOf(c.projectName),
      project_name: hit ? hit.name : c.projectName,
      type: c.type || '', operator: c.operator || '',
      sido: c.region?.sido || '', sigungu: c.region?.sigungu || '',
      date: c.date, stage: c.stage, title: c.title, url: c.url || '',
      period_from: c.period?.from || '', period_to: c.period?.to || '',
      source: c.source, matched: !!hit, confidence: c.confidence, reason: c.reason,
    };
  });
}

export function rowsToCsv(rows, extra = []) {
  const cols = [...COLS, ...extra];
  return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((k) => cell(r[k])).join(','))].join('\n') + '\n';
}

/** 높은 신뢰도이거나 이미 있는 사업에 붙는 것은 자동, 나머지는 검토 */
export function splitForReview(rows) {
  const auto = rows.filter((r) => r.matched || r.confidence === 'high');
  const review = rows.filter((r) => !(r.matched || r.confidence === 'high'));
  return { auto, review };
}
