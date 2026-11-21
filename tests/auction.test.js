import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { investmentReturn, maxBidFor } from '../tools/auction/calc.mjs';
import { checkWarnings } from '../tools/auction/warnings.mjs';

const ontology = JSON.parse(readFileSync(new URL('../content/info/ontology.json', import.meta.url)));

test('수익 계산: 취득세·기타비용·양도세 반영, 연환산', () => {
  const r = investmentReturn({ bid: 100_000_000, expectedComp: 130_000_000, months: 12, otherCosts: 1_000_000, acqTaxRate: 0.046, gainTaxRate: 0.2 });
  assert.equal(r.acqTax, 4_600_000);
  assert.equal(r.totalCost, 105_600_000);
  assert.equal(r.gain, 24_400_000);
  assert.equal(r.gainTax, 4_880_000);
  assert.equal(r.net, 19_520_000);
  assert.ok(Math.abs(r.annual - r.roi) < 1e-12, '12개월이면 연환산 = 수익률');
  const loss = investmentReturn({ bid: 100_000_000, expectedComp: 90_000_000, months: 6, gainTaxRate: 0.2 });
  assert.equal(loss.gainTax, 0, '손실이면 양도세 없음');
  assert.ok(loss.annual < 0);
  assert.throws(() => investmentReturn({ bid: 0, expectedComp: 1, months: 1 }));
});

test('목표 수익률 최대 낙찰가: 그 값에서 목표를 넘고, 만원 단위', () => {
  const input = { expectedComp: 200_000_000, months: 24, acqTaxRate: 0.046, gainTaxRate: 0.2 };
  const mb = maxBidFor(0.15, input);
  assert.equal(mb % 10000, 0);
  assert.ok(investmentReturn({ ...input, bid: mb }).annual >= 0.15);
  assert.ok(investmentReturn({ ...input, bid: mb + 1_000_000 }).annual < 0.15);
});

test('경고: 택지 1년·감면 2년 기준, 협의 전 시기, 공직자', () => {
  const project = { notices: [{ date: '2026-03-10', stage: 'designation', title: '지정' }, { date: '2026-11-16', stage: 'plan', title: '보상계획' }] };
  const keys = (w) => w.map((x) => x.key);
  const late = checkWarnings({ project, ontology, acquireDate: '2026-12-10', user: { publicOfficial: true } });
  assert.deepEqual(keys(late).sort(), ['conflict', 'housing-lot', 'non-business-land', 'tax-relief', 'timing'].sort());
  assert.equal(late[0].level, 'high');
  const early = checkWarnings({ project, ontology, acquireDate: '2023-01-01' });
  assert.ok(!keys(early).includes('housing-lot') && !keys(early).includes('tax-relief') && !keys(early).includes('conflict'));
  const mid = checkWarnings({ project, ontology, acquireDate: '2024-12-01' });
  assert.ok(!keys(mid).includes('housing-lot') && keys(mid).includes('tax-relief'), '1년~2년 사이는 감면만 경고');
});
