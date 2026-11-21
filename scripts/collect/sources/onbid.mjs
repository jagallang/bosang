/**
 * 온비드 부동산 공매 물건 (공공데이터포털 '한국자산관리공사_차세대 온비드 부동산 물건목록 조회서비스').
 * 필수 조건: 재산유형코드(prptDivCd), 수의계약가능여부(pvctTrgtYn). 상세 조회 키: cltrMngNo, pbctCdtnNo.
 * 엔드포인트와 응답 필드 이름은 포털의 활용가이드(docx)로 확인해 collect.config.json에 넣는다.
 * 필드 이름이 맞는지 모르면 `npm run collect -- auction --probe`로 실제 응답의 키를 먼저 본다.
 */
import { pick } from '../lib/publicDataApi.mjs';
import { normDate } from './eumGosiCsv.mjs';

const num = (s) => {
  if (s == null) return null;
  const n = Number(String(s).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && String(s).match(/\d/) ? n : null;
};

/** 원본 item → 보상경매 툴 물건 */
export function onbidItemToAuction(raw, mapping) {
  const m = (k) => pick(raw, mapping[k]);
  const mng = m('id');
  if (!mng) return null;
  const cond = m('cond');
  return {
    id: `onbid-${mng}${cond ? `-${cond}` : ''}`,
    source: '온비드',
    case: [m('name'), mng].filter(Boolean).join(' · '),
    address: m('address') || '',
    pnu: m('pnu') || '',
    landUse: m('landUse') || '',
    areaM2: num(m('area')),
    appraisal: num(m('appraisal')),
    minPrice: num(m('minPrice')),
    saleDate: normDate(m('saleDate')) || '',
    url: m('url') || '',
    collectedAt: new Date().toISOString().slice(0, 10),
  };
}

/** 토지 물건만 남기는 거친 거름 (용도 문자열 기준) */
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
