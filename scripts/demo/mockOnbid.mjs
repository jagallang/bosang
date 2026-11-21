/**
 * 가짜 온비드 서버 (공공데이터포털 게이트웨이 흉내). 명세의 필수 파라미터·페이지·필터·오류 봉투를 따른다.
 * 실제 서버의 세부 동작(필터 해석 등)과 다를 수 있다.
 */
import { createServer } from 'node:http';

const REQUIRED = ['serviceKey', 'pageNo', 'numOfRows', 'resultType', 'prptDivCd', 'dspsMthodCd', 'bidDivCd'];
const gwError = (code, msg) => ({ OpenAPI_ServiceResponse: { cmmMsgHeader: { errMsg: msg, returnAuthMsg: msg, returnReasonCode: code } } });

/** 가짜 토지이음 목록 HTML (실제 마크업은 미확인. 표 한 줄 = 고시 한 건) */
export function eumListHtml(rows) {
  const tr = rows.map((r, i) => `<tr><td>${r.date}</td><td>${r.gosiNo}</td><td class="left"><a href="gvGosiDet.jsp?seq=${700000 + i}">[${r.kind || '신규'}] ${r.title}</a></td><td>${r.org}</td></tr>`).join('');
  return `<html><body><table class="tbl"><thead><tr><th>고시일</th><th>고시번호</th><th>[구분]고시제목</th><th>담당기관</th></tr></thead><tbody>${tr}</tbody></table></body></html>`;
}

export function startMockOnbid(items, { port = 0, path = '/B010003/OnbidRlstListSrvc2/getRlstCltrList2', eumRows = [], landUse = {} } = {}) {
  const log = [];
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const q = Object.fromEntries(u.searchParams);
    log.push(q);
    const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    if (u.pathname === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('User-agent: *\nDisallow: /admin/\n'); }
    if (u.pathname === '/web/gs/gv/gvGosiList.jsp') {
      const n = Number(q.listSize || 10), p = Number(q.pageNo || 1);
      const sorted = [...eumRows].sort((a, b) => (a.date < b.date ? 1 : -1));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(eumListHtml(sorted.slice((p - 1) * n, p * n)));
    }
    if (u.pathname === '/ned/data/getLandUseAttr') {
      if (!q.key) return send(200, { landUses: { resultCode: 'INCORRECT_KEY', resultMsg: '인증키 오류' } });
      const field = landUse[q.pnu] || [{ pnu: q.pnu, prposAreaDstrcCodeNm: '자연녹지지역', cnflcAtNm: '포함' }];
      return send(200, { landUses: { field, totalCount: String(field.length), resultCode: '', resultMsg: '' } });
    }
    if (u.pathname !== path) return send(400, gwError('12', 'NO_OPENAPI_SERVICE_ERROR'));
    if (!q.serviceKey) return send(401, gwError('30', 'SERVICE_KEY_IS_NOT_REGISTERED_ERROR'));
    const missing = REQUIRED.filter((k) => !q[k]);
    if (missing.length) return send(200, { header: { resultCode: '10', resultMsg: `INVALID_REQUEST_PARAMETER_ERROR(${missing.join(',')})` } });
    const prpt = q.prptDivCd.split(',');
    let list = items.filter((it) => prpt.includes(it.prptDivCd) && it.dspsMthodCd === q.dspsMthodCd && it.bidDivCd === q.bidDivCd);
    if (q.pvctTrgtYn) list = list.filter((it) => it.pvctTrgtYn === q.pvctTrgtYn);
    if (q.cltrUsgMclsCtgrId) list = list.filter((it) => it.cltrUsgMclsCtgrId === q.cltrUsgMclsCtgrId);
    if (q.lctnSdnm) list = list.filter((it) => it.lctnSdnm === q.lctnSdnm);
    const n = Number(q.numOfRows), p = Number(q.pageNo);
    const page = list.slice((p - 1) * n, p * n);
    send(200, { header: { resultCode: '00', resultMsg: 'NORMAL_CODE' }, body: { items: { item: page }, numOfRows: n, pageNo: p, totalCount: list.length } });
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok({
    url: `http://127.0.0.1:${server.address().port}${path}`, origin: `http://127.0.0.1:${server.address().port}`, log, close: () => new Promise((c) => server.close(c)),
  })));
}
