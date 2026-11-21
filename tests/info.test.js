import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  currentStage, openDeadlines, projectSummary, sortSummaries, findProjectsByParcel, normalizeAddress, validateProject, articleUrl,
} from '../site/lib/infoModel.mjs';
import { parseCsv, rowToNotice, mergeInto } from '../scripts/collect/merge.mjs';

const ontology = JSON.parse(readFileSync(new URL('../content/info/ontology.json', import.meta.url)));
const prj = {
  id: 'x', name: '테스트지구',
  notices: [
    { date: '2026-03-10', stage: 'designation', title: '지정' },
    { date: '2026-11-16', stage: 'plan', title: '보상계획', period: { from: '2026-11-16', to: '2026-12-04' } },
    { date: '2026-09-01', stage: 'survey', title: '조사' },
  ],
  parcels: [{ pnu: '4199910100100010000', address: '예시시 예시동 1-0번지' }],
};

test('온톨로지: 7단계, 순서·조문이 빠짐없다', () => {
  assert.equal(ontology.stages.length, 7);
  ontology.stages.forEach((s, i) => { assert.equal(s.order, i + 1); assert.ok(s.articles.length); });
  assert.match(articleUrl(ontology.law, '15'), /제15조$/);
});

test('현재 단계는 가장 많이 나아간 고시, 기한은 남은 날수', () => {
  assert.equal(currentStage(prj, ontology).id, 'plan');
  const d = openDeadlines(prj, '2026-11-21');
  assert.equal(d.length, 1);
  assert.equal(d[0].daysLeft, 13);
  assert.equal(openDeadlines(prj, '2026-12-05').length, 0);
});

test('목록 정렬: 기한 임박 → 최근 고시', () => {
  const a = projectSummary(prj, ontology, '2026-11-21');
  const b = projectSummary({ id: 'y', name: 'y', notices: [{ date: '2026-11-20', stage: 'survey', title: 't' }] }, ontology, '2026-11-21');
  const c = projectSummary({ id: 'z', name: 'z', notices: [{ date: '2025-01-01', stage: 'survey', title: 't' }] }, ontology, '2026-11-21');
  assert.deepEqual(sortSummaries([c, b, a]).map((s) => s.id), ['x', 'y', 'z']);
  assert.equal(a.lastNotice.title, '보상계획');
});

test('필지 매칭: PNU 우선, 없으면 지번 주소', () => {
  assert.equal(findProjectsByParcel([prj], { pnu: '41999-10100-1-0001-0000' })[0].by, 'pnu');
  assert.equal(findProjectsByParcel([prj], { address: '예시시 예시동 1' })[0].by, 'address');
  assert.equal(findProjectsByParcel([prj], { pnu: '4199910100100099999' }).length, 0);
  assert.equal(normalizeAddress('예시동 산 12-0번지'), '예시동산12');
});

test('검증: 알 수 없는 단계와 기간 역전을 잡는다', () => {
  const errs = validateProject({ id: 'Bad Id', name: '', notices: [{ date: '2026-1-1', stage: 'zzz', period: { from: '2026-02-01', to: '2026-01-01' } }] }, ontology);
  assert.equal(errs.length, 5);
});

test('수집: CSV → 고시, 같은 고시는 한 번만, 빈 메타만 채움', () => {
  const rows = parseCsv('﻿project_id,project_name,type,operator,sido,sigungu,date,stage,title,url,period_from,period_to\n'
    + 'x,새이름,택지,"시행자, 공사",경기도,예시시,2026-11-16,plan,보상계획,,2026-11-16,2026-12-04\n');
  assert.equal(rows[0].operator, '시행자, 공사');
  const item = rowToNotice(rows[0]);
  const merged = mergeInto(prj, item);
  assert.equal(merged.notices.length, 3, '같은 날짜·제목은 중복으로 보고 추가하지 않음');
  assert.equal(merged.name, '테스트지구', '기존 이름 유지');
  assert.equal(merged.operator, '시행자, 공사', '빈 값은 채움');
  assert.equal(prj.operator, undefined, '원본은 바꾸지 않음');
  const fresh = mergeInto(undefined, item);
  assert.equal(fresh.id, 'x');
  assert.deepEqual(fresh.notices[0].period, { from: '2026-11-16', to: '2026-12-04' });
});

test('실제 데이터 파일 모두 검증 통과', async () => {
  const { readdirSync } = await import('node:fs');
  const dir = new URL('../content/info/projects/', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    assert.deepEqual(validateProject(JSON.parse(readFileSync(new URL(f, dir))), ontology), [], f);
  }
});
