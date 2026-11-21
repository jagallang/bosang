import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../scripts/collect/merge.mjs';
import { classifyNotice, stageOf, regionOf, projectIdOf, normName } from '../scripts/collect/lib/classify.mjs';
import { parseResponse, fetchAllPages, pick } from '../scripts/collect/lib/publicDataApi.mjs';
import { eumRowsToCandidates, normDate } from '../scripts/collect/sources/eumGosiCsv.mjs';
import { compPlanRowsToCandidates } from '../scripts/collect/sources/compPlanCsv.mjs';
import { onbidItemToAuction, isLand, mergeAuctionItems } from '../scripts/collect/sources/onbid.mjs';
import { toInboxRows, rowsToCsv, splitForReview } from '../scripts/collect/lib/candidates.mjs';
import { decodeKorean } from '../scripts/collect/lib/readText.mjs';
import { regionHints } from '../site/lib/infoModel.mjs';

const fx = (f) => readFileSync(new URL(`./fixtures/collect/${f}`, import.meta.url), 'utf8');
const cfg = JSON.parse(readFileSync(new URL('../collect.config.json', import.meta.url), 'utf8'));

test('단계 분류: 늦은 단계가 먼저', () => {
  assert.equal(stageOf('○○지구 보상계획 공고'), 'plan');
  assert.equal(stageOf('○○지구 손실보상 협의 요청'), 'negotiation');
  assert.equal(stageOf('수용재결 신청에 따른 열람 공고 (보상계획 포함)'), 'adjudication');
  assert.equal(stageOf('실시계획 변경인가 고시'), 'designation');
  assert.equal(stageOf('회의 결과 알림'), null);
});

test('지역: 고시번호 앞부분에서 시도·시군구', () => {
  assert.deepEqual(regionOf('부산광역시 서구 고시 제1999-45호'), { sido: '부산광역시', sigungu: '서구' });
  assert.deepEqual(regionOf('경기도 고시 제2025-77호'), { sido: '경기도', sigungu: null });
  assert.deepEqual(regionOf('경기도 안산시 단원구 공고'), { sido: '경기도', sigungu: '안산시 단원구' });
});

test('고시 분류: 신뢰도', () => {
  const a = classifyNotice({ title: '[신규] 센텀2지구 도시첨단산업단지 실시계획 승인 고시', gosiNo: '부산광역시 고시 제2025-101호' });
  assert.equal(a.stage, 'designation'); assert.equal(a.type, '산업단지'); assert.equal(a.confidence, 'high');
  assert.equal(a.projectName, '센텀2지구 도시첨단산업단지');
  assert.equal(classifyNotice({ title: '안산시 용도지역 변경 결정 고시' }), null);
  const road = classifyNotice({ title: '국도 확포장 도로 수용재결 신청 공고', gosiNo: '경기도 고시 제1호' });
  assert.equal(road.confidence, 'low');
});

test('id는 사업명 공백과 무관하고 영문 소문자', () => {
  assert.equal(projectIdOf('광명시흥 공공주택지구'), projectIdOf('광명시흥공공주택지구'));
  assert.match(projectIdOf('가나다'), /^p-[a-z0-9]+$/);
  assert.equal(normName('서리풀 1 · 지구'), '서리풀1지구');
});

test('토지이음 CSV → 후보 (기간·무관 고시 거름)', () => {
  const c = eumRowsToCandidates(parseCsv(fx('eum.csv')), { since: '2024-01-01' });
  const titles = c.map((x) => x.title);
  assert.equal(c.length, 4);
  assert.ok(!titles.some((t) => t.includes('용도지역')));
  assert.ok(!titles.some((t) => t.includes('오래된')));
  assert.equal(c[0].title, '센텀2지구 도시첨단산업단지 실시계획 승인 고시');
  assert.equal(c[1].date, '2025-05-10');
  assert.equal(c[1].stage, 'plan');
  const banwol = c.find((x) => x.title.includes('반월'));
  assert.equal(banwol.confidence, 'low'); // 고시번호가 없어 지역 불명
  assert.throws(() => eumRowsToCandidates([{ a: '1' }]), /머리글/);
});

test('날짜 정규화', () => {
  assert.equal(normDate('2025.5.1'), '2025-05-01');
  assert.equal(normDate('20261210100000'), '2026-12-10');
  assert.equal(normDate('2025년 3월 4일'), '2025-03-04');
  assert.equal(normDate(''), null);
});

test('보상계획 CSV → plan 단계, 공람기간', () => {
  const rows = parseCsv('보상계획번호,사업명,보상공고명,공고일자,개별통보일자,공람신청시작일자,공람신청종료일자,공람장소\n1,경북도청신도시 2단계,보상계획 공고,2025-04-01,2025-04-02,2025-04-03,2025-04-17,예천군청\n2,,빈 사업명,2025-04-01,,,,\n');
  const c = compPlanRowsToCandidates(rows, { operator: '경북개발공사', sido: '경상북도' });
  assert.equal(c.length, 1);
  assert.deepEqual(c[0].period, { from: '2025-04-03', to: '2025-04-17' });
  assert.equal(c[0].confidence, 'high');
  assert.equal(compPlanRowsToCandidates(rows, {})[0].confidence, 'low');
});

