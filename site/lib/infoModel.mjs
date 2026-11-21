/**
 * 보상정보 공통 모델 (순수 함수). 사이트·수집기·보상경매 툴이 함께 쓴다.
 * 날짜는 'YYYY-MM-DD' 문자열로 다룬다 (시간대 문제를 피하려고 Date 연산은 UTC 정오 기준).
 */

const dayOf = (s) => Math.round(Date.parse(`${s}T12:00:00Z`) / 86400000);

export function stageMap(ontology) {
  return new Map(ontology.stages.map((s) => [s.id, s]));
}

/** 고시 중 가장 많이 나아간 단계 */
export function currentStage(project, ontology) {
  const map = stageMap(ontology);
  let best = null;
  for (const n of project.notices || []) {
    const s = map.get(n.stage);
    if (s && (!best || s.order > best.order)) best = s;
  }
  return best;
}

/** 아직 끝나지 않은 기한 (열람 기간 등), 가까운 순 */
export function openDeadlines(project, today) {
  const t = dayOf(today);
  return (project.notices || [])
    .filter((n) => n.period?.to && dayOf(n.period.to) >= t)
    .map((n) => ({ ...n, daysLeft: dayOf(n.period.to) - t }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** 고시를 날짜 최신순으로 */
export function timeline(project) {
  return [...(project.notices || [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function projectSummary(project, ontology, today) {
  const stage = currentStage(project, ontology);
  const tl = timeline(project);
  return {
    id: project.id,
    name: project.name,
    type: project.type || '',
    operator: project.operator || '',
    sido: project.region?.sido || '',
    sigungu: project.region?.sigungu || '',
    sample: !!project.sample,
    stage: stage ? { id: stage.id, name: stage.name, order: stage.order } : null,
    lastNotice: tl[0] || null,
    nextDeadline: openDeadlines(project, today)[0] || null,
  };
}

/** 지구 목록: 기한이 임박한 것 먼저, 그다음 최근 고시 순 */
export function sortSummaries(list) {
  return [...list].sort((a, b) => {
    const da = a.nextDeadline ? a.nextDeadline.daysLeft : Infinity;
    const db = b.nextDeadline ? b.nextDeadline.daysLeft : Infinity;
    if (da !== db) return da - db;
    const la = a.lastNotice?.date || '';
    const lb = b.lastNotice?.date || '';
    return la < lb ? 1 : la > lb ? -1 : 0;
  });
}

export function articleUrl(law, article) {
  return `${law.url}/제${article}조`;
}

/** 필지 고유번호(PNU, 19자리)만 남긴다 */
export const normalizePnu = (s) => String(s || '').replace(/\D/g, '');

/** 주소 비교용: 공백·'번지'·'산 ' 표기 차이를 줄인다 */
export const normalizeAddress = (s) =>
  String(s || '').replace(/번지/g, '').replace(/\s+/g, '').replace(/-0+(?=\D|$)/g, '').trim();

/** 필지(PNU 또는 지번 주소)가 어느 사업지구에 들어가는지 찾는다 */
export function findProjectsByParcel(projects, { pnu, address }) {
  const p = normalizePnu(pnu);
  const a = normalizeAddress(address);
  const hits = [];
  for (const prj of projects) {
    for (const parcel of prj.parcels || []) {
      const byPnu = p && p.length === 19 && normalizePnu(parcel.pnu) === p;
      const byAddr = !byPnu && a && parcel.address && normalizeAddress(parcel.address) === a;
      if (byPnu || byAddr) { hits.push({ project: prj, parcel, by: byPnu ? 'pnu' : 'address' }); break; }
    }
  }
  return hits;
}

/** 데이터 검증: 알 수 없는 단계, 날짜 형식, 기간 역전 */
export function validateProject(project, ontology) {
  const errors = [];
  const map = stageMap(ontology);
  if (!project.id || !/^[a-z0-9-]+$/.test(project.id)) errors.push('id는 영문 소문자·숫자·하이픈');
  if (!project.name) errors.push('name 없음');
  for (const [i, n] of (project.notices || []).entries()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date || '')) errors.push(`notices[${i}].date 형식`);
    if (!map.has(n.stage)) errors.push(`notices[${i}].stage 알 수 없음: ${n.stage}`);
    if (n.period && n.period.from > n.period.to) errors.push(`notices[${i}].period 시작이 끝보다 늦음`);
  }
  return errors;
}
