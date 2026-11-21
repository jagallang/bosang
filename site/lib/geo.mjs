/**
 * 지도용 순수 함수 (사이트·수집기 공용). 좌표는 GeoJSON 순서 [경도, 위도].
 */

// 통계청 2018 시군구 코드 앞 두 자리 → 시도
export const KOSTAT_SIDO = {
  11: '서울특별시', 21: '부산광역시', 22: '대구광역시', 23: '인천광역시', 24: '광주광역시', 25: '대전광역시',
  26: '울산광역시', 29: '세종특별자치시', 31: '경기도', 32: '강원도', 33: '충청북도', 34: '충청남도',
  35: '전라북도', 36: '전라남도', 37: '경상북도', 38: '경상남도', 39: '제주특별자치도',
};

// 이름이 바뀐 시도 (새 이름 → 2018 이름)
const SIDO_ALIAS = { 강원특별자치도: '강원도', 전북특별자치도: '전라북도' };
export const normSido = (s) => SIDO_ALIAS[String(s || '').trim()] || String(s || '').trim();
const squash = (s) => String(s || '').replace(/\s+/g, '');

/**
 * 사업지구 region → 시군구 키 목록 ("경기도|용인시처인구").
 * '광명시·시흥시'처럼 여럿이면 나누고, '용인시'처럼 구가 있는 시는 그 구 전체로 펼친다.
 */
export function sigunguKeys(region, index) {
  const sido = normSido(region?.sido);
  const parts = String(region?.sigungu || '').split(/[·,]/).map(squash).filter(Boolean);
  const keys = [];
  for (const p of parts) {
    const exact = `${sido}|${p}`;
    if (index[exact]) { keys.push(exact); continue; }
    const pre = Object.keys(index).filter((k) => k.startsWith(`${sido}|${p}`));
    keys.push(...pre);
  }
  return [...new Set(keys)];
}

const ringsOf = (geom) => (geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : []);

export function bboxOf(geoms) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const g of geoms) for (const poly of ringsOf(g)) for (const [x, y] of poly[0]) {
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return Number.isFinite(x0) ? [x0, y0, x1, y1] : null;
}

/** 면적 가중 중심 (바깥 고리 기준) */
export function centroidOf(geoms) {
  let a = 0, cx = 0, cy = 0;
  for (const g of geoms) for (const poly of ringsOf(g)) {
    const r = poly[0];
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
      a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f;
    }
  }
  if (!a) { const b = bboxOf(geoms); return b ? [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2] : null; }
  return [cx / (3 * a), cy / (3 * a)];
}

/** 더글라스-포이커 단순화 (tol: 도 단위) */
export function simplifyRing(ring, tol) {
  if (ring.length <= 4) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    const [ax, ay] = ring[s], [bx, by] = ring[e];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-12;
    let best = -1, bi = -1;
    for (let i = s + 1; i < e; i++) {
      // 닫힌 고리처럼 양 끝이 같으면 점까지의 거리로 잰다
      const d = dx === 0 && dy === 0 ? Math.hypot(ring[i][0] - ax, ring[i][1] - ay)
        : Math.abs(dy * ring[i][0] - dx * ring[i][1] + bx * ay - by * ax) / len;
      if (d > best) { best = d; bi = i; }
    }
    if (best > tol) { keep[bi] = 1; stack.push([s, bi], [bi, e]); }
  }
  const out = ring.filter((_, i) => keep[i]);
  return out.length >= 4 ? out : ring;
}

const round = (n) => Math.round(n * 1e5) / 1e5;

const ringArea = (r) => {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
  return Math.abs(a / 2);
};

/** 단순화 + 작은 조각(섬·구멍) 버림. minArea: 도² 단위 */
export function simplifyGeometry(geom, tol, minArea = 0) {
  const polys = ringsOf(geom)
    .filter((poly) => ringArea(poly[0]) >= minArea)
    .map((poly) => poly.filter((r, i) => i === 0 || ringArea(r) >= minArea))
    .map((poly) => poly.map((r) => simplifyRing(r, tol).map(([x, y]) => [round(x), round(y)])))
    .filter((poly) => poly[0].length >= 4);
  if (!polys.length) return simplifyGeometry(geom, tol, 0);
  return polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys };
}

const NAME_SUFFIX = ['도시첨단산업단지', '일반산업단지', '국가산업단지', '공공주택복합지구', '공공주택지구', '택지개발사업지구', '택지개발지구', '택지개발사업',
  '도시개발사업구역', '도시개발구역', '도시개발사업', '역세권개발사업', '산업단지', '물류단지', '복합지구', '공공주택', '개발사업', '지구', '사업', '도심']
  .sort((x, y) => y.length - x.length);

/** 사업지구 이름에서 경계 레이어 속성과 맞춰 볼 핵심어 ("의왕오전왕곡 공공주택지구" → "의왕오전왕곡") */
export function nameCore(name) {
  let s = squash(name);
  for (let changed = true; changed;) {
    changed = false;
    for (const suf of NAME_SUFFIX) {
      if (s.length > suf.length + 1 && s.endsWith(suf)) { s = s.slice(0, -suf.length); changed = true; break; }
    }
  }
  return s;
}

/** 레이어 피처의 문자열 속성 중 하나라도 핵심어를 포함하면 같은 지구로 본다 */
export function featureMatches(feature, core) {
  if (!core || core.length < 2) return false;
  return Object.values(feature.properties || {}).some((v) => typeof v === 'string' && squash(v).includes(core));
}
