/**
 * 토지이음 고시정보 웹 목록 (https://www.eum.go.kr/web/gs/gv/gvGosiList.jsp).
 * 목록은 최신 고시일부터 나오므로 1쪽부터 넘기다가 기준일보다 오래된 고시가 나오면 멈춘다.
 * 검색 변수 이름(startdt·enddt·listSize·pageNo 등)은 공개된 목록 주소에서 확인했다. 날짜 형식은 미확인이라 기본은 비워 둔다.
 * 토지이음 고시 상세에는 공공누리 출처표시 조건이 표시되어 있다 → 출처(고시번호·링크)를 반드시 남긴다.
 */
import { tableRows } from '../lib/html.mjs';
import { classifyNotice } from '../lib/classify.mjs';
import { normDate } from './eumGosiCsv.mjs';
import { robotsGate, sleep, USER_AGENT } from '../lib/robots.mjs';

export const EUM_BASE = 'https://www.eum.go.kr/web/gs/gv/gvGosiList.jsp';
const PARAM_NAMES = ['chrgorg', 'enddt', 'geul_yn', 'gihyung_yn', 'gosichrg', 'gosino', 'listSize', 'mobile_yn', 'pageNo', 'prj_cat_cd', 'prj_nm', 'selSggCd', 'select2', 'select_3', 'silsi_yn', 'startdt', 'zonenm'];

export function eumListUrl({ base = EUM_BASE, page = 1, listSize = 50, extra = {} } = {}) {
  const u = new URL(base);
  for (const k of PARAM_NAMES) u.searchParams.set(k, '');
  u.searchParams.set('listSize', String(listSize));
  u.searchParams.set('pageNo', String(page));
  for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v);
  return u.toString();
}

/** 목록 HTML → [{ date, gosiNo, kind, title, org, url }] */
export function parseEumList(html, base = EUM_BASE) {
  const rows = [];
  for (const r of tableRows(html)) {
    const c = r.cells;
    const di = c.findIndex((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
    if (di < 0 || c.length < di + 3) continue;
    const titleCell = c[di + 2];
    const kind = (titleCell.match(/^\[(신규|변경|폐지|[^\]]+)\]/) || [])[1] || '';
    const title = titleCell.replace(/^\[[^\]]*\]\s*/, '').trim();
    const seq = [...r.links, ...r.onclick].map((s) => (s.match(/seq=(\d+)/) || s.match(/\((?:'|")?(\d{5,})/) || [])[1]).find(Boolean);
    rows.push({
      date: c[di], gosiNo: c[di + 1], kind, title, org: c[di + 3] || '',
      url: seq ? new URL(`gvGosiDet.jsp?seq=${seq}`, base).toString() : '',
    });
  }
  return rows;
}

/** 지역 거르기: 고시번호나 담당기관에 시도명이 있으면 그 시도, 국토교통부 고시는 담당기관으로 판단 */
export function inRegion(row, sido) {
  if (!sido) return true;
  const short = sido.replace(/(특별자치도|특별자치시|특별시|광역시|도)$/, '');
  return [row.gosiNo, row.org].some((s) => s.startsWith(sido) || s.startsWith(short));
}

export function eumWebRowsToCandidates(rows, { sido } = {}) {
  return rows.filter((r) => inRegion(r, sido)).map((r) => {
    const c = classifyNotice({ title: r.title, org: r.org, gosiNo: r.gosiNo });
    return c && { ...c, date: normDate(r.date), title: r.title, url: r.url, gosiNo: r.gosiNo, source: '토지이음 고시정보' };
  }).filter(Boolean);
}

/** 최근 고시를 받는다. since(YYYY-MM-DD)보다 오래된 고시가 나오는 쪽에서 멈춘다 */
export async function fetchEumRecent({ since, sido, base = EUM_BASE, listSize = 50, maxPages = 40, delayMs = 1500, fetchImpl = fetch, robots = robotsGate(fetchImpl), log = () => {} } = {}) {
  const first = eumListUrl({ base, page: 1, listSize });
  const gate = await robots(first);
  if (gate !== 'allowed') throw new Error(`토지이음 robots.txt ${gate === 'disallowed' ? '수집 불허' : '확인 불가'} — 수집하지 않습니다`);
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    if (page > 1) await sleep(delayMs);
    const res = await fetchImpl(eumListUrl({ base, page, listSize }), { headers: { 'user-agent': USER_AGENT } });
    if (!res.ok) throw new Error(`토지이음 HTTP ${res.status} (${page}쪽)`);
    const rows = parseEumList(await res.text(), base);
    log(`  토지이음 ${page}쪽 ${rows.length}건 ${rows[0]?.date || ''}~${rows.at(-1)?.date || ''}`);
    if (!rows.length) break;
    all.push(...rows.filter((r) => r.date >= since));
    if (rows.at(-1).date < since) break;
  }
  const seen = new Set();
  const uniq = all.filter((r) => { const k = `${r.gosiNo}|${r.title}`; return !seen.has(k) && seen.add(k); });
  return eumWebRowsToCandidates(uniq, { sido });
}