test('후보 → inbox 행: 기존 사업에 붙이고, 자동/검토로 나눔', () => {
  const projects = [{ id: 'gwangmyeong-siheung', name: '광명시흥 공공주택지구' }];
  const c = eumRowsToCandidates(parseCsv(fx('eum.csv')), { since: '2024-01-01' });
  const rows = toInboxRows(c, projects);
  const gm = rows.find((r) => r.title.includes('광명시흥'));
  assert.equal(gm.project_id, 'gwangmyeong-siheung'); assert.equal(gm.matched, true);
  const { auto, review } = splitForReview(rows);
  assert.equal(auto.length + review.length, rows.length);
  assert.ok(review.every((r) => !r.matched && r.confidence === 'low'));
  // CSV로 썼다가 다시 읽으면 같은 값
  const back = parseCsv(rowsToCsv(rows));
  assert.equal(back.length, rows.length);
  assert.equal(back[0].title, rows[0].title);
  assert.equal(back[1].stage, rows[1].stage);
});

test('공공데이터 응답: XML·JSON·오류코드', () => {
  const x = parseResponse(fx('onbid.xml'));
  assert.equal(x.totalCount, 2); assert.equal(x.items.length, 2);
  assert.equal(x.items[0].cltrNm, '경기도 광명시 가학동 100 답'); // CDATA
  assert.equal(x.items[1].cltrNm, '아파트 & 상가');               // 엔티티
  assert.equal(x.items[1].pbctCdtnNo, '');                         // 빈 태그
  const j = parseResponse(JSON.stringify({ response: { header: { resultCode: '00' }, body: { totalCount: 1, items: { item: { a: 1 } } } } }));
  assert.deepEqual(j.items, [{ a: 1 }]);
  assert.throws(() => parseResponse('<response><header><resultCode>30</resultCode><resultMsg>SERVICE KEY IS NOT REGISTERED</resultMsg></header></response>'), /등록되지 않은 인증키/);
  assert.throws(() => parseResponse('<OpenAPI_ServiceResponse><cmmMsgHeader><returnReasonCode>22</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>'), /22/);
});

test('페이지 넘김: totalCount까지 받고 멈춘다', async () => {
  const calls = [];
  const page = (n, total) => `<response><header><resultCode>00</resultCode></header><body><items>${Array.from({ length: n }, (_, i) => `<item><k>${i}</k></item>`).join('')}</items><totalCount>${total}</totalCount></body></response>`;
  const fetchImpl = async (u) => { calls.push(new URL(u)); const p = Number(new URL(u).searchParams.get('pageNo')); return { ok: true, text: async () => page(p < 3 ? 2 : 1, 5) }; };
  const all = await fetchAllPages({ endpoint: 'https://apis.data.go.kr/x/y', params: { a: '1', b: '' }, serviceKey: 'K+/=', rows: 2, fetchImpl });
  assert.equal(all.length, 5); assert.equal(calls.length, 3);
  assert.equal(calls[0].searchParams.get('serviceKey'), 'K+/='); // 한 번만 인코딩
  assert.equal(calls[0].searchParams.has('b'), false);
  await assert.rejects(fetchAllPages({ endpoint: 'https://x.y', fetchImpl }), /DATA_GO_KR_KEY/);
});

test('온비드 물건 → 툴 형식, 토지 거름, 합치기', () => {
  const { items } = parseResponse(fx('onbid.xml'));
  const m = cfg.auction.onbid.mapping;
  const a = items.map((x) => onbidItemToAuction(x, m));
  assert.equal(a[0].id, 'onbid-2026-0001-001-1');
  assert.equal(a[0].areaM2, 820.5); assert.equal(a[0].appraisal, 410000000);
  assert.equal(a[0].saleDate, '2026-12-10'); assert.equal(a[0].address, '경기도 광명시 가학동 100');
  assert.equal(a[1].appraisal, null);
  assert.equal(onbidItemToAuction({}, m), null);
  const land = a.filter((x) => isLand(x, cfg.auction.onbid.landWords));
  assert.deepEqual(land.map((x) => x.id), ['onbid-2026-0001-001-1']);
  const merged = mergeAuctionItems([{ id: 'mine', source: '직접' }, { id: 'old', source: '온비드' }], [...land, land[0]]);
  assert.deepEqual(merged.map((x) => x.id), ['mine', 'onbid-2026-0001-001-1']);
});

test('지역 힌트: 주소의 시군구', () => {
  const ps = [{ id: 'a', name: 'A', region: { sido: '경기도', sigungu: '광명시·시흥시' } }, { id: 'b', name: 'B', region: { sido: '서울특별시', sigungu: '서초구' } }];
  assert.deepEqual(regionHints(ps, '경기도 광명시 가학동 100').map((p) => p.id), ['a']);
  assert.deepEqual(regionHints(ps, '부산광역시 서초구'), []); // 시도가 다르면 아님
  assert.deepEqual(regionHints(ps, ''), []);
});

test('EUC-KR 파일도 읽는다', () => {
  const euc = Buffer.from([0xb0, 0xed, 0xbd, 0xc3]); // '고시'
  assert.equal(decodeKorean(euc), '고시');
  assert.equal(decodeKorean(Buffer.from('﻿고시', 'utf8')), '고시');
});
