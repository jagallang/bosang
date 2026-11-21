/**
 * 브이월드 2D 데이터 API로 사업지구 경계·필지 경계를 받는다.
 *   GET https://api.vworld.kr/req/data?service=data&request=GetFeature&data=<레이어>&key&domain
 *       &geomFilter=BOX(minx,miny,maxx,maxy)&attrFilter=..&size=1000&page=1&format=json&crs=EPSG:4326
 * 응답: response.status, response.result.featureCollection(GeoJSON), response.page.total
 *
 * ⚠ 이 작업 환경에서는 브이월드에 접속할 수 없어 실제 응답으로 확인하지 못했다. 레이어 이름과
 *   사업 유형 연결은 collect.config.json geo.layers에서 바꾼다.
 */
import { featureMatches, nameCore } from '../../../site/lib/geo.mjs';

export const VWORLD_DATA = 'https://api.vworld.kr/req/data';
export const PARCEL_LAYER = 'LP_PA_CBND_BUBUN';

export function parseDataResponse(json) {
  const r = json?.response;
  if (!r) throw new Error('브이월드 응답 형식이 다릅니다');
  if (r.status === 'NOT_FOUND') return { features: [], pages: 0 };
  if (r.status !== 'OK') throw new Error(`브이월드 오류: ${r.error?.text || r.error?.code || r.status}`);
  return { features: r.result?.featureCollection?.features || [], pages: Number(r.page?.total || 1) };
}

export async function getFeatures(layer, { key, domain = 'localhost', bbox, attrFilter, endpoint = VWORLD_DATA, fetchImpl = fetch, maxPages = 5 } = {}) {
  if (!key) throw new Error('VWORLD_KEY 환경변수(브이월드 인증키)가 없습니다');
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const u = new URL(endpoint);
    const q = { service: 'data', request: 'GetFeature', version: '2.0', data: layer, key, domain, format: 'json', crs: 'EPSG:4326', size: '1000', page: String(page) };
    if (bbox) q.geomFilter = `BOX(${bbox.join(',')})`;
    if (attrFilter) q.attrFilter = attrFilter;
    for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
    const res = await fetchImpl(u.toString(), { headers: { referer: `http://${domain}` } });
    if (!res.ok) throw new Error(`브이월드 HTTP ${res.status}`);
    const { features, pages } = parseDataResponse(await res.json());
    all.push(...features);
    if (page >= pages) break;
  }
  return all;
}

/** 사업 유형 → 찾아볼 레이어 목록 */
export function layersFor(type, layerMap) {
  const t = String(type || '');
  return Object.entries(layerMap).filter(([k]) => t.includes(k)).flatMap(([, v]) => v);
}

/**
 * 사업지구 한 곳의 경계를 찾는다.
 * 1) 필지 PNU가 있으면 필지 경계(가장 정확)  2) 유형에 맞는 지구 레이어에서 이름이 맞는 피처
 * 못 찾으면 null — 지도는 시군구 범위로 대신 표시한다.
 */
export async function findBoundary(project, { bbox, layerMap, opts }) {
  const pnus = (project.parcels || []).map((p) => String(p.pnu || '').replace(/\D/g, '')).filter((p) => p.length === 19);
  if (pnus.length) {
    const feats = [];
    for (let i = 0; i < pnus.length; i += 50) {
      feats.push(...await getFeatures(PARCEL_LAYER, { ...opts, attrFilter: `pnu:IN:${pnus.slice(i, i + 50).join(',')}` }));
    }
    if (feats.length) return { precision: 'parcels', layer: PARCEL_LAYER, features: feats };
  }
  const core = nameCore(project.name);
  for (const layer of layersFor(project.type, layerMap)) {
    const feats = (await getFeatures(layer, { ...opts, bbox })).filter((f) => featureMatches(f, core));
    if (feats.length) return { precision: 'boundary', layer, features: feats };
  }
  return null;
}

export function toGeoFile(project, found, { today }) {
  return {
    type: 'FeatureCollection',
    project: project.id,
    precision: found.precision,
    source: `브이월드 ${found.layer}`,
    checkedAt: today,
    features: found.features.map((f) => ({ type: 'Feature', geometry: f.geometry, properties: {} })),
  };
}
