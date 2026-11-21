/**
 * 토지이음 고시목록 CSV (공공데이터포털 '국토교통부_토지이음_고시목록', 로그인 없이 내려받기).
 * 열: 고시번호, 고시일, 접속경로(URL), 고시제목 — 머리글 이름이 조금 달라도 찾아낸다.
 * 연 1회 갱신 파일이라 최신 고시는 빠질 수 있다 (최근 것은 inbox CSV로 보완).
 */
import { classifyNotice } from '../lib/classify.mjs';

const find = (head, ...names) => head.find((h) => names.some((n) => h.replace(/\s/g, '').includes(n)));

/** @param rows parseCsv 결과 @param since 'YYYY-MM-DD' 이후 고시만 */
export function eumRowsToCandidates(rows, { since = '2020-01-01' } = {}) {
  if (!rows.length) return [];
  const head = Object.keys(rows[0]);
  const kNo = find(head, '고시번호');
  const kDate = find(head, '고시일');
  const kUrl = find(head, '접속경로', 'URL', 'url');
  const kTitle = find(head, '고시제목', '제목');
  if (!kDate || !kTitle) throw new Error(`토지이음 CSV 머리글을 알아보지 못했습니다: ${head.join(', ')}`);
  const out = [];
  for (const r of rows) {
    const date = normDate(r[kDate]);
    if (!date || date < since) continue;
    const title = r[kTitle];
    const c = classifyNotice({ title, gosiNo: kNo ? r[kNo] : '' });
    if (!c) continue;
    out.push({ ...c, date, title: title.replace(/^\s*\[[^\]]*\]\s*/, '').trim(), url: kUrl ? r[kUrl] : '', gosiNo: kNo ? r[kNo] : '', source: '토지이음 고시목록' });
  }
  return out;
}

export function normDate(s) {
  const m = String(s || '').match(/(\d{4})[-./년\s]*(\d{1,2})[-./월\s]*(\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null;
}
