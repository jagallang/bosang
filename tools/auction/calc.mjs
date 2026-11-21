/**
 * 보상경매 수익 계산 (순수 함수). 세율은 모두 사용자가 넣는 추정치다.
 * 금액 단위: 원. months: 낙찰(잔금)부터 보상금 수령까지 예상 개월 수.
 */
export const DEFAULTS = {
  acqTaxRate: 0.046,   // 토지 유상취득 기본 가정 (농지 등은 다름 — 직접 확인)
  gainTaxRate: 0.0,    // 양도세 실효세율 추정 (보유기간·감면·중과 여부에 따라 크게 달라짐)
};

export function investmentReturn({ bid, expectedComp, months, otherCosts = 0, acqTaxRate = DEFAULTS.acqTaxRate, gainTaxRate = DEFAULTS.gainTaxRate }) {
  if (!(bid > 0) || !(expectedComp >= 0) || !(months > 0)) throw new Error('낙찰가·예상 보상금·기간을 넣으세요');
  const acqTax = Math.round(bid * acqTaxRate);
  const totalCost = bid + acqTax + otherCosts;
  const gain = expectedComp - totalCost;
  const gainTax = Math.round(Math.max(0, gain) * gainTaxRate);
  const net = gain - gainTax;
  const roi = net / totalCost;
  const annual = roi <= -1 ? -1 : Math.pow(1 + roi, 12 / months) - 1;
  return { acqTax, totalCost, gain, gainTax, net, roi, annual };
}

/** 목표 연수익률을 맞추는 최대 낙찰가 (이분 탐색) */
export function maxBidFor(target, input) {
  let lo = 0, hi = input.expectedComp;
  if (hi <= 0) return 0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const r = investmentReturn({ ...input, bid: mid });
    if (r.annual >= target) lo = mid; else hi = mid;
  }
  return Math.floor(lo / 10000) * 10000;
}
