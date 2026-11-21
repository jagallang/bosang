import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sigunguKeys, centroidOf, bboxOf, simplifyRing, nameCore, featureMatches, normSido } from '../site/lib/geo.mjs';
import { findBoundary, parseDataResponse, layersFor } from '../scripts/collect/sources/vworldGeo.mjs';

const SG = JSON.parse(readFileSync(new URL('../content/info/geo/sigungu.json', import.meta.url), 'utf8')).items;

test('시군구 데이터: 250곳, 좌표는 한국 범위', () => {
  const vals = Object.values(SG);
  assert.equal(vals.length, 250);
  for (const v of vals) {
    assert.ok(v.center[0] > 124 && v.center[0] < 132 && v.center[1] > 33 && v.center[1] < 39, v.name);
  }
});

test('사업지구 region → 시군구 키', () => {
  assert.deepEqual(sigunguKeys({ sido: '경기도', sigungu: '의왕시' }, SG), ['경기도|의왕시']);
  assert.deepEqual(sigunguKeys({ sido: '경기도', sigungu: '광명시·시흥시' }, SG), ['경기도|광명시', '경기도|시흥시']);
  assert.deepEqual(sigunguKeys({ sido: '경기도', sigungu: '고양시 덕양구' }, SG), ['경기도|고양시덕양구']);
  assert.equal(sigunguKeys({ sido: '경기도', sigungu: '용인시' }, SG).length, 3);
  assert.equal(normSido('강원특별자치도'), '강원도');
});

test('현재 사업지구는 모두 시군구로 위치를 잡을 수 있다', () => {
  const dir = new URL('../content/info/projects/', import.meta.url);
  for (const f of ['uiwang-gunpo-ansan', 'busan-centum2', 'naju-fusion', 'sanggye1', 'yongin-yangji-logistics']) {
    const p = JSON.parse(readFileSync(new URL(`${f}.json`, dir), 'utf8'));
    assert.ok(sigunguKeys(p.region, SG).length > 0, f);
  }
});

test('중심·범위·단순화', () => {
  const sq = { type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]] };
  assert.deepEqual(centroidOf([sq]), [1, 1]);
  assert.deepEqual(bboxOf([sq]), [0, 0, 2, 2]);
  const ring = [[0, 0], [1, 0.0001], [2, 0], [2, 2], [0, 2], [0, 0]];
  assert.equal(simplifyRing(ring, 0.01).length, 5);
});

test('이름 핵심어로 레이어 피처 맞추기', () => {
  assert.equal(nameCore('의왕오전왕곡 공공주택지구'), '의왕오전왕곡');
  assert.equal(nameCore('센텀2지구 도시첨단산업단지'), '센텀2');
  assert.equal(nameCore('김포 걸포4지구 도시개발사업'), '김포걸포4');
  assert.ok(featureMatches({ properties: { dgm_nm: '의왕 오전왕곡 공공주택지구' } }, '의왕오전왕곡'));
  assert.ok(!featureMatches({ properties: { dgm_nm: '의왕청계2' } }, '의왕오전왕곡'));
  assert.deepEqual(layersFor('공공주택', { 공공주택: ['A'], 산업단지: ['B'] }), ['A']);
});

const fc = (features, status = 'OK') => ({ response: { status, page: { total: '1' }, result: { featureCollection: { type: 'FeatureCollection', features } } } });
const poly = (name) => ({ type: 'Feature', properties: { dgm_nm: name }, geometry: { type: 'Polygon', coordinates: [[[127, 37], [127.01, 37], [127.01, 37.01], [127, 37]]] } });
const fake = (body) => async (url) => ({ ok: true, url, json: async () => body(url) });

test('경계 찾기: 지구 레이어에서 이름이 맞는 것만', async () => {
  const seen = [];
  const r = await findBoundary({ name: '구리토평2 공공주택지구', type: '공공주택', parcels: [] }, {
    bbox: [127, 37, 128, 38], layerMap: { 공공주택: ['LT_C_LHBLPN'] },
    opts: { key: 'k', fetchImpl: fake((u) => { seen.push(u); return fc([poly('구리토평2 공공주택지구'), poly('남양주왕숙')]); }) },
  });
  assert.equal(r.precision, 'boundary');
  assert.equal(r.features.length, 1);
  assert.match(seen[0], /data=LT_C_LHBLPN/);
  assert.match(seen[0], /geomFilter=BOX/);
});

test('경계 찾기: 필지 PNU가 있으면 필지 경계가 먼저', async () => {
  const r = await findBoundary({ name: 'x', type: '공공주택', parcels: [{ pnu: '4143010100100010000' }] }, {
    layerMap: {}, opts: { key: 'k', fetchImpl: fake((u) => (u.includes('LP_PA_CBND_BUBUN') ? fc([poly('')]) : fc([]))) },
  });
  assert.equal(r.precision, 'parcels');
});

test('브이월드 응답: 없음·오류', () => {
  assert.deepEqual(parseDataResponse({ response: { status: 'NOT_FOUND' } }).features, []);
  assert.throws(() => parseDataResponse({ response: { status: 'ERROR', error: { text: 'INVALID_KEY' } } }), /INVALID_KEY/);
});
