/**
 * 온비드 부동산 물건목록 (공공데이터포털 15157207 '한국자산관리공사_차세대 온비드 부동산 물건목록 조회서비스').
 * 요청주소·파라미터·응답 필드는 포털 swagger 명세(공개 저장소에 보관된 사본)와 공개된 실호출 기록으로 맞췄다.
 * 실제 키로는 아직 호출해 보지 않았다 → 처음엔 `npm run collect:probe`로 확인.
 */
import { pick } from '../lib/publicDataApi.mjs';
import { normDate } from './eumGosiCsv.mjs';

/** "953,089,200" → 953089200, "비공개"·빈값 → null */
export const amount = (s) => {
  if (s == null || !/\d/.test(String(s))) return null;
  const n = Number(String(s).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export const DEFAULT_MAPPING = {
  id: ['cltrMngNo'], cond: ['pbctCdtnNo'], name: ['onbidCltrNm'],
  sido: ['lctnSdnm'], sigungu: ['lctnSggnm'], emd: ['lctnEmdNm'],
  pnu: ['ltnoPnu'], useM: ['cltrUsgMclsCtgrNm'], useS: ['cltrUsgSclsCtgrNm'],
  area: ['landSqms'], appraisal: ['apslEvlAmt'], minPrice: ['lowstBidPrcIndctCont'],
  bidStart: ['cltrBidBgngDt'], bidEnd: ['cltrBidEndDt'], failCount: ['usbdNft'],
  share: ['alcYn'], prpt: ['prptDivNm'], status: ['pbctStatNm'], org: ['orgNm', 'rqstOrgNm'],
  noticeNo: ['onbidPbancNo'], onbidNo: ['onbidCltrno'], thumb: ['thnlImgUrlAdr'],
};

/** 물건명이 지번주소로 시작하면 그걸 주소로 쓴다 ("서울특별시 송파구 석촌동 242-15 짜투리 대지") */
function addressOf(name, sido, sigungu, emd) {
  const n = String(name || '').trim();
  if (sido && n.startsWith(sido)) {
    const m = n.match(/^(.*?[동리가로]\s*(?:산\s*)?\d+(?:-\d+)?)/);
    if (m) return m[1].trim();
  }
  return [sido, sigungu, emd].filter(Boolean).join(' ');
}

/**
 * 온비드 PNU의 11번째 자리(대장구분)가 표준(1 일반, 2 산)과 달리 0/1로 온다는 보고가 있다 (미확인).
 * 한 번에 받은 묶음에 0이 하나라도 있으면 그 묶음 전체를 0/1 표기로 보고 표준으로 바꾼다.
 */
export function pnuDialectOf(raws, key = 'ltnoPnu') {
  const ps = raws.map((r) => String(r[key] || '').replace(/\D/g, '')).filter((p) => p.length === 19);
  return ps.some((p) => p[10] === '0') ? 'zero-one' : 'standard';
}
export function standardPnu(pnu, dialect) {
  const p = String(pnu || '').replace(/\D/g, '');
  if (p.length !== 19 || dialect !== 'zero-one') return p;
  const d = { 0: '1', 1: '2' }[p[10]];
  return d ? p.slice(0, 10) + d + p.slice(11) : p;
}

/** 원본 item → 보상경매 툴 물건 */
export function onbidItemToAuction(raw, mapping = DEFAULT_MAPPING, { dialect = 'standard', today } = {}) {
  const m = (k) => pick(raw, mapping[k] ?? DEFAULT_MAPPING[k]);
  const mng = m('id');
  if (!mng) return null;
  const cond = m('cond');
  const name = m('name') || '';
  const minText = m('minPrice');
  return {
    id: `onbid-${mng}${cond ? `-${cond}` : ''}`,
    source: '온비드',
    case: [m('prpt'), m('noticeNo') && `공고 ${m('noticeNo')}`, `물건 ${mng}`].filter(Boolean).join(' · '),
    name,
    address: addressOf(name, m('sido'), m('sigungu'), m('emd')),
    pnu: standardPnu(m('pnu'), dialect),
    landUse: [m('useM'), m('useS')].filter(Boolean).join(' / '),
    areaM2: amount(m('area')),
    appraisal: amount(m('appraisal')),
    minPrice: amount(minText),
    ...(minText && amount(minText) == null ? { minPriceText: minText } : {}),
    saleDate: normDate(m('bidStart')) || '',
    bidEnd: normDate(m('bidEnd')) || '',
    failCount: amount(m('failCount')) ?? 0,
    share: m('share') === 'Y',
    status: m('status') || '',
    org: m('org') || '',
    url: '',
    collectedAt: today || new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10),
  };
}

/** 토지 용도인지 (서버에서 용도중분류 10100=토지로 거르지만, 설정을 바꿨을 때를 대비) */
export function isLand(item, landWords) {
  if (!landWords?.length) return true;
  return landWords.some((w) => item.landUse.includes(w));
}

/** 기존 items.json에 합치기: 온비드 것은 새로 받은 것으로 갈고, 직접 넣은 물건은 남긴다 */
export function mergeAuctionItems(existing, fresh) {
  const keep = (existing || []).filter((x) => x.source !== '온비드');
  const seen = new Set();
  const onbid = fresh.filter((x) => x && !seen.has(x.id) && seen.add(x.id));
  return [...keep, ...onbid];
}
