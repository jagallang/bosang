// 수집 결과(정규화된 고시 행)를 사업 JSON에 합친다. 순수 함수.

/** CSV 한 줄 파서 (큰따옴표 지원) */
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v !== '')) rows.push(row);
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

/** inbox CSV 행 → { projectId, meta, notice } */
export function rowToNotice(r) {
  const notice = { date: r.date, stage: r.stage, title: r.title, source: r.source || 'inbox' };
  if (r.url) notice.url = r.url;
  if (r.period_from || r.period_to) notice.period = { from: r.period_from || r.date, to: r.period_to || r.period_from };
  return {
    projectId: r.project_id,
    meta: { name: r.project_name, type: r.type, operator: r.operator, region: { sido: r.sido, sigungu: r.sigungu } },
    notice,
  };
}

const key = (n) => `${n.date}|${n.title}`;

/** 기존 사업(없으면 새로)에 고시를 합친다. 같은 날짜·제목은 한 번만. 비어 있는 메타만 채운다 */
export function mergeInto(project, { projectId, meta, notice }) {
  const p = project ? structuredClone(project) : { id: projectId, notices: [] };
  for (const [k, v] of Object.entries(meta || {})) {
    if (k === 'region') {
      p.region ||= {};
      for (const [rk, rv] of Object.entries(v || {})) if (rv && !p.region[rk]) p.region[rk] = rv;
    } else if (v && !p[k]) p[k] = v;
  }
  p.notices ||= [];
  if (!p.notices.some((n) => key(n) === key(notice))) p.notices.push(notice);
  p.notices.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return p;
}
