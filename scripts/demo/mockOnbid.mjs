/**
 * 가짜 온비드 서버 (공공데이터포털 게이트웨이 흉내). 명세의 필수 파라미터·페이지·필터·오류 봉투를 따른다.
 * 실제 서버의 세부 동작(필터 해석 등)과 다를 수 있다.
 */
import { createServer } from 'node:http';

const REQUIRED = ['serviceKey', 'pageNo', 'numOfRows', 'resultType', 'prptDivCd', 'dspsMthodCd', 'bidDivCd'];
const gwError = (code, msg) => ({ OpenAPI_ServiceResponse: { cmmMsgHeader: { errMsg: msg, returnAuthMsg: msg, returnReasonCode: code } } });

export function startMockOnbid(items, { port = 0, path = '/B010003/OnbidRlstListSrvc2/getRlstCltrList2' } = {}) {
  const log = [];
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const q = Object.fromEntries(u.searchParams);
    log.push(q);
    const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
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
    url: `http://127.0.0.1:${server.address().port}${path}`, log, close: () => new Promise((c) => server.close(c)),
  })));
}
