/**
 * 공공데이터포털(data.go.kr) 게이트웨이 API 공통 클라이언트.
 * - serviceKey는 환경변수에서 받는다 (DATA_GO_KR_KEY). 저장소에 넣지 않는다.
 * - 응답이 JSON이든 XML이든 item 배열로 바꾼다.
 */

/** 결과 코드 → 사람이 읽을 메시지 (포털 공통 오류표 기준) */
const ERRORS = {
  '01': '게이트웨이 내부 오류 — 잠시 후 다시',
  '04': 'HTTP 요청 방식 또는 기관 응답 오류',
  '05': '기관 API 응답 시간 초과',
  '10': '요청 파라미터 이름·형식 오류 — 활용가이드의 파라미터를 확인',
  '12': '서비스가 없거나 폐기됨 — 엔드포인트 주소 확인',
  '20': '인증키 없음 또는 활용신청·권한 없음',
  '22': '일일 호출 한도 초과',
  '23': '초당 호출 한도 초과',
  '30': '등록되지 않은 인증키',
  '31': '인증키 기간 만료',
};

/** 평평한 <item> 목록 XML을 객체 배열로 (중첩 없는 data.go.kr 응답 전용) */
export function parseItemsXml(xml) {
  const head = (tag) => (xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)) || [])[1]?.trim() ?? null;
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body]) => {
    const o = {};
    for (const [, k, v] of body.matchAll(/<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g)) o[k] = decodeXml(v.trim());
    for (const [, k] of body.matchAll(/<([A-Za-z0-9_]+)\s*\/>/g)) o[k] = '';
    return o;
  });
  return { resultCode: head('resultCode'), resultMsg: head('resultMsg'), totalCount: Number(head('totalCount') ?? NaN), items };
}

const decodeXml = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** JSON 응답: response.header / response.body.items.item (배열 또는 객체) 형태를 흡수 */
export function parseItemsJson(obj) {
  const r = obj?.response ?? obj;
  const header = r?.header ?? {};
  const body = r?.body ?? {};
  let items = body?.items?.item ?? body?.items ?? body?.item ?? [];
  if (!Array.isArray(items)) items = items ? [items] : [];
  return { resultCode: header.resultCode ?? null, resultMsg: header.resultMsg ?? null, totalCount: Number(body.totalCount ?? NaN), items };
}

export function parseResponse(text) {
  const t = text.trim();
  const out = t.startsWith('<') ? parseItemsXml(t) : parseItemsJson(JSON.parse(t));
  const code = out.resultCode;
  if (code && !['00', '0', '000', 'INFO-000'].includes(String(code))) {
    const err = new Error(`공공데이터 API 오류 ${code}: ${out.resultMsg || ''} ${ERRORS[code] ? `(${ERRORS[code]})` : ''}`.trim());
    err.code = code;
    throw err;
  }
  // 게이트웨이 오류는 OpenAPI_ServiceResponse 형식으로 오기도 한다
  const gw = t.match(/<returnReasonCode>(\d+)<\/returnReasonCode>/);
  if (gw && gw[1] !== '00') throw Object.assign(new Error(`공공데이터 게이트웨이 오류 ${gw[1]} ${ERRORS[gw[1]] || ''}`), { code: gw[1] });
  return out;
}

/** 모든 페이지를 받아 item을 모은다. fetchImpl은 테스트에서 바꿔 끼운다 */
export async function fetchAllPages({ endpoint, params, serviceKey, rows = 100, maxPages = 50, fetchImpl = fetch, onPage }) {
  if (!serviceKey) throw new Error('DATA_GO_KR_KEY 환경변수(공공데이터포털 인증키)가 없습니다');
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const u = new URL(endpoint);
    // 인증키는 포털에서 '디코딩' 키를 넣는다 (URLSearchParams가 한 번 인코딩)
    u.searchParams.set('serviceKey', serviceKey);
    u.searchParams.set('pageNo', String(page));
    u.searchParams.set('numOfRows', String(rows));
    for (const [k, v] of Object.entries(params || {})) if (v !== undefined && v !== '') u.searchParams.set(k, String(v));
    const res = await fetchImpl(u.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status} ${endpoint}`);
    const parsed = parseResponse(await res.text());
    all.push(...parsed.items);
    onPage?.(page, parsed);
    const total = Number.isFinite(parsed.totalCount) ? parsed.totalCount : null;
    if (!parsed.items.length || (total !== null && all.length >= total) || parsed.items.length < rows) break;
  }
  return all;
}

/** 매핑: 우리 필드 → 원본 키 후보 목록. 처음 값이 있는 키를 쓴다 */
export function pick(raw, candidates) {
  for (const k of [].concat(candidates || [])) {
    const v = raw[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}
