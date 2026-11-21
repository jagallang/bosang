// 통계청 2018 시군구 경계(GeoJSON) → content/info/geo/sigungu.json (단순화, 시도|시군구 키)
// 원본: github.com/southkorea/southkorea-maps (kostat/2018/json/skorea-municipalities-2018-geo.json)
// 사용: node scripts/geo/sigungu.mjs <원본.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KOSTAT_SIDO, bboxOf, centroidOf, simplifyGeometry } from '../../site/lib/geo.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = process.argv[2];
if (!src) { console.error('사용: node scripts/geo/sigungu.mjs <skorea-municipalities-2018-geo.json>'); process.exit(1); }
const g = JSON.parse(readFileSync(src, 'utf8'));
const out = {};
for (const f of g.features) {
  const { name, code } = f.properties;
  const sido = KOSTAT_SIDO[String(code).slice(0, 2)];
  if (!sido) throw new Error(`시도 코드 모름: ${code} ${name}`);
  const geom = simplifyGeometry(f.geometry, 0.0012, 0.00002);
  const r = (n) => Math.round(n * 1e5) / 1e5;
  out[`${sido}|${name.replace(/\s+/g, '')}`] = {
    code, name, sido,
    center: centroidOf([f.geometry]).map(r),
    bbox: bboxOf([f.geometry]).map(r),
    geometry: geom,
  };
}
const file = join(root, 'content', 'info', 'geo', 'sigungu.json');
writeFileSync(file, JSON.stringify({ source: '통계청 SGIS 2018 시군구 경계 (southkorea-maps)', year: 2018, items: out }));
console.log(`✓ ${Object.keys(out).length}개 시군구 → ${file}`);
