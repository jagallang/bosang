/**
 * 브이월드 토지이용계획 속성조회 (api.vworld.kr/ned/data/getLandUseAttr).
 * 요청: key, pnu, format=json (+ domain/Referer). 응답: landUses.field[] 의 prposAreaDstrcCodeNm(지역지구명), cnflcAtNm(포함/저촉/접함).
 * 필드 이름은 공개 사용례에서 확인한 것이고, 내 인증키로는 아직 호출하지 않았다.
 */
export const VWORLD_LANDUSE = 'https://api.vworld.kr/ned/data/getLandUseAttr';

/** 보상과 관련된 지역·지구 이름 (이 말이 들어가면 사업지구로 본다) */
export const PROJECT_ZONES = ['공공주택지구', '택지개발', '산업단지', '도시개발구역', '물류단지', '정비구역', '재정비촉진', '도시계획시설', '도로구역', '하천구역', '철도', '공원'];
const STRONG = ['공공주택지구', '택지개발', '산업단지', '도시개발구역', '물류단지'];

export function parseLandUse(json) {
  const lu = json?.landUses ?? json?.response?.landUses ?? {};
  if (lu.resultCode && !/^(INFO-000|00)?$/.test(String(lu.resultCode))) {
    throw Object.assign(new Error(`브이월드 오류 ${lu.resultCode} ${lu.resultMsg || ''}`.trim()), { code: lu.resultCode });
  }
  let f = lu.field ?? [];
  if (!Array.isArray(f)) f = f ? [f] : [];
  return f.map((x) => ({ name: x.prposAreaDstrcCodeNm || '', relation: x.cnflcAtNm || '', updated: x.lastUpdtDt || '' })).filter((x) => x.name);
}

/** 사업지구에 해당하는 것만, 강한 것(지구 지정 자체) 먼저 */
export function judgeZones(zones) {
  const hits = zones.filter((z) => PROJECT_ZONES.some((w) => z.name.includes(w)) && z.relation !== '접함');
  const strong = hits.filter((z) => STRONG.some((w) => z.name.includes(w)));
  return { strong, other: hits.filter((z) => !strong.includes(z)), all: zones };
}

export async function fetchLandUse(pnu, { key, domain = 'localhost', endpoint = VWORLD_LANDUSE, fetchImpl = fetch } = {}) {
  if (!key) throw new Error('VWORLD_KEY 환경변수(브이월드 인증키)가 없습니다');
  const u = new URL(endpoint);
  for (const [k, v] of Object.entries({ key, pnu, format: 'json', numOfRows: '1000', pageNo: '1', domain })) u.searchParams.set(k, v);
  const res = await fetchImpl(u.toString(), { headers: { referer: `http://${domain}` } });
  if (!res.ok) throw new Error(`브이월드 HTTP ${res.status}`);
  return parseLandUse(await res.json());
}

/** 물건 목록에 판정을 붙인다 (PNU 있는 것만, 실패는 물건별로 기록) */
export async function annotateItems(items, opts, { delayMs = 200, log = () => {} } = {}) {
  let ok = 0, fail = 0;
  for (const it of items) {
    if (!it.pnu || it.pnu.length !== 19) continue;
    try {
      const z = judgeZones(await fetchLandUse(it.pnu, opts));
      it.zoning = { checkedAt: new Date().toISOString().slice(0, 10), strong: z.strong, other: z.other, total: z.all.length };
      ok++;
    } catch (e) { it.zoning = { error: e.message }; fail++; }
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  }
  log(`브이월드 판정: 성공 ${ok}건, 실패 ${fail}건`);
  return items;
}
