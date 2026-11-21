/**
 * 공사·지자체가 공공데이터포털에 올리는 '보상계획공고' CSV (예: 경상북도개발공사_보상계획공고).
 * 보상계획 공고는 그 자체로 plan 단계이므로 분류기 없이 바로 고시로 만든다.
 * 머리글 예: 보상계획번호, 사업명, 보상공고명, 공고일자, 개별통보일자, 공람신청시작일자, 공람신청종료일자, 공람장소
 */
import { normDate } from './eumGosiCsv.mjs';

const find = (head, ...names) => head.find((h) => names.some((n) => h.replace(/\s/g, '').includes(n)));

export function compPlanRowsToCandidates(rows, { operator = '', sido = '', sigungu = '', source = '보상계획공고 CSV' } = {}) {
  if (!rows.length) return [];
  const head = Object.keys(rows[0]);
  const k = {
    name: find(head, '사업명'), title: find(head, '공고명', '보상공고명'), date: find(head, '공고일'),
    from: find(head, '공람신청시작', '열람시작', '공람시작'), to: find(head, '공람신청종료', '열람종료', '공람종료'),
  };
  if (!k.name || !k.date) throw new Error(`보상계획 CSV 머리글을 알아보지 못했습니다: ${head.join(', ')}`);
  return rows.map((r) => {
    const date = normDate(r[k.date]);
    if (!date || !r[k.name]) return null;
    const from = normDate(r[k.from]), to = normDate(r[k.to]);
    return {
      stage: 'plan', type: '', projectName: r[k.name].trim(), region: { sido, sigungu },
      confidence: sido ? 'high' : 'low', reason: sido ? '보상계획 공고 원자료' : '지역을 설정에서 지정해야 함',
      date, title: (k.title && r[k.title]) || '보상계획 공고', url: '', operator, source,
      ...(from || to ? { period: { from: from || date, to: to || from } } : {}),
    };
  }).filter(Boolean);
}
